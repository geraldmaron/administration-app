// A policy samples the desk weekly while the player's actual running clock
// advances each day, including case staging, lapse and inaction processing.
// This measures that clock policy, not attention-stop or browser usability.
import "../register-player-core.mjs";
import {
  BEAT_THRESHOLDS,
  apply,
  campaignIsOver,
  commitReply,
  createRngStreams,
  enactPolicy,
  forecastOutcome,
  resolveAction,
  selectEnding,
} from "../../packages/engine/dist/index.js";
import { foundedForBalance } from "../../packages/engine/dist/balance-harness.js";
import type { Campaign, CampaignEnding, MetricSet } from "../../packages/engine/dist/index.js";
import {
  CORE_CONSEQUENCES,
  compileConsequences,
  deskOpen,
  rememberReply,
  scenarioOccurrenceKey,
} from "../../packages/content/dist/index.js";
import type { ScenarioPool, ScenarioSeverity } from "../../packages/content/dist/index.js";
import { POLICIES, harmOf, instrumentOptions, isDomestic, scoreReplies } from "./policies.ts";
import type { Archetype } from "./policies.ts";
const { createCampaignStore } = await import("../../packages/player-core/dist/campaign/store.js");
const { createMemoryStorage, createSaveStore } = await import("../../packages/player-core/dist/persistence/save-store.js");
const { mountDeliveredScenarios, pendingConversations } = await import("../../packages/player-core/dist/conversation/scripts.js");
const { modelingChoice } = await import("../../packages/player-core/dist/modeling/choices.js");
const { runModelingJobs } = await import("../../packages/player-core/dist/modeling/run.js");
const { ensembleBand } = await import("../../packages/player-core/dist/modeling/view.js");
const { forecastPacket, forecastSource } = await import("../../packages/player-core/dist/modeling/forecast.js");

const CONSEQUENCES = compileConsequences(CORE_CONSEQUENCES);

/** Metric readings a floor is worth reporting on. Treasury is tracked as a ratio. */
const TRACKED = ["approval", "stability", "standing", "militaryReadiness"] as const;

export type AnsweredRecord = {
  readonly turn: number;
  readonly pressure: number;
  readonly scenario: string;
  readonly occurrence: string;
  readonly replyId: string;
  readonly severity: ScenarioSeverity;
  readonly scenarioClass: string;
  readonly domestic: boolean;
  /** What the screen said the answer would cost. */
  readonly projectedHarm: number;
  /** What the metrics actually moved by once the packet was applied. */
  readonly realizedHarm: number;
  readonly realized: Partial<MetricSet>;
};

export type TurnRecord = {
  readonly turn: number;
  readonly pressure: number;
  readonly beatsOpen: number;
  readonly stagedSeverities: readonly ScenarioSeverity[];
  readonly answeredSeverity?: ScenarioSeverity;
  readonly approval: number;
  readonly treasuryRatio: number;
  readonly stability: number;
  readonly standing: number;
};

export type RunResult = {
  readonly seed: string;
  readonly archetype: Archetype;
  readonly pool: string;
  readonly charter: string;
  readonly mechanism: string;
  readonly ending: CampaignEnding;
  readonly endTurn: number;
  readonly turnsPlayed: number;
  readonly horizon: number;
  /** The turn each beat of the removal arc opened, in order. */
  readonly beatTurns: readonly number[];
  readonly peakPressure: number;
  readonly finalPressure: number;
  /** Turns between the first beat and the campaign ending, when it ended at all. */
  readonly telegraphTurns?: number;
  readonly floors: Readonly<Record<(typeof TRACKED)[number] | "treasuryRatio", number>>;
  readonly turnsInsolvent: number;
  readonly scenariosStaged: number;
  readonly scenariosAnswered: number;
  readonly deskClosedTurns: number;
  readonly emptyDeskTurns: number;
  readonly refusals: number;
  readonly actionsAttempted: number;
  readonly actionsLanded: number;
  readonly turns: readonly TurnRecord[];
  readonly answered: readonly AnsweredRecord[];
  readonly forecasts?: readonly ForecastSample[];
  readonly actionOdds?: readonly { readonly chance: number; readonly success: boolean }[];
  readonly forecastAttempts?: number;
};

export type ForecastSample = {
  readonly id: string;
  readonly confidence: "low" | "moderate" | "high";
  readonly members: number;
  readonly dueTurn: number;
  readonly band: { readonly median: number; readonly low: number; readonly high: number };
  readonly outcome: "pending" | "unrecorded" | "settled";
  readonly actual?: number;
  readonly within?: boolean;
  /** Later player decisions before the forecast's target reading, including same-week acts. */
  readonly followUps: number;
};

export type ForecastCalibration = { readonly every: number; readonly members: number; readonly weeks: number; readonly control: "continue" | "hold" };

const round3 = (value: number) => Math.round(value * 1000) / 1000;

function enactOpeningProgram(campaign: Campaign, stances: readonly string[]): Campaign {
  let working = campaign;
  for (const stance of stances) {
    const result = enactPolicy(working, stance);
    if (result.ok) working = apply(working, result.packet);
  }
  return working;
}

function metricDelta(before: MetricSet, after: MetricSet): Partial<MetricSet> {
  const delta: Record<string, number> = {};
  for (const field of ["approval", "treasury", "stability", "militaryReadiness", "standing"] as const) {
    const moved = round3(after[field] - before[field]);
    if (moved !== 0) delta[field] = moved;
  }
  return delta as Partial<MetricSet>;
}

export async function playCampaign(
  seed: string,
  archetype: Archetype,
  pool: ScenarioPool,
  poolName: string,
  horizon: number,
  calibration?: ForecastCalibration,
): Promise<RunResult> {
  const policy = POLICIES[archetype];
  const { campaign: seeded, charter } = foundedForBalance(seed);
  const founded = enactOpeningProgram(seeded, policy.openingProgram);
  mountDeliveredScenarios(pool.selectors.flatMap((entry) => {
    const def = pool.peek(entry.id);
    return def ? [def] : [];
  }));
  const store = createCampaignStore({ saves: createSaveStore(createMemoryStorage()) });
  await store.begin(founded);
  const current = (): Campaign => {
    const state = store.getState();
    if (state.status !== "ready") throw new Error(`Campaign store is ${state.status}`);
    return state.campaign;
  };
  const openingTreasury = Math.max(1, founded.player.metrics.treasury);

  let working = current();
  const turns: TurnRecord[] = [];
  const answered: AnsweredRecord[] = [];
  const forecasts: ForecastSample[] = [];
  const actionOdds: { chance: number; success: boolean }[] = [];
  let forecastAttempts = 0;
  let holdUntil = -1;
  const noteFollowUp = (turn: number): void => {
    for (let index = 0; index < forecasts.length; index++) {
      const sample = forecasts[index]!;
      // The due-turn reading is captured when that week's opening is recorded,
      // after the policy could otherwise act at the start of the same turn.
      if (sample.outcome === "pending" && turn <= sample.dueTurn) forecasts[index] = { ...sample, followUps: sample.followUps + 1 };
    }
  };
  const beatTurns: number[] = [];
  let peakPressure = 0;
  let scenariosStaged = 0;
  let deskClosedTurns = 0;
  let emptyDeskTurns = 0;
  let refusals = 0;
  let actionsAttempted = 0;
  let actionsLanded = 0;
  let turnsInsolvent = 0;
  const floors: Record<string, number> = { treasuryRatio: Number.POSITIVE_INFINITY };
  for (const field of TRACKED) floors[field] = Number.POSITIVE_INFINITY;

  for (let step = 0; step < horizon; step += 1) {
    const streams = createRngStreams(working.seed);

    // --- The desk ---
    const open = deskOpen(working);
    if (!open) deskClosedTurns += 1;
    const staged = pendingConversations(working);
    if (open && staged.length === 0) emptyDeskTurns += 1;
    scenariosStaged += staged.length;

    let answeredSeverity: ScenarioSeverity | undefined;
    // The app opens on the first of the week's staging and the rest waits
    // behind it; answering one stamps the desk closed for the turn.
    const cast = calibration?.control === "hold" && working.turn <= holdUntil ? undefined : staged[0];
    if (cast) {
      const scored = scoreReplies(working, cast, streams);
      const chosen = policy.chooseReply(working, cast, scored);
      if (calibration && step % calibration.every === 0) forecastAttempts += 1;
      const modeled = calibration && step % calibration.every === 0
        ? runModelingJobs(working, { spec: { kind: "decision", id: cast.def.id }, weeks: calibration.weeks,
            jobs: Array.from({ length: calibration.members }, (_, member) => ({ alternative: chosen.option.id, member })) })
        : [];
      const values = modeled.filter((run) => run.refused === undefined && run.readings.length > 0)
        .map((run) => run.readings.at(-1)!.approval);
      const choice = values.length ? modelingChoice(working, { kind: "decision", id: cast.def.id }) : undefined;
      const source = choice ? forecastSource(working, { kind: "decision", id: cast.def.id }) : undefined;
      const band = values.length ? ensembleBand(values) : undefined;
      const result = commitReply(working, cast.script, chosen.option, streams, {
        consequences: CONSEQUENCES,
      });
      if (!result.ok) {
        refusals += 1;
      } else {
        const before = working.player.metrics;
        await store.commit(rememberReply(working, result.packet, cast, chosen.option.id), { basis: working });
        working = current();
        noteFollowUp(working.turn);
        if (calibration && choice && source && band) {
          const packet = forecastPacket(working, { source, subject: choice.title,
            option: choice.alternatives.find((alternative) => alternative.id === chosen.option.id)!.label,
            weeks: calibration.weeks, approval: band });
          if (packet) {
            await store.commit(packet, { basis: working });
            working = current();
            const record = working.forecasts?.at(-1);
            if (!record) throw new Error("Forecast packet was not filed");
            forecasts.push({ id: record.id, confidence: record.confidence, members: values.length,
              dueTurn: record.dueTurn, band: record.approval, outcome: "pending", followUps: 0 });
            if (calibration.control === "hold") holdUntil = Math.max(holdUntil, record.dueTurn);
          }
        }
        const realized = metricDelta(before, working.player.metrics);
        answeredSeverity = cast.def.severity;
        answered.push({
          turn: working.turn,
          pressure: round3(working.removal.pressure),
          scenario: cast.def.id,
          occurrence: scenarioOccurrenceKey(cast),
          replyId: chosen.option.id,
          severity: cast.def.severity,
          scenarioClass: cast.def.class,
          domestic: isDomestic(working, cast),
          projectedHarm: round3(harmOf(working, chosen.projection.cost)),
          realizedHarm: round3(harmOf(working, realized)),
          realized,
        });
      }
    }

    // --- The act of state ---
    const action = calibration?.control === "hold" && working.turn <= holdUntil ? undefined : policy.chooseInstrument(working, instrumentOptions(working, streams));
    if (action) {
      const resolved = resolveAction(working, action.request, streams, "action");
      if (resolved.ok) {
        actionsAttempted += 1;
        if (resolved.success) actionsLanded += 1;
        if (calibration) actionOdds.push({ chance: action.projection.successChance, success: resolved.success });
        await store.commit(resolved.packet, { basis: working });
        working = current();
        noteFollowUp(working.turn);
      }
    }

    // --- The week ---
    const beatsBefore = working.removal.beats.length;
    for (let day = 0; day < 7 && !campaignIsOver(current()); day += 1) {
      await store.stepClockDay({ persist: false });
    }
    working = current();
    for (let index = 0; index < forecasts.length; index++) {
      const sample = forecasts[index]!;
      if (sample.outcome !== "pending") continue;
      const record = working.forecasts?.find((entry) => entry.id === sample.id);
      if (!record) throw new Error(`Issued forecast ${sample.id} is absent`);
      const outcome = forecastOutcome(working, record);
      if (outcome.state === "settled") forecasts[index] = { ...sample, outcome: "settled", actual: outcome.approval, within: outcome.within };
      else if (outcome.state === "unrecorded") forecasts[index] = { ...sample, outcome: "unrecorded" };
    }
    if (working.removal.beats.length > beatsBefore) {
      for (const beat of working.removal.beats.slice(beatsBefore)) beatTurns.push(beat.turn);
    }

    const metrics = working.player.metrics;
    const treasuryRatio = metrics.treasury / openingTreasury;
    for (const field of TRACKED) floors[field] = Math.min(floors[field]!, metrics[field]);
    floors.treasuryRatio = Math.min(floors.treasuryRatio!, treasuryRatio);
    if (metrics.treasury <= 0) turnsInsolvent += 1;
    peakPressure = Math.max(peakPressure, working.removal.pressure);

    turns.push({
      turn: working.turn,
      pressure: round3(working.removal.pressure),
      beatsOpen: working.removal.beats.length,
      stagedSeverities: staged.map((entry) => entry.def.severity),
      ...(answeredSeverity ? { answeredSeverity } : {}),
      approval: round3(metrics.approval),
      treasuryRatio: round3(treasuryRatio),
      stability: round3(metrics.stability),
      standing: round3(metrics.standing),
    });

    if (working.removal.resolved || campaignIsOver(working)) break;
  }

  const ending = selectEnding(working);
  const firstBeat = beatTurns[0];
  return {
    seed,
    archetype,
    pool: poolName,
    charter: charter.id,
    mechanism: charter.removalMechanism,
    ending,
    endTurn: working.turn,
    turnsPlayed: working.turn - founded.turn,
    horizon,
    beatTurns,
    peakPressure: round3(peakPressure),
    finalPressure: round3(working.removal.pressure),
    ...(firstBeat !== undefined && ending !== "in-office" ? { telegraphTurns: working.turn - firstBeat } : {}),
    floors: {
      approval: round3(floors.approval!),
      stability: round3(floors.stability!),
      standing: round3(floors.standing!),
      militaryReadiness: round3(floors.militaryReadiness!),
      treasuryRatio: round3(floors.treasuryRatio!),
    },
    turnsInsolvent,
    scenariosStaged,
    scenariosAnswered: answered.length,
    deskClosedTurns,
    emptyDeskTurns,
    refusals,
    actionsAttempted,
    actionsLanded,
    turns,
    answered,
    ...(calibration ? { forecasts, actionOdds, forecastAttempts } : {}),
  };
}

/** Which rung of the removal ladder a pressure reading sits on. */
export function pressureBand(pressure: number): number {
  return BEAT_THRESHOLDS.filter((threshold) => pressure >= threshold).length;
}
