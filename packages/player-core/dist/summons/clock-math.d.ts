import { type Campaign, type GameDate } from "@admin/engine";
import type { MetricStance } from "../format/figures";
import type { SummonsDue, SummonsUrgency } from "./types";
export declare function weeksUntil(campaign: Campaign, dueTurn: number): number;
export declare function daysUntil(campaign: Campaign, dueDay: number): number;
export declare function urgencyForWeeks(weeks: number, closingWithin?: number): SummonsUrgency;
export declare function urgencyForDays(days: number, closingWithin?: number): SummonsUrgency;
/**
 * How a clock reads on the stance scale every other figure in the app uses.
 *
 * A lapsed obligation is adverse rather than merely cautionary: the
 * consequence has already begun, and softening it would put a summons below a
 * press number on the same screen.
 */
export declare function stanceForUrgency(urgency: SummonsUrgency): MetricStance;
export declare function weeksPhrase(weeks: number): string;
export declare function daysPhrase(days: number): string;
/** A span of weeks in the words the rest of the app counts in. */
export declare function weekCount(weeks: number): string;
/**
 * A span of days in the app's words: days while a day is still worth
 * counting, weeks past three of them, the same cut the deadline tracks use.
 */
export declare function dayCount(days: number): string;
/** The countdown as the folio's headline figure: a bare count, in the unit the clock runs in. */
export declare function weeksFigure(weeks: number): string;
export declare function daysFigure(days: number): string;
export declare function weekLabel(turn: number): string;
/**
 * The calendar day a turn fell on, in the one date format the player app
 * writes — never the raw turn ordinal `weekLabel` prints, which asks a
 * player to already know how long a turn is before "Week 61" means anything
 * as a deadline.
 */
export declare function dateLabel(campaign: Campaign, turn: number): string;
/** What a clock is materially about and what it is called, said once per reading. */
type SummonsSubject = {
    readonly subject: string;
    readonly title: string;
};
/**
 * A clock the engine keeps in turns.
 *
 * `dueDate` is the day that turn falls on, taken from the engine's own
 * turn-to-date selector rather than reconstructed here, so a folio and a
 * deadline can never disagree about what day week nine was.
 */
export declare function dueOnTurn(campaign: Campaign, dueTurn: number, urgency: SummonsUrgency, about: SummonsSubject): SummonsDue;
/**
 * A clock the engine keeps in days — the war-powers window, an acting
 * appointment, a nomination stage.
 *
 * The day count is the record; the turn ordinal is derived from it and kept
 * only so that one ranking scale spans both kinds of clock. This is the single
 * place in the summons layer where a day count becomes a week, which is what
 * stops a report owed in two days and one owed in six from being the same
 * figure on four separate screens.
 */
export declare function dueInDays(campaign: Campaign, days: number, urgency: SummonsUrgency, about: SummonsSubject): SummonsDue;
/** A clock the engine already keeps as a calendar date — a constitutional milestone. */
export declare function dueOnDate(campaign: Campaign, date: GameDate, daysAway: number, urgency: SummonsUrgency, about: SummonsSubject): SummonsDue;
export {};
