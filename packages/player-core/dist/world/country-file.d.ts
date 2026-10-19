/** A dated event's distance in whole months, and the span it closes when the table states one plainly. */
export type SelectionCountdown = {
    readonly monthsLeft: number;
    readonly termMonths?: number;
};
/**
 * How many months until a foreign selection, from the calendar's month to the
 * table's, and the term it closes when the table gives a plain whole number of
 * years. A term the table qualifies ("3-4 (disputed)", "4 (unverified)") gives
 * no denominator, and neither does one the countdown already exceeds, because
 * a ring drawn against either would claim a span nobody measured.
 */
export declare function selectionCountdown(today: {
    readonly year: number;
    readonly month: number;
}, when: {
    readonly year: number;
    readonly month: number;
}, termLengthYears: string): SelectionCountdown;
