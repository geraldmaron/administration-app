import type { ProgramShift } from "./fiscal-impulse.js";
import type { Campaign } from "./state.js";
/**
 * The line's share of potential output, as the program and the laws write it,
 * before any cap: the cap is charged separately, against the crowding.
 */
export declare function discretionaryShare(shift: ProgramShift): number;
/**
 * What comes off the line for a cap and for the crowding, nominal: the larger
 * of the two, never their sum. A cap is a ceiling on what is appropriated, and
 * the interest on the President's added stock is paid inside the same ceiling,
 * so where the cap binds it already holds the line below where the crowding
 * would have put it. With no cap the crowding is the whole charge, and it is
 * negative for a President who has paid the stock down: the interest saved
 * returns to the line.
 */
export declare function discretionaryCharge(potential: number, cap: number, crowding: number): number;
/**
 * The share of the discretionary line a lapse leaves unpaid. In the five-week
 * partial shutdown of 2018-19 about a quarter of discretionary appropriations
 * lapsed and some $18 billion of pay and purchases was delayed (CBO, The
 * Effects of the Partial Shutdown Ending in January 2019): a little over half of
 * what those appropriations spend in five weeks. The rest is excepted work, and
 * money obligated before the lapse, that goes on being paid.
 */
export declare const LAPSE_DELAYED_SHARE = 0.55;
/** How much of the line goes unpaid this week: nothing unless the government is closed. */
export declare function lapseDelayedShare(campaign: Campaign): number;
/**
 * The pay and purchases a lapse has delayed, a week on: what the week withheld
 * is added while the government is closed, and the whole of it is paid the
 * first week it is open again, as the law has required since 2019 for the
 * people who worked or were furloughed through it.
 */
export declare function nextLapseArrears(owed: number, withheldThisWeek: number, closed: boolean): {
    readonly owed: number;
    readonly paid: number;
};
