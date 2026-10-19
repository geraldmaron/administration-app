import { type Bill, type BillStage, type Campaign, type ChamberVote, type GameDate } from "./state.js";
import { type VoteStance } from "./congress-votes.js";
import type { Effect } from "./effects.js";
import { type LegislativeAct } from "./legislative-acts.js";
/** The stages, in the order a measure moves through them. */
export declare const BILL_STAGES: readonly BillStage[];
/** How many weeks of stalling bury a bill. */
export declare const BILL_SETBACK_LIMIT = 3;
/** Three weekly sittings leave the President time to answer a late conference briefing. */
export declare const CONFERENCE_RECOMMENDATION_WEEKS = 3;
/**
 * The floor votes that would carry one act to the desk.
 *
 * Exposed rather than internal because a president lobbies against a count, and
 * a count nobody can read is not something anyone can lobby against.
 *
 * The Senate's count is against cloture rather than against a majority for
 * everything but the budget track, which is the arithmetic that actually
 * decides whether a bill becomes law.
 *
 * `momentum` is what the weeks in committee have done to the measure. It is
 * added to the act's own appeal rather than to the count, so a bill that
 * gained the room reads as a more attractive bill rather than as a chamber
 * that changed its mind.
 *
 * A measure that restrains the President is counted from the other end: the
 * yeas are members voting to bind him, so a hostile chamber is the one that
 * passes it.
 */
export declare function restrainsThePresident(act: LegislativeAct): boolean;
/** Whose bill this is, on the floor's own terms. A bipartisan bill is nobody's. */
export declare function stanceOf(act: LegislativeAct): VoteStance;
export declare function projectPassage(campaign: Campaign, act: LegislativeAct, momentum?: number, billId?: string): readonly ChamberVote[];
export declare function recordFloorVotes(votes: readonly ChamberVote[], turn: number): readonly ChamberVote[];
/**
  * Where a bill sits. A discharged measure carries no stage at all — it jumped
  * the calendar and never sat in one — and reads as referral here because that
  * is the foot of the ladder, not because anything was lost.
  */
export declare function billStage(bill: Bill): BillStage;
/** Case due date: default runs before the weekly phase in which conferees choose. */
export declare function conferenceRecommendationDeadline(campaign: Campaign, bill: Bill): GameDate | undefined;
export type StageProjection = {
    readonly stage: BillStage;
    /** The chance this week moves it on, 0..1. */
    readonly advances: number;
    /** The chance this week stalls it, 0..1. */
    readonly stalls: number;
    readonly setbacks: number;
    readonly setbacksRemaining: number;
    /** The count the floor stage would take, at the momentum the bill has now. */
    readonly floor: readonly ChamberVote[];
    /** Whether that count carries. At the floor stage this is what "moves on" means. */
    readonly floorCarries: boolean;
};
/**
 * What a bill in progress faces this week, for the screen that has to show it.
 *
 * The same numbers the phase itself draws against, computed here once so that
 * the odds a folio prints and the odds the week is resolved on can never be two
 * different readings.
 */
export declare function projectStage(campaign: Campaign, bill: Bill): StageProjection | undefined;
export type StageAdvance = {
    readonly effects: readonly Effect[];
    /** One line per bill that moved, for the phase's own narration. */
    readonly accounts: readonly string[];
};
/**
 * Every bill in progress, one week on.
 *
 * The draw is seeded on the campaign and keyed on the bill and the week, so a
 * replay legislates identically and a bill's own history is independent of what
 * else the turn happened to resolve first.
 *
 * A bill that carries the floor only reaches the desk if the desk is free.
 * Congress sends one at a time, and the alternative — two enrolled bills waiting
 * on one signature — is the desk nobody reads that the origination gate exists
 * to prevent. It waits at the floor without a setback: the calendar being full
 * is not the bill stalling.
 */
export declare function advanceBills(state: Campaign, clearedThisWeek?: readonly string[]): StageAdvance;
