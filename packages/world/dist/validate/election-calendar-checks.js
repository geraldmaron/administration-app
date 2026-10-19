import { calendarRow, termYears, windowSelection } from "../dataset/election-calendar.js";
// What the foreign election calendar must hold: every row naming a nation on
// the roster, a date the precision it claims, and a term the seat's own
// constitution sets.
const plausibility = (path, message) => ({ kind: "plausibility", path, message });
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** A stated date is a real day in a real month, and carries a day exactly when the row claims one. */
function dateErrors(row) {
    const path = `electionCalendar.${row.nationId}`;
    const when = row.when;
    if (!when)
        return [];
    const errors = [];
    if (when.month < 1 || when.month > 12)
        errors.push(plausibility(`${path}.when`, `month ${when.month} is not a month`));
    if (when.day !== undefined && (when.day < 1 || when.day > (DAYS_IN_MONTH[when.month - 1] ?? 31))) {
        errors.push(plausibility(`${path}.when`, `day ${when.day} is not a day of month ${when.month}`));
    }
    if (row.precision === "exact_date" && when.day === undefined) {
        errors.push(plausibility(`${path}.precision`, "claims an exact date and states no day"));
    }
    if (row.precision === "month" && when.day !== undefined) {
        errors.push(plausibility(`${path}.precision`, "claims month precision and states a day"));
    }
    return errors;
}
/**
 * A selection the simulation will hold names a term it can be carried on by.
 * The window is four years, so a term outside one to ten years is a typo
 * rather than a constitution.
 */
function termErrors(row) {
    if (!windowSelection(row.nationId))
        return [];
    const years = termYears(row.nationId);
    if (years === null || (years >= 1 && years <= 10))
        return [];
    return [plausibility(`electionCalendar.${row.nationId}.termLengthYears`, `a ${years}-year term is outside any constitution on the roster`)];
}
/**
 * The calendar's rules, for every government on the roster the calendar
 * carries a row for. Whether the roster is covered whole is a fact about the
 * shipped world rather than about a dataset's shape, so a test dataset of two
 * invented nations validates, and the shipped world's coverage is held by the
 * calendar's own test.
 */
export function checkElectionCalendar(dataset) {
    return dataset.nations.flatMap((nation) => {
        const row = calendarRow(nation.id);
        if (!row)
            return [];
        if (nation.playable) {
            return [plausibility(`electionCalendar.${nation.id}`, "the President's own country is not on the foreign calendar")];
        }
        return [...dateErrors(row), ...termErrors(row)];
    });
}
