import { describe, it, expect } from "vitest";
import { advanceCalendar, daysInMonth, isLeapYear } from "./calendar.js";
describe("calendar", () => {
    it("identifies leap years per the Gregorian rule", () => {
        expect(isLeapYear(2024)).toBe(true);
        expect(isLeapYear(2023)).toBe(false);
        expect(isLeapYear(1900)).toBe(false); // divisible by 100, not 400
        expect(isLeapYear(2000)).toBe(true); // divisible by 400
    });
    it("gives February 29 days in a leap year, 28 otherwise", () => {
        expect(daysInMonth(2024, 2)).toBe(29);
        expect(daysInMonth(2023, 2)).toBe(28);
    });
    it("advances within a month without rolling over", () => {
        expect(advanceCalendar({ year: 2027, month: 1, day: 1 }, 7)).toEqual({ year: 2027, month: 1, day: 8 });
    });
    it("rolls over into the next month", () => {
        expect(advanceCalendar({ year: 2027, month: 1, day: 28 }, 7)).toEqual({ year: 2027, month: 2, day: 4 });
    });
    it("rolls over into the next year across December", () => {
        expect(advanceCalendar({ year: 2027, month: 12, day: 28 }, 7)).toEqual({ year: 2028, month: 1, day: 4 });
    });
    it("handles a leap-year February boundary", () => {
        expect(advanceCalendar({ year: 2024, month: 2, day: 27 }, 3)).toEqual({ year: 2024, month: 3, day: 1 });
    });
});
