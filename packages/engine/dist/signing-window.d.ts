import type { Campaign, GameDate } from "./state.js";
import type { Bill } from "./state-legislature.js";
/** The days the Constitution gives, not counting Sundays. */
export declare const SIGNING_DAYS = 10;
/**
 * The day a bill's business is dated to.
 *
 * The office-day advance runs the legislative phases on a real weekday, and that
 * day is the calendar. A caller ticking a whole week at once runs them with the
 * calendar still on the week's opening, and there the week's own close is the
 * honest date: that is the latest the sitting could have been.
 */
export declare function sittingDate(campaign: Campaign): GameDate;
/**
 * When the bill reached the desk. A desk bill written without a presentment
 * date reads as presented at the close of the week it was introduced, which is
 * when a measure discharged straight to the desk is presented.
 */
export declare function presentmentDate(campaign: Campaign, bill: Bill): GameDate;
/** The last day of the window: ten days after presentment, Sundays skipped. */
export declare function signingDeadline(presented: GameDate): GameDate;
export type SigningWindow = {
    readonly presentedOn: GameDate;
    /** The last day the President may sign or return it. */
    readonly deadline: GameDate;
    /** The week the deadline falls in, which is the week the bill becomes law unsigned. */
    readonly lapseTurn: number;
    /** Calendar days from presentment to the deadline, Sundays included. */
    readonly windowDays: number;
};
export declare function selectSigningWindow(campaign: Campaign, bill: Bill): SigningWindow;
/** Whether the window closed before `today`: the deadline itself is still the President's. */
export declare function signingWindowClosed(campaign: Campaign, bill: Bill, today: GameDate): boolean;
/**
 * The enrolled bills the President can still sign or return. A bill past its
 * tenth day is law in waiting: it stays on the desk only until the chamber's
 * next sitting records it, and nothing the President does reaches it.
 */
export declare function selectBillsAwaitingSignature(campaign: Campaign): readonly Bill[];
