import { type CohortId } from "@admin/world";
import { type AdvanceOptions } from "./advance.js";
import type { EffectPacket } from "./effect-types.js";
import { type OpinionDriver } from "./opinion-drivers.js";
import { type ForecastBasis } from "./projection-belief.js";
import { type CampaignSeed, type RngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
/** The horizons a President can ask for, in weeks. */
export declare const PROJECTION_HORIZON_WEEKS: readonly [4, 13, 26, 52];
export type ProjectionHorizon = (typeof PROJECTION_HORIZON_WEEKS)[number];
/** Runs per alternative. Five gives a median and a range without making a long horizon wait. */
export declare const PROJECTION_ENSEMBLE_SIZE = 5;
export type ProjectionMetric = "approval" | "treasury" | "stability" | "standing" | "militaryReadiness" | "removalPressure" | `judgment:${OpinionDriver}` | `cohort:${CohortId}`;
export type ProjectionReading = Readonly<Record<ProjectionMetric, number>>;
export declare const PROJECTION_HEADLINE_METRICS: readonly ["approval", "treasury", "stability", "standing", "militaryReadiness", "removalPressure"];
export type ProjectionBuild = {
    readonly ok: true;
    readonly packets: readonly EffectPacket[];
} | {
    readonly ok: false;
    readonly reason: string;
};
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
export declare function projectionSeed(seed: CampaignSeed, member: number): CampaignSeed;
/** Every figure the workbench draws, read off one projected campaign. */
export declare function projectionReading(campaign: Campaign): ProjectionReading;
/** One alternative, one ensemble member, run `weeks` forward on a detached copy. */
export declare function projectRun(campaign: Campaign, alternative: ProjectionAlternative, options: ProjectionRunOptions): ProjectionRun;
export type ProjectionOptions = Omit<ProjectionRunOptions, "member" | "onWeek"> & {
    readonly members?: number;
};
/** Every alternative across the ensemble, alternatives in the order given and members in seed order. */
export declare function projectAlternatives(campaign: Campaign, alternatives: readonly ProjectionAlternative[], options: ProjectionOptions): readonly ProjectionRun[];
