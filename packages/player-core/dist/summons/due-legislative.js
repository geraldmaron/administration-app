import { compareDates, DAYS_PER_TURN, daysBetween, daysFromCivil, fiscalYearEnd, fiscalYearOf, inShutdown, selectActiveAuthorizations, selectBillsAwaitingSignature, selectDateOfTurn, selectShutdown, selectSigningWindow, selectTreatiesAwaitingRatification, } from "@admin/engine";
import { dueOnDate, dueOnTurn, urgencyForDays, urgencyForWeeks, weeksUntil } from "./clock-math";
/**
 * When the clocks Congress starts come due, with nothing said about them.
 *
 * The reading half of `clocks-legislative.ts`: which record each clock is
 * running against, what it is called, and the day it lands. The prose, the
 * counsel and the door stay in the brief file, which imports these — so asking
 * whether the money runs out this week never loads the advisor.
 */
/**
 * A stopgap and a full-year bill run the same clock to different ends: one
 * expires and one comes due.
 */
export function appropriationTitle(campaign) {
    return campaign.congress.appropriation.onPriorYear
        ? "Short-term funding runs out"
        : "Government funding runs out";
}
export const SHUTDOWN_TITLE = "The government is closed";
/**
 * The day the money runs out.
 *
 * A book bought through a fiscal year ends on that year's September 30, which
 * falls inside the last week it funds; the week after is only when the doors
 * close. Dating the clock on that later week put October 6 on the Desk beside
 * the calendar's September 30 for the same money. A stopgap bought in weeks has
 * no such date, and runs out when its last week does.
 */
function appropriationLapseDate(campaign) {
    const throughTurn = campaign.congress.appropriation.throughTurn;
    const lastWeek = selectDateOfTurn(campaign, throughTurn);
    const weekAfter = selectDateOfTurn(campaign, throughTurn + 1);
    const yearEnd = fiscalYearEnd(fiscalYearOf(lastWeek));
    return compareDates(yearEnd, lastWeek) >= 0 && compareDates(yearEnd, weekAfter) < 0 ? yearEnd : weekAfter;
}
// The appropriation lapses the turn after the one it funds through
// (`Appropriation.throughTurn` is inclusive), so the clock ranks on that turn +
// 1 while its date is the day the money itself runs out.
//
// Stands down once the government has actually closed. The money running out
// and the doors closing are two readings of one fact, and they carry the same
// subject: past the grace window the shutdown below is the truer of the two.
export function appropriationDue(campaign) {
    if (inShutdown(campaign))
        return undefined;
    const lapseTurn = campaign.congress.appropriation.throughTurn + 1;
    const due = dueOnTurn(campaign, lapseTurn, urgencyForWeeks(weeksUntil(campaign, lapseTurn)), {
        subject: "appropriation",
        title: appropriationTitle(campaign),
    });
    return { ...due, dueDate: appropriationLapseDate(campaign) };
}
/**
 * The shutdown counts up, not down.
 *
 * There is no date on which a closed government reopens: it reopens when
 * Congress passes something, which is an act rather than a deadline. So the
 * only honest clock is how long it has already been.
 */
export function shutdownDue(campaign) {
    const reading = selectShutdown(campaign);
    if (reading === undefined)
        return undefined;
    return dueOnTurn(campaign, reading.begunTurn, "due", {
        subject: "appropriation",
        title: SHUTDOWN_TITLE,
    });
}
/** The bill closest to lapsing, since that is the one the week is actually about. */
export function nearestDeskBill(campaign) {
    const deadline = (bill) => daysFromCivil(selectSigningWindow(campaign, bill).deadline);
    return [...selectBillsAwaitingSignature(campaign)].sort((a, b) => deadline(a) - deadline(b))[0];
}
export function billDeskDue(campaign) {
    const bill = nearestDeskBill(campaign);
    if (bill === undefined)
        return undefined;
    const { deadline } = selectSigningWindow(campaign, bill);
    const days = daysBetween(campaign.calendar, deadline);
    return dueOnDate(campaign, deadline, days, urgencyForDays(days, DAYS_PER_TURN), {
        // The same subject the Desk's own enrolled-bill row carries: one signature,
        // one claim on the President, whichever surface says it first.
        subject: `bill:${bill.id}`,
        title: bill.title,
    });
}
export function nearestAuthorization(campaign) {
    return [...selectActiveAuthorizations(campaign)].sort((a, b) => a.expiresTurn - b.expiresTurn)[0];
}
export function aumfDue(campaign) {
    const authorization = nearestAuthorization(campaign);
    if (authorization === undefined)
        return undefined;
    return dueOnTurn(campaign, authorization.expiresTurn, urgencyForWeeks(weeksUntil(campaign, authorization.expiresTurn), 4), { subject: `aumf:${authorization.id}`, title: authorization.title });
}
export function oldestUnratified(campaign) {
    return [...selectTreatiesAwaitingRatification(campaign)].sort((a, b) => a.signedTurn - b.signedTurn)[0];
}
/** Weeks a signed treaty has been waiting on a Senate that has no deadline to act by. */
export function treatyWaiting(campaign, treaty) {
    return campaign.turn - treaty.signedTurn;
}
/** How long the Senate may sit on a treaty before the wait is itself the reading. */
const TREATY_PATIENCE_TURNS = 4;
/**
 * Ratification has no statutory deadline, so this clock counts up rather than
 * down. A treaty the Senate never takes up is a real and specific failure — the
 * counterpart signed something the United States has not honored — and the only
 * honest reading of it is how long it has been sitting.
 */
export function treatyDue(campaign) {
    const treaty = oldestUnratified(campaign);
    if (treaty === undefined)
        return undefined;
    const waiting = treatyWaiting(campaign, treaty);
    return dueOnTurn(campaign, treaty.signedTurn, waiting >= TREATY_PATIENCE_TURNS ? "closing" : "standing", {
        subject: `treaty:${treaty.id}`,
        title: treaty.title,
    });
}
