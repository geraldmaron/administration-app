import { type ChamberSupportAssessment } from "./support-assessment.js";
import { type Bill, type Campaign, type Chamber, type ChamberVote } from "@admin/engine";
import { type StateId } from "@admin/world";
/** Which count the bill faces next. */
export type WhipQuestion = "passage" | "override" | "recorded";
/** Whether a yea is a vote with the President or against him. */
export type WhipFrame = "with" | "against";
export type DelegationWhip = {
    readonly state: StateId;
    readonly name: string;
    readonly seats: number;
    readonly yeas: number;
    readonly nays: number;
    /** Members on the administration's side of this question, whichever way the question is put. */
    readonly withYou: number;
};
export type ChamberWhip = {
    readonly chamber: Chamber;
    readonly name: string;
    /** The engine's count, which the totals below always sum to. */
    readonly vote: ChamberVote;
    /** Every delegation with a seat, in state order. Empty when the save's delegations do not add up to the chamber. */
    readonly delegations: readonly DelegationWhip[];
    /** Delegations that split on the question, the largest first: where a vote could still be found. */
    readonly swing: readonly DelegationWhip[];
    /** The presiding officer's vote on a tied Senate, which no delegation cast: +1 for, -1 against, 0 otherwise. */
    readonly presiding: number;
};
export type WhipCount = {
    readonly assessment: readonly ChamberSupportAssessment[];
    readonly question: WhipQuestion;
    readonly frame: WhipFrame;
    readonly chambers: readonly ChamberWhip[];
};
type Share = {
    readonly key: StateId;
    readonly cap: number;
    readonly weight: number;
};
/**
 * Place `total` yeas across rows of members, each row voting yea at the
 * caucus's own rate moved by how far its weight sits from the caucus's mean.
 * Sums to `total` exactly and never exceeds a row's seats.
 */
export declare function spreadVotes(total: number, rows: readonly Share[]): ReadonlyMap<StateId, number>;
/**
 * The count a bill faces next, by chamber and by delegation: the floor count
 * while it is in the chambers, the override count while it is on the desk,
 * and the recorded count once it is settled.
 */
export declare function whipCount(campaign: Campaign, bill: Bill): WhipCount;
/** One chamber's whip, by state, for the map: how much of each delegation is with the administration. */
export declare function whipByState(whip: WhipCount, chamber: Chamber): ReadonlyMap<string, DelegationWhip>;
export {};
