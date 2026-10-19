import type { GameDate } from "./state.js";
export declare function isLeapYear(year: number): boolean;
export declare function daysInMonth(year: number, month: number): number;
export declare function advanceCalendar(date: GameDate, days: number): GameDate;
