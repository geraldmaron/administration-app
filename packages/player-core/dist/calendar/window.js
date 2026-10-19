import { addDays, campaignFoundingDate, compareDates, selectDateOfTurn } from "@admin/engine";
export function inWindow(window, date) {
    return compareDates(date, window.from) >= 0 && compareDates(date, window.to) <= 0;
}
/** Not after the horizon. A lapsed clock keeps its past date and stays on the calendar. */
export function beforeHorizon(window, date) {
    return compareDates(date, window.to) <= 0;
}
/** "2029-03-04": sortable, and the one form every event id spells a date in. */
export function dateKey(date) {
    return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
/** The calendar date of a campaign day, counted from the oath the way the engine counts it. */
export function dateOfDay(campaign, day) {
    return addDays(campaignFoundingDate(campaign), day);
}
/**
 * The calendar date a turn-stamped deadline falls on, read through the
 * engine's own selector so the calendar and every room agree on what day a
 * week was.
 */
export function dateOfTurn(campaign, turn) {
    return selectDateOfTurn(campaign, turn);
}
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
export function daysInMonth(year, month) {
    if (month === 2 && isLeapYear(year))
        return 29;
    return DAYS_IN_MONTH[month - 1] ?? 0;
}
/** Whether a date names a real civil day: whole numbers, a month of twelve, a day the month has. */
export function isValidDate(date) {
    const whole = Number.isInteger(date.year) && Number.isInteger(date.month) && Number.isInteger(date.day);
    return whole && date.month >= 1 && date.month <= 12 && date.day >= 1 && date.day <= daysInMonth(date.year, date.month);
}
