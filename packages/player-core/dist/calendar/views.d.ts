import { type Campaign, type GameDate, type Weekday } from "@admin/engine";
import type { CalendarEvent } from "./types";
/** Signed days from the campaign's date: negative once the date has passed. */
export declare function daysUntil(campaign: Campaign, date: GameDate): number;
export type CalendarDay = {
    readonly date: GameDate;
    /** False for the leading and trailing days that complete the first and last weeks. */
    readonly inMonth: boolean;
    readonly events: readonly CalendarEvent[];
};
export type CalendarMonth = {
    readonly year: number;
    readonly month: number;
    /** Whole weeks, seven days each, starting on `weekStartsOn`. */
    readonly weeks: readonly (readonly CalendarDay[])[];
};
/**
 * One month as a grid of whole weeks.
 *
 * The days outside the month that complete its first and last weeks carry
 * their events too, so a deadline on the first of next month is not hidden on
 * the last row of this one.
 */
export declare function calendarMonth(events: readonly CalendarEvent[], year: number, month: number, weekStartsOn?: Weekday): CalendarMonth;
export type AgendaDay = {
    readonly date: GameDate;
    readonly events: readonly CalendarEvent[];
};
/** The days from `from` that hold something, in order, across `days` days counting `from` itself. */
export declare function agenda(events: readonly CalendarEvent[], from: GameDate, days: number): readonly AgendaDay[];
export type TermMarkKind = "term-start" | "hundred-days" | "midterm-election" | "presidential-election" | "term-end";
export type TermMark = {
    readonly kind: TermMarkKind;
    readonly label: string;
    readonly date: GameDate;
    /** Where on the term the mark falls, 0 at the oath and 1 at the term's end. */
    readonly position: number;
    readonly past: boolean;
};
export type TermTimeline = {
    readonly termNumber: number;
    readonly start: GameDate;
    readonly now: GameDate;
    readonly end: GameDate;
    readonly dayOfTerm: number;
    readonly daysLeft: number;
    /** How much of the term has run, 0 to 1. */
    readonly progress: number;
    readonly marks: readonly TermMark[];
};
/** The term from oath to its last noon, with the dates it is measured by and where today stands on it. */
export declare function termTimeline(campaign: Campaign): TermTimeline;
