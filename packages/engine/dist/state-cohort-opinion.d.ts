import { type CohortAxisId, type CohortId, type StateId } from "@admin/world";
import { type CohortStrain } from "./demos.js";
import type { RngStreams } from "./rng.js";
import type { Campaign } from "./state.js";
/** Raking stops at this many sweeps whether or not it has converged; the residual says how close it got. */
export declare const RAKE_MAX_SWEEPS = 200;
/** Raking stops once no margin is off by more than this, in share. */
export declare const RAKE_TOLERANCE = 1e-7;
/**
 * The jitter on each campaign's sensitivities, as a fraction of the estimate's
 * own bootstrap standard error: campaigns differ, and none differs by more than
 * the data could tell apart.
 */
export declare const SENSITIVITY_JITTER_SHARE = 0.5;
/** This campaign's sensitivities, drawn once at founding on their own stream and stored. */
export declare function openingCohortSensitivity(streams: RngStreams): Readonly<Record<CohortId, number>>;
/** The stored draw, or the sourced point estimates on a save founded before the draw existed. */
export declare function cohortSensitivity(campaign: Campaign): Readonly<Record<CohortId, number>>;
/**
 * How much of a remembered act landed on one state's members of the group,
 * against the group's average: 1 where the act carried no geography, 0 in a
 * state it did not reach. The people-weighted mean across states is one, so
 * redistributing a strain this way leaves the group's national figure alone.
 */
export declare function strainIntensity(strain: CohortStrain, state: StateId): number;
/** The logit step a group's own memory adds in one state beyond what it adds everywhere. */
export declare function strainTilt(strains: readonly CohortStrain[], state: StateId): number;
/** One axis, raked: the fitted cells and how close each margin came. */
export type AxisFit = {
    readonly axis: CohortAxisId;
    /** support[state][cohort], 0..1. */
    readonly support: Readonly<Partial<Record<StateId, Readonly<Partial<Record<CohortId, number>>>>>>;
    /** Each group's national figure as the engine reads it. */
    readonly national: Readonly<Partial<Record<CohortId, number>>>;
    /** The shared log-odds step that made the groups' total meet the states'. */
    readonly reconciliation: number;
    readonly residuals: {
        readonly state: number;
        readonly national: number;
    };
    readonly sweeps: number;
};
/** Every axis raked for one campaign: the table a screen reads. */
export type StateCohortOpinion = {
    readonly axes: Readonly<Record<CohortAxisId, AxisFit>>;
};
/** Support for the administration by state and group, every axis. Derived each read; memoized per campaign value. */
export declare function stateCohortOpinion(campaign: Campaign): StateCohortOpinion;
/** One group's support in one state, or undefined where the campaign carries no such state. */
export declare function stateCohortSupport(campaign: Campaign, state: StateId, cohort: CohortId): number | undefined;
