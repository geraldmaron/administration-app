export type ElectionBasis = "none" | "carried" | "projected" | "estimated";
export type ElectionConfidence = "high" | "medium" | "low";
export type ElectionPrecision = "n/a" | "month" | "year" | "exact_date";
export type ElectionWindowDate = {
    readonly year: number;
    readonly month: number;
    readonly day?: number;
};
export type ElectionCalendarRow = {
    readonly nationId: string;
    readonly leaderSeat: string;
    readonly electionType: string;
    readonly fixedOrFlexible: string;
    readonly nextEvent: string;
    readonly when: ElectionWindowDate | null;
    readonly precision: ElectionPrecision;
    readonly termLengthYears: string;
    readonly basis: ElectionBasis;
    readonly confidence: ElectionConfidence;
    readonly preOathCrossCheck: string;
};
export declare const ELECTION_CALENDAR: readonly ElectionCalendarRow[];
export declare function calendarRow(nationId: string): ElectionCalendarRow | null;
export declare function scheduledSelection(nationId: string): ElectionCalendarRow | null;
/** The oath the calendar's pre-oath column is measured against. */
export declare const CALENDAR_OATH: Required<ElectionWindowDate>;
/** The day a month-precision selection is held on. A planning value, not the table's. */
export declare const MONTH_PRECISION_DAY = 15;
/** The month a year-precision selection is held in. A planning value, not the table's. */
export declare const YEAR_PRECISION_MONTH = 6;
/**
 * How far the row can be taken as a date: a carried or projected row is a
 * scheduling fact, an estimated row is the researcher's estimate, and a
 * conflict row is two sources that disagree. A simulation holds all three on
 * their dates; a report lists the last two apart.
 */
export type SelectionStanding = "scheduled" | "estimated" | "conflict";
export type DatedSelection = {
    readonly nationId: string;
    readonly date: Required<ElectionWindowDate>;
    readonly standing: SelectionStanding;
    /** The day, or the day and month, came from the precision rule rather than the table. */
    readonly planningDay: boolean;
};
/** The first whole number in the term cell, or null where the table gives none. */
export declare function termYears(nationId: string): number | null;
/**
 * The selection the table puts between its own date and the oath, if any.
 *
 * Read off the pre-oath column, which is the leader table's own next date. A
 * January 2029 row at month precision falls on the fifteenth under the day
 * rule, which is before the oath: that side of the line is the rule's choice,
 * not the table's, and the selection says so through `planningDay`.
 */
export declare function preOathSelection(nationId: string): DatedSelection | null;
/**
 * The first selection the table puts on or after the oath.
 *
 * A row the table leaves without a date in the window ("none in window", "no
 * reliable date") has none. A row that names only a pre-oath date is carried
 * one term past it, and keeps the row's own standing.
 */
export declare function windowSelection(nationId: string): DatedSelection | null;
