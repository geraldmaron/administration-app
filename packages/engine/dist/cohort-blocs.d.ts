import { type CohortId } from "@admin/world";
import { type Bloc, type PartyShares } from "./electorate.js";
import type { Campaign } from "./state.js";
/** The composition whose neutral vote is this cohort's measured baseline. */
export declare function compositionFor(shares: PartyShares, republicanBaseline: number): PartyShares;
/** Every cohort's bloc composition by party, derived from the founding draws and never stored. */
export declare function cohortCompositions(campaign: Campaign): Readonly<Record<CohortId, PartyShares>>;
/** One cohort's composition from the President's side of the aisle. */
export declare function cohortBlocShares(campaign: Campaign, cohort: CohortId): Readonly<Record<Bloc, number>>;
/**
 * How much a hurt cohort's own-side and other-side blocs change their turnout
 * per unit of unforgiven harm. Halved from the cohort turnout layer's 0.2,
 * because cohorts overlap across eleven axes and their displacements sum.
 * Design judgment, labeled.
 */
export declare const BLOC_DISILLUSION = 0.1;
export declare const BLOC_MOBILIZATION = 0.1;
/**
 * Each bloc's turnout displacement from what this administration has done to
 * the cohorts its members belong to: the President's own blocs stay home where
 * their people were hurt, the opposition's turn out. Summed as main effects
 * across axes and capped per bloc.
 */
export declare function blocTurnoutShift(campaign: Campaign, harm: Readonly<Record<CohortId, number>>, cohortShare: Readonly<Record<CohortId, number>>, partisanship: Readonly<Record<Bloc, number>>): Readonly<Record<Bloc, number>>;
