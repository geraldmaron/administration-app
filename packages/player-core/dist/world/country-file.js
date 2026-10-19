/**
 * How many months until a foreign selection, from the calendar's month to the
 * table's, and the term it closes when the table gives a plain whole number of
 * years. A term the table qualifies ("3-4 (disputed)", "4 (unverified)") gives
 * no denominator, and neither does one the countdown already exceeds, because
 * a ring drawn against either would claim a span nobody measured.
 */
export function selectionCountdown(today, when, termLengthYears) {
    const monthsLeft = Math.max(0, (when.year - today.year) * 12 + (when.month - today.month));
    const plain = /^\s*(\d+)\s*$/.exec(termLengthYears)?.[1];
    const termMonths = plain === undefined ? undefined : Number(plain) * 12;
    return termMonths !== undefined && termMonths > 0 && monthsLeft <= termMonths ? { monthsLeft, termMonths } : { monthsLeft };
}
