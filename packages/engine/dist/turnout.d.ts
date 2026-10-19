import { type CohortId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type Bloc } from "./electorate.js";
/** How much unforgiven harm each cohort carries relative to its axis, 0..1. */
export declare function cohortHarm(campaign: Campaign): Readonly<Record<CohortId, number>>;
export type BlocTurnout = {
    readonly bloc: Bloc;
    readonly habit: number;
    readonly shift: number;
    readonly turnout: number;
};
/** Each bloc's turnout this week: its habit, moved by what was done to the cohorts its members belong to. */
export declare function selectBlocTurnout(campaign: Campaign): readonly BlocTurnout[];
/** The ballot at habitual turnout and at this week's, from one reading of the blocs. */
export declare function selectBallot(campaign: Campaign): {
    readonly habitual: number;
    readonly actual: number;
};
/** What differential participation does to the count, in share of the vote. */
export declare function turnoutShift(campaign: Campaign): number;
export type CohortTurnout = {
    readonly cohort: CohortId;
    readonly name: string;
    readonly share: number;
    readonly support: number;
    /** The share of it that turns out when nothing has happened to it. */
    readonly habit: number;
    /** The share of it that would turn out this week. */
    readonly turnout: number;
};
/**
 * Every cell's turnout, in the order `selectCohorts` gives them: its published
 * habit, moved by the displacement of the blocs it is made of. A reading of the
 * blocs through the cohort, so it cannot disagree with the ballot.
 */
export declare function selectCohortTurnout(campaign: Campaign): readonly CohortTurnout[];
