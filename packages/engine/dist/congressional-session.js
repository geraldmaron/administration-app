import { addDays, daysBetween } from "./clock.js";
// The days both Houses are in session, for the statutes that count them.
//
// The Impoundment Control Act (2 U.S.C. 682(5)) counts "days of continuous
// session": continuity is broken only by an adjournment sine die of the
// Congress, and the days on which either House is out because of an
// adjournment of more than three days to a day certain are left out of the
// count.
//
// Under current practice neither House takes such an adjournment: through
// every recess each holds pro forma sittings at most three days apart, so no
// day is left out and the count runs on the calendar (the 2025 rescission
// package's window ran about 45 calendar days). That practice is the rule
// here. What still breaks the count is the end of a Congress: a message
// pending when the new Congress convenes is treated as sent again that day.
// Everything else the engine dates to Congress (signing windows, the
// appropriations deadline) reads the same calendar.
/**
 * The day a Congress ends and the next convenes: January 3 of an odd year, the
 * Twentieth Amendment's date. A special message pending across it is treated
 * as sent again that day (2 U.S.C. 682(5)).
 */
export function newCongressConvenes(day) {
    return day.month === 1 && day.day === 3 && day.year % 2 === 1;
}
/** The longest a count is run before it is abandoned; a session-day target is always reached long before. */
const LOOKAHEAD_DAYS = 1200;
/**
 * How many days of continuous session have run since a message was
 * transmitted, as of `today`. The day of transmission is not counted, and
 * a new Congress convening restarts the count the day after it convenes.
 */
export function sessionDaysSince(transmitted, today) {
    let counted = 0;
    const span = Math.min(daysBetween(transmitted, today), LOOKAHEAD_DAYS);
    for (let offset = 1; offset <= span; offset++) {
        counted = newCongressConvenes(addDays(transmitted, offset)) ? 0 : counted + 1;
    }
    return counted;
}
/** The date the `days`th day of continuous session falls on, counting from a message's transmission. */
export function sessionDayDate(transmitted, days) {
    let counted = 0;
    for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset++) {
        const day = addDays(transmitted, offset);
        counted = newCongressConvenes(day) ? 0 : counted + 1;
        if (counted >= days)
            return day;
    }
    throw new Error(`no ${days}th day of continuous session within ${LOOKAHEAD_DAYS} days of the message`);
}
