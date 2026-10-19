import { COHORT_IDS, type CohortId } from "@admin/world";
import { advanceUntilAttention, type AdvanceOptions } from "./advance.js";
import { cohortSupport } from "./demos.js";
import type { EffectPacket } from "./effect-types.js";
import { apply } from "./effects.js";
import { campaignIsOver } from "./elections.js";
import { OPINION_DRIVERS, type OpinionDriver } from "./opinion-drivers.js";
import { believedCampaign, type ForecastBasis } from "./projection-belief.js";
import { createRngStreams, makeCampaignSeed, type CampaignSeed, type RngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
import { DAYS_PER_TURN } from "./turn-clock.js";

// The projection's engine half: a pending choice's alternatives, each
// committed on a detached copy of what the government believes (see
// projection-belief.ts) and run forward through the same
// apply() and the same weekly advance the player's Continue runs. Nothing here
// is stored and nothing reaches the live campaign: every run starts from a
// spread copy, and the engine's immutable apply never writes into its input.
//
// Each run of the ensemble uses its own derived seed rather than the
// campaign's. Two reasons. Streams are keyed on the seed, so a derived seed is
// the projection's own stream key and cannot coincide with a draw the live
// campaign will make. And a run on the live seed would be the realized future
// of every uncertain roll the act and the world make, handed to the player
// before they decide; a forecast is the spread across runs the government
// could not tell apart, never the one that will happen.
//
// Every alternative in one ensemble member shares that member's seed, so the
// difference between two alternatives in the same member is the choice and
// not the luck of the draw.

/** The horizons a President can ask for, in weeks. */
export const PROJECTION_HORIZON_WEEKS = [4, 13, 26, 52] as const;
export type ProjectionHorizon = (typeof PROJECTION_HORIZON_WEEKS)[number];
/** Runs per alternative. Five gives a median and a range without making a long horizon wait. */
export const PROJECTION_ENSEMBLE_SIZE = 5;

export type ProjectionMetric =
  | "approval"
  | "treasury"
  | "stability"
  | "standing"
  | "militaryReadiness"
  | "removalPressure"
  | `judgment:${OpinionDriver}`
  | `cohort:${CohortId}`;

export type ProjectionReading = Readonly<Record<ProjectionMetric, number>>;

export const PROJECTION_HEADLINE_METRICS = ["approval", "treasury", "stability", "standing", "militaryReadiness", "removalPressure"] as const satisfies readonly ProjectionMetric[];

export type ProjectionBuild =
  | { readonly ok: true; readonly packets: readonly EffectPacket[] }
  | { readonly ok: false; readonly reason: string };

/**
 * One way of answering the choice. `build` is handed the detached campaign and
 * that run's streams, so an act with an uncertain outcome (a challenge, a
 * reply's roll) resolves differently across the ensemble and its uncertainty
 * lands in the band, while its price, a function of state alone, is the same
 * in every run and the same as the live commit would charge.
 */
export type ProjectionAlternative = {
  readonly id: string;
  readonly build: (campaign: Campaign, streams: RngStreams) => ProjectionBuild;
};

export type ProjectionRunOptions = {
  readonly weeks: number;
  readonly member: number;
  /** Whose belief the run starts from: a staff forecast in normal play, the truth only in God Mode (DECISIONS 7.11). */
  readonly basis: ForecastBasis;
  /** The same phases and day sources the app's own advance runs with. */
  readonly advance: Omit<AdvanceOptions, "matterSources" | "horizonDays">;
  /** Bookkeeping the app runs around apply and each advance (seating cases), so a projection keeps the registry the live game keeps. */
  readonly settle?: (campaign: Campaign) => Campaign;
  readonly onWeek?: (week: number) => void;
};

export type ProjectionRun = {
  readonly alternative: string;
  readonly member: number;
  /** Index 0 is the moment after the act, before a day runs; index w is the close of week w. */
  readonly readings: readonly ProjectionReading[];
  /** The week the presidency ended in this run; no reading follows it. */
  readonly endedWeek?: number;
  /** Why the act could not be committed on this run's copy. */
  readonly refused?: string;
};

export function projectionSeed(seed: CampaignSeed, member: number): CampaignSeed {
  return makeCampaignSeed(`${seed}::projection::${member}`);
}

/** Every figure the workbench draws, read off one projected campaign. */
export function projectionReading(campaign: Campaign): ProjectionReading {
  const { metrics, opinion } = campaign.player;
  const entries: [ProjectionMetric, number][] = [
    ["approval", metrics.approval],
    ["treasury", metrics.treasury],
    ["stability", metrics.stability],
    ["standing", metrics.standing],
    ["militaryReadiness", metrics.militaryReadiness],
    ["removalPressure", campaign.removal.pressure],
    ...OPINION_DRIVERS.map((driver): [ProjectionMetric, number] => [`judgment:${driver}`, opinion[driver]]),
    ...COHORT_IDS.map((cohort): [ProjectionMetric, number] => [`cohort:${cohort}`, cohortSupport(campaign, cohort)]),
  ];
  return Object.fromEntries(entries) as ProjectionReading;
}

/** Seven daily steps, with the same between-day seating as the running player clock. */
function runWeek(state: Campaign, options: ProjectionRunOptions): Campaign {
  const settle = options.settle ?? ((campaign: Campaign) => campaign);
  let working = state;
  for (let day = 0; day < DAYS_PER_TURN; day += 1) {
    const run = advanceUntilAttention(working, { ...options.advance, horizonDays: 1 });
    working = settle(run.campaign);
    if (run.stopReason === "ended" || run.elapsedDays === 0) break;
  }
  return working;
}

/** One alternative, one ensemble member, run `weeks` forward on a detached copy. */
export function projectRun(campaign: Campaign, alternative: ProjectionAlternative, options: ProjectionRunOptions): ProjectionRun {
  const head = { alternative: alternative.id, member: options.member };
  const detached: Campaign = { ...believedCampaign(campaign, options.member, options.basis), seed: projectionSeed(campaign.seed, options.member) };
  const built = alternative.build(detached, createRngStreams(detached.seed));
  if (!built.ok) return { ...head, readings: [], refused: built.reason };
  const settle = options.settle ?? ((state: Campaign) => state);
  let state = settle(built.packets.reduce((working, packet) => apply(working, packet), detached));
  const readings: ProjectionReading[] = [projectionReading(state)];
  if (campaignIsOver(state)) return { ...head, readings, endedWeek: 0 };
  for (let week = 1; week <= options.weeks; week += 1) {
    state = runWeek(state, options);
    readings.push(projectionReading(state));
    options.onWeek?.(week);
    if (campaignIsOver(state)) return { ...head, readings, endedWeek: week };
  }
  return { ...head, readings };
}

export type ProjectionOptions = Omit<ProjectionRunOptions, "member" | "onWeek"> & {
  readonly members?: number;
};

/** Every alternative across the ensemble, alternatives in the order given and members in seed order. */
export function projectAlternatives(campaign: Campaign, alternatives: readonly ProjectionAlternative[], options: ProjectionOptions): readonly ProjectionRun[] {
  const members = options.members ?? PROJECTION_ENSEMBLE_SIZE;
  return alternatives.flatMap((alternative) =>
    Array.from({ length: members }, (_, member) => projectRun(campaign, alternative, { ...options, member })),
  );
}
