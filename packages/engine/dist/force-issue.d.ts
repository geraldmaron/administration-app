import { type Bloc } from "./electorate.js";
import { type Campaign } from "./state.js";
import type { UsMajorParty } from "./state-legislature.js";
/** Share of each party's blocs preferring military strength to diplomacy as the way to keep the peace. */
export declare const MILITARY_STRENGTH_SHARE: {
    readonly republican: 0.46;
    readonly democrat: 0.1;
    readonly pure: 0.2;
};
/** The most the force term may move one bloc, in logits: inside the per-bloc issue cap of 0.30. */
export declare const FORCE_ISSUE_WEIGHT = 0.6;
/** How long an act of force or a sanction stays part of the record the public holds this administration to. */
export declare const FORCE_ISSUE_MEMORY_WEEKS = 26;
/** How much of a force record this administration is carrying, 0..1. */
export declare function forceRecord(campaign: Campaign): number;
/** Each bloc's force term in logits, from the President's side of the aisle. */
export declare function forceIssueTerms(record: number, shares: Readonly<Record<Bloc, number>>, anchor: UsMajorParty): Readonly<Record<Bloc, number>>;
