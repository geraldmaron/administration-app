import { describe, expect, it } from "vitest";
import {
  DEFAULT_PACE,
  PACE_LADDER,
  compoundRate,
  elapsedDays,
  scaleRate,
  turnsFor,
  weeksFor,
} from "./pace.js";
import { TURNS_PER_YEAR } from "./pace.js";

describe("PACE_LADDER", () => {
  it("carries exactly the three declared rungs", () => {
    expect(Object.keys(PACE_LADDER).sort()).toEqual(["biweekly", "monthly", "weekly"]);
  });

  it("is weekly by default, so an unfounded pace matches today's game", () => {
    expect(DEFAULT_PACE).toBe("weekly");
  });

  it.each([
    ["weekly", 7, 52],
    ["biweekly", 14, 26],
    ["monthly", 28, 13],
  ] as const)("%s: %i days/turn, %i turns/year", (id, daysPerTurn, turnsPerYear) => {
    const pace = PACE_LADDER[id];
    expect(pace.id).toBe(id);
    expect(pace.daysPerTurn).toBe(daysPerTurn);
    expect(pace.turnsPerYear).toBe(turnsPerYear);
  });

  it("carries a paceFactor of daysPerTurn / 7, 1 at weekly", () => {
    expect(PACE_LADDER.weekly.paceFactor).toBe(1);
    expect(PACE_LADDER.biweekly.paceFactor).toBe(2);
    expect(PACE_LADDER.monthly.paceFactor).toBe(4);
  });

  // A per-year rate divided into turns must stay a whole number at every rung,
  // or a recurrence authored as "every year" would fall between two turns.
  it("keeps a year a whole number of turns at every rung", () => {
    for (const pace of Object.values(PACE_LADDER)) {
      expect(Number.isInteger(pace.turnsPerYear)).toBe(true);
    }
  });
});

describe("turnsFor", () => {
  it("converts a fiction-day duration to the turn count at each pace", () => {
    expect(turnsFor(42, PACE_LADDER.weekly)).toBe(6);
    expect(turnsFor(42, PACE_LADDER.biweekly)).toBe(3);
    expect(turnsFor(42, PACE_LADDER.monthly)).toBe(2);
  });

  it("rounds a partial turn up rather than down", () => {
    // 45 fiction-days is 6.43 weekly turns; a boundary reached mid-turn
    // must still count as reached, not as one turn early.
    expect(turnsFor(45, PACE_LADDER.weekly)).toBe(7);
  });

  it("floors at one turn even for a duration shorter than a single turn", () => {
    expect(turnsFor(1, PACE_LADDER.monthly)).toBe(1);
    expect(turnsFor(0, PACE_LADDER.weekly)).toBe(1);
  });

  // Every clock in the engine converts through this one function, and none of
  // them threads a pace: a campaign has one turn granularity, so a caller that
  // names none gets it rather than having to know what a turn is.
  it("converts at the campaign's own rung when no pace is named", () => {
    expect(turnsFor(30)).toBe(turnsFor(30, PACE_LADDER[DEFAULT_PACE]));
    expect(turnsFor(30)).toBe(5);
    expect(turnsFor(0)).toBe(1);
    expect(TURNS_PER_YEAR).toBe(PACE_LADDER[DEFAULT_PACE].turnsPerYear);
  });
});

describe("weeksFor", () => {
  it("names its rounding, because the three readings of one span disagree", () => {
    expect(weeksFor(6, "floor")).toBe(0);
    expect(weeksFor(9, "ceil")).toBe(2);
    expect(weeksFor(10, "round")).toBe(1);
    expect(weeksFor(11, "round")).toBe(2);
  });

  it("reads a whole number of weeks the same way under every rounding", () => {
    for (const rounding of ["floor", "ceil", "round"] as const) expect(weeksFor(21, rounding)).toBe(3);
  });

  it("never reports a negative zero", () => {
    expect(Object.is(weeksFor(-3, "ceil"), -0)).toBe(false);
  });

  it("converts at the campaign's own rung when no pace is named", () => {
    expect(weeksFor(28, "floor")).toBe(weeksFor(28, "floor", PACE_LADDER[DEFAULT_PACE]));
    expect(weeksFor(28, "floor", PACE_LADDER.biweekly)).toBe(2);
  });
});

describe("elapsedDays", () => {
  it("round-trips against turnsFor at a turn boundary", () => {
    for (const pace of Object.values(PACE_LADDER)) {
      const days = 42;
      const turns = turnsFor(days, pace);
      expect(elapsedDays(turns, pace)).toBeGreaterThanOrEqual(days);
    }
  });

  it("scales linearly with daysPerTurn", () => {
    expect(elapsedDays(10, PACE_LADDER.weekly)).toBe(70);
    expect(elapsedDays(10, PACE_LADDER.biweekly)).toBe(140);
    expect(elapsedDays(10, PACE_LADDER.monthly)).toBe(280);
  });

  it("reads zero fiction-days at turn zero, at every pace", () => {
    for (const pace of Object.values(PACE_LADDER)) {
      expect(elapsedDays(0, pace)).toBe(0);
    }
  });

  it("is the inverse of weeksFor on whole weeks, at the default rung", () => {
    expect(weeksFor(elapsedDays(9), "floor")).toBe(9);
  });
});

describe("scaleRate", () => {
  it("is the identity at weekly, since paceFactor is 1", () => {
    expect(scaleRate(0.02, PACE_LADDER.weekly)).toBe(0.02);
  });

  it("scales linearly with paceFactor at the coarser rungs", () => {
    expect(scaleRate(0.02, PACE_LADDER.biweekly)).toBeCloseTo(0.04, 10);
    expect(scaleRate(0.02, PACE_LADDER.monthly)).toBeCloseTo(0.08, 10);
  });
});

describe("compoundRate", () => {
  it("is the identity at weekly, since paceFactor is 1", () => {
    expect(compoundRate(0.12, PACE_LADDER.weekly)).toBeCloseTo(0.12, 10);
  });

  it("recompounds rather than scaling linearly, staying inside (0, 1)", () => {
    const compounded = compoundRate(0.12, PACE_LADDER.monthly);
    // A linear scale would give 0.48; recompounding gives less, because a
    // grudge that cools 12% a week does not cool 48% in a fictional month.
    expect(compounded).toBeLessThan(0.12 * 4);
    expect(compounded).toBeGreaterThan(0);
    expect(compounded).toBeLessThan(1);
  });

  it("never drives a bounded rate at or past 1, even for a rate close to 1", () => {
    const compounded = compoundRate(0.99, PACE_LADDER.monthly);
    expect(compounded).toBeLessThan(1);
  });

  it("compounding four weekly applications matches one paceFactor-4 recompound", () => {
    const perWeek = 0.05;
    const fourWeeksLinear = 1 - Math.pow(1 - perWeek, 4);
    expect(compoundRate(perWeek, PACE_LADDER.monthly)).toBeCloseTo(fourWeeksLinear, 10);
  });
});
