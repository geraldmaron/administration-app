import type { GameDate } from "./state.js";

// The game calendar. Pure arithmetic only: no Date object, no wall-clock
// dependency, so turn advance stays deterministic and replayable.

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return MONTH_LENGTHS[month - 1]!;
}

export function advanceCalendar(date: GameDate, days: number): GameDate {
  let { year, month, day } = date;
  let remaining = days;
  while (remaining > 0) {
    const monthLength = daysInMonth(year, month);
    const daysLeftInMonth = monthLength - day;
    if (remaining <= daysLeftInMonth) {
      day += remaining;
      remaining = 0;
    } else {
      remaining -= daysLeftInMonth + 1;
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }
  return { year, month, day };
}
