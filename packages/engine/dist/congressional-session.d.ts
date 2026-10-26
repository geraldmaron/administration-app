import type { GameDate } from "./state.js";
/**
 * The day a Congress ends and the next convenes: January 3 of an odd year, the
 * Twentieth Amendment's date. A special message pending across it is treated
 * as sent again that day (2 U.S.C. 682(5)).
 */
export declare function newCongressConvenes(day: GameDate): boolean;
/**
 * How many days of continuous session have run since a message was
 * transmitted, as of `today`. The day of transmission is not counted, and
 * a new Congress convening restarts the count the day after it convenes.
 */
export declare function sessionDaysSince(transmitted: GameDate, today: GameDate): number;
/** The date the `days`th day of continuous session falls on, counting from a message's transmission. */
export declare function sessionDayDate(transmitted: GameDate, days: number): GameDate;
