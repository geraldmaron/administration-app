import { type CohortAxisId, type CohortId, type StateId } from "@admin/world";
import { type Campaign } from "@admin/engine";
import { type Stance } from "../reading";
import { type DemographicAxis } from "./electorate";
/** The one line a screen shows under a state-by-group figure, saying what it is. */
export declare const STATE_GROUP_METHOD = "Estimated, not polled, by splitting each state's approval among its groups based on how closely each group voted like its state in the 2020 and 2024 Cooperative Election Study (a large voter survey), so the groups add up to the state and the states add up to each group's national figure.";
export type StateSize = {
    readonly population: number;
    /** 1 is the most populous. */
    readonly rank: number;
    readonly of: number;
    /** The most populous state's people, for drawing this one against it. */
    readonly largest: number;
    /** Share of the people the dataset carries across all states, 0..1. */
    readonly share: number;
};
export type Standout = {
    readonly cohort: CohortId;
    readonly axis: CohortAxisId;
    readonly axisName: string;
    readonly name: string;
    readonly state: number;
    readonly nation: number;
    readonly gap: number;
};
export type GroupRating = {
    readonly cohort: CohortId;
    readonly axis: CohortAxisId;
    readonly axisName: string;
    readonly name: string;
    /** The group's share of this state's people. */
    readonly state: number;
    readonly nation: number;
    /** The group's support in this state, estimated. */
    readonly support: number;
    /** The group's support across the country, the engine's own figure. */
    readonly national: number;
    /** State figure less national figure, in share. */
    readonly gap: number;
    readonly figure: string;
    readonly word: string;
    readonly stance: Stance;
};
export type StatePeople = {
    readonly size: StateSize;
    readonly axes: readonly DemographicAxis[];
    readonly standouts: readonly Standout[];
    readonly ratings: readonly GroupRating[];
};
/** Below this a gap is noise beside the source's own rounding. */
export declare const STANDOUT_FLOOR = 0.02;
/** The most distinctive groups: the largest gaps, one per axis, sex left out because its two cells mirror each other. */
export declare function standoutsOf(axes: readonly DemographicAxis[], count: number): readonly Standout[];
/** An exact community, including those not selected for the summary's top-six list. */
export declare function stateGroupRating(campaign: Campaign, id: StateId, cohort: CohortId): GroupRating | undefined;
/** Undefined for a state the campaign does not carry or whose dataset has no cohort mix. */
export declare function statePeople(campaign: Campaign, id: StateId): StatePeople | undefined;
/** One column of the states-by-groups grid. */
export type GridGroup = {
    readonly cohort: CohortId;
    readonly name: string;
    /** The group's national figure, the engine's own. */
    readonly national: number;
};
/** One state's row: its approval and every group of the axis, in column order. */
export type GridRow = {
    readonly state: StateId;
    readonly name: string;
    readonly approval: number;
    readonly cells: readonly {
        readonly cohort: CohortId;
        readonly support: number;
        readonly share: number;
    }[];
};
export type StateGroupGrid = {
    readonly axis: CohortAxisId;
    readonly axisName: string;
    readonly groups: readonly GridGroup[];
    /** In `STATE_IDS` order; a screen sorts them. */
    readonly rows: readonly GridRow[];
};
/** Every state against every group of one axis, for a heatmap. */
export declare function stateGroupGrid(campaign: Campaign, axis: CohortAxisId): StateGroupGrid;
