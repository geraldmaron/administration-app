import { type Campaign, type GameDate } from "@admin/engine";
/** The span a calendar reads: from the campaign's date to its horizon, both inclusive. */
export type CalendarWindow = {
    readonly from: GameDate;
    readonly to: GameDate;
};
export declare function inWindow(window: CalendarWindow, date: GameDate): boolean;
/** Not after the horizon. A lapsed clock keeps its past date and stays on the calendar. */
export declare function beforeHorizon(window: CalendarWindow, date: GameDate): boolean;
/** "2029-03-04": sortable, and the one form every event id spells a date in. */
export declare function dateKey(date: GameDate): string;
/** The calendar date of a campaign day, counted from the oath the way the engine counts it. */
export declare function dateOfDay(campaign: Campaign, day: number): GameDate;
/**
 * The calendar date a turn-stamped deadline falls on, read through the
 * engine's own selector so the calendar and every room agree on what day a
 * week was.
 */
export declare function dateOfTurn(campaign: Campaign, turn: number): GameDate;
export declare function daysInMonth(year: number, month: number): number;
/** Whether a date names a real civil day: whole numbers, a month of twelve, a day the month has. */
export declare function isValidDate(date: GameDate): boolean;
