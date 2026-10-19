import { addDays, compareDates, daysBetween, selectDateOfTurn, selectTurnOfDate, weekdayOf } from "./clock.js";
import { selectBillsOnTheDesk } from "./state-selectors.js";
// The President's ten days with an enrolled bill.
//
// Article I, Section 7: a bill not returned "within ten Days (Sundays
// excepted) after it shall have been presented" becomes law as if signed. The
// clock starts when the bill reaches the desk, not when it was introduced: a
// measure that spent a month in markup has not used a day of the President's
// window, and counting from introduction lapsed it the week it arrived.
//
// The pocket veto is not modeled. It needs Congress to adjourn and prevent the
// return, and the game does not adjourn Congress; with no adjournment, an
// unsigned bill always becomes law.
/** The days the Constitution gives, not counting Sundays. */
export const SIGNING_DAYS = 10;
/**
 * The day a bill's business is dated to.
 *
 * The office-day advance runs the legislative phases on a real weekday, and that
 * day is the calendar. A caller ticking a whole week at once runs them with the
 * calendar still on the week's opening, and there the week's own close is the
 * honest date: that is the latest the sitting could have been.
 */
export function sittingDate(campaign) {
    const opened = selectDateOfTurn(campaign, campaign.turn);
    if (compareDates(campaign.calendar, opened) > 0)
        return campaign.calendar;
    return selectDateOfTurn(campaign, campaign.turn + 1);
}
/**
 * When the bill reached the desk. A desk bill written without a presentment
 * date reads as presented at the close of the week it was introduced, which is
 * when a measure discharged straight to the desk is presented.
 */
export function presentmentDate(campaign, bill) {
    return bill.presentedOn ?? selectDateOfTurn(campaign, bill.introducedTurn + 1);
}
/** The last day of the window: ten days after presentment, Sundays skipped. */
export function signingDeadline(presented) {
    let date = presented;
    let counted = 0;
    while (counted < SIGNING_DAYS) {
        date = addDays(date, 1);
        if (weekdayOf(date) !== 0)
            counted += 1;
    }
    return date;
}
export function selectSigningWindow(campaign, bill) {
    const presentedOn = presentmentDate(campaign, bill);
    const deadline = signingDeadline(presentedOn);
    return {
        presentedOn,
        deadline,
        lapseTurn: selectTurnOfDate(campaign, deadline),
        windowDays: daysBetween(presentedOn, deadline),
    };
}
/** Whether the window closed before `today`: the deadline itself is still the President's. */
export function signingWindowClosed(campaign, bill, today) {
    return compareDates(today, signingDeadline(presentmentDate(campaign, bill))) > 0;
}
/**
 * The enrolled bills the President can still sign or return. A bill past its
 * tenth day is law in waiting: it stays on the desk only until the chamber's
 * next sitting records it, and nothing the President does reaches it.
 */
export function selectBillsAwaitingSignature(campaign) {
    return selectBillsOnTheDesk(campaign).filter((bill) => !signingWindowClosed(campaign, bill, campaign.calendar));
}
