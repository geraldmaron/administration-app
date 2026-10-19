import type { AttentionUrgency, GameDate } from "@admin/engine";
import type { SummonsKind } from "../summons/types";
/**
 * One dated thing on the President's calendar.
 *
 * Composed on read from what the campaign already holds; nothing here is
 * stored, so a calendar can never fall out of step with the clocks behind it.
 */
export type CalendarEventKind = 
/** A statutory or constitutional deadline the President can answer. */
"deadline"
/** An institutional clock the summons layer runs, read off its due half. */
 | "clock"
/** A federal or state election in the United States. */
 | "election"
/** A scheduled selection abroad. */
 | "foreign-election"
/** A step in a federal case: the next ruling, an argument, an opinion target. */
 | "court"
/** Congress's own dates: a bill's signing window, the new Congress. */
 | "legislative"
/** A fixed-term seat falling open for a nomination. */
 | "appointment"
/** A declared emergency's anniversary or a finding's expiry. */
 | "emergency"
/** A War Powers Resolution window. */
 | "war-powers"
/** A date in the term itself: the oath, the hundredth day, the fiscal year. */
 | "milestone"
/** An answer the President is waiting on: a finding, a vote, an operation's first report. */
 | "pending";
/**
 * The engine's own three words for whether a matter stops time, so a calendar
 * row and a desk row rank on the same scale.
 */
export type CalendarUrgency = AttentionUrgency;
export type EntityRefKind = "person" | "nation" | "state" | "bill" | "case" | "institution" | "war" | "order";
export type EntityRef = {
    readonly kind: EntityRefKind;
    readonly id: string;
};
export type CalendarEvent = {
    /** Stable across reads of the same campaign, so read state can key on it. */
    readonly id: string;
    readonly date: GameDate;
    readonly kind: CalendarEventKind;
    readonly title: string;
    readonly detail?: string;
    readonly urgency: CalendarUrgency;
    readonly entityRefs: readonly EntityRef[];
    readonly href?: string;
    /** What happens by default if the President does nothing, where the rule says. */
    readonly lapse?: string;
    /** The statute or constitutional clause that sets the date, as a plain citation. */
    readonly authorityCite?: string;
    /**
     * The institutional clock this date is an instance of, so a surface already
     * showing that clock (the desk, the folio) can fold the date into it.
     */
    readonly summons?: SummonsKind;
};
export type CalendarOptions = {
    /**
     * How far ahead to read, in days from the campaign's date. Defaults to the
     * end of the current term. A live clock that has already lapsed is always
     * kept: an overdue obligation is still on the calendar.
     */
    readonly horizonDays?: number;
    /** Kinds to leave out, for a view that shows only part of the calendar. */
    readonly exclude?: readonly CalendarEventKind[];
};
