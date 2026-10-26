import { describe, expect, it } from "vitest";
import { newCongressConvenes, sessionDayDate, sessionDaysSince } from "./congressional-session.js";

const d = (year: number, month: number, day: number) => ({ year, month, day });

describe("days of continuous session", () => {
  it("counts every day after the message", () => {
    expect(sessionDaysSince(d(2029, 2, 1), d(2029, 2, 10))).toBe(9);
  });

  it("keeps counting through a recess, because pro forma sittings keep both Houses in session", () => {
    // Presidents' Day week and the August recess through Labor Day.
    expect(sessionDaysSince(d(2029, 2, 12), d(2029, 3, 5))).toBe(21);
    expect(sessionDaysSince(d(2029, 7, 20), d(2029, 9, 15))).toBe(57);
    expect(sessionDayDate(d(2029, 3, 1), 45)).toEqual(d(2029, 4, 15));
  });

  it("restarts the count the day after a new Congress convenes", () => {
    expect(newCongressConvenes(d(2031, 1, 3))).toBe(true);
    expect(newCongressConvenes(d(2030, 1, 3))).toBe(false);
    expect(sessionDaysSince(d(2030, 12, 1), d(2031, 1, 20))).toBe(17);
    expect(sessionDayDate(d(2030, 12, 1), 10)).toEqual(d(2030, 12, 11));
    // Thirty-two days run before the Congress ends, short of forty-five: the count starts over.
    expect(sessionDayDate(d(2030, 12, 1), 45)).toEqual(d(2031, 2, 17));
  });
});
