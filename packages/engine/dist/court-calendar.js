import { addDays, daysBetween, nthWeekdayOfMonth, selectTurnOfDate } from "./clock.js";
/** Ordinary merits arguments run in the October term; emergency applications have their own clock. */
export function scheduleSupremeArgument(campaign) {
    const earliest = addDays(campaign.calendar, 28);
    const termYear = earliest.month <= 4 ? earliest.year - 1 : earliest.year;
    const opening = nthWeekdayOfMonth(termYear, 10, 1, 1);
    const argumentDate = daysBetween(opening, earliest) > 0 ? earliest : opening;
    const argumentTurn = Math.max(campaign.turn + 1, selectTurnOfDate(campaign, argumentDate) + 1);
    const opinionTargetTurn = selectTurnOfDate(campaign, { year: termYear + 1, month: 6, day: 30 });
    const opinionTurn = Math.min(opinionTargetTurn, argumentTurn + 8);
    return { termYear, argumentTurn, opinionTurn, opinionTargetTurn, status: "scheduled" };
}
