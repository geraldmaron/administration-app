import type { CohortId } from "@admin/world";
export type CohortSensitivityEstimate = {
    /** Slope of the group's log-odds on its state's, minus one. */
    readonly beta: number;
    /** Bootstrap standard error of beta, clustered by state. */
    readonly se: number;
    /** State-years with at least five of the group's voters. */
    readonly stateYears: number;
    /** The group's validated two-party voters across both surveys. */
    readonly voters: number;
};
export declare const STATE_COHORT_SENSITIVITY: Readonly<Record<CohortId, CohortSensitivityEstimate>>;
export type CohortBaselineEstimate = {
    /** The group's Republican share of its two-party presidential vote. */
    readonly republican: number;
    /** Bootstrap standard error of that share, clustered by state. */
    readonly se: number;
};
export declare const COHORT_PARTISAN_BASELINE: Readonly<Record<CohortId, CohortBaselineEstimate>>;
