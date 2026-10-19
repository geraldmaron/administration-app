import { describe, expect, it } from "vitest";
import { worldDataset, type NationId } from "@admin/world";
import { addDays, CAMPAIGN_OPENING_DATE, weekdayOf } from "./clock.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { macroDriftPhase } from "./macro.js";
import { macroStep } from "./macro-drivers.js";
import { gapBetween, openingMacroState, policyRule, selectMacroState, US_NEUTRAL_REAL_RATE } from "./macro-state.js";
import { DAYS_PER_TURN } from "./turn-clock.js";
import { fedPressure, fedRule, fedWeights, fomcDecisionInWeekEnding, isFomcDecision, leanOnFed, type FedRuleInput } from "./monetary.js";
import { NO_RESTING_OFFSET } from "./policy-stats.js";
import type { Campaign, GameDate } from "./state.js";

function thursdayInWindow(year: number, month: number): GameDate {
  for (let day = 15; day <= 21; day += 1) {
    const date = { year, month, day };
    if (weekdayOf(date) === 4) return date;
  }
  throw new Error(`no Thursday from the 15th through the 21st in ${year}-${month}`);
}

const decision = thursdayInWindow(2026, 3);

const quiet: FedRuleInput = {
  expectedInflation: 0.02,
  inflation: 0.04,
  unemployment: 0.05,
  policyRate: 0.0419,
  date: { year: 2026, month: 2, day: 18 },
};

describe("fedWeights", () => {
  it("starts even, and a tilt of a tenth moves inflation up and unemployment down by that tenth", () => {
    expect(fedWeights(0)).toEqual({ inflation: 0.5, unemployment: 0.5 });
    const tilted = fedWeights(0.1);
    expect(tilted.inflation - 0.5).toBeCloseTo(0.1, 9);
    expect(0.5 - tilted.unemployment).toBeCloseTo(0.1, 9);
    expect(tilted.inflation).toBeGreaterThan(0);
    expect(tilted.unemployment).toBeGreaterThan(0);
  });
});

describe("isFomcDecision", () => {
  it("is the Thursday from the 15th through the 21st in a planning month", () => {
    expect(isFomcDecision(decision)).toBe(true);
    expect(decision.day).toBeGreaterThanOrEqual(15);
    expect(decision.day).toBeLessThanOrEqual(21);
    expect(isFomcDecision({ year: 2026, month: 2, day: decision.day })).toBe(false);
    expect(isFomcDecision({ ...decision, day: decision.day === 15 ? 16 : decision.day - 1 })).toBe(false);
  });
});

describe("fedRule", () => {
  it("returns the current policy rate on a week that is not a decision day", () => {
    expect(isFomcDecision(quiet.date)).toBe(false);
    expect(fedRule(quiet)).toBe(quiet.policyRate);
    expect(fedRule(quiet)).toBe(fedRule(quiet));
  });

  it("sets a higher rate when inflation is above the target and unemployment is at the benchmark", () => {
    const shared = {
      expectedInflation: 0.02,
      unemployment: 0.05,
      policyRate: 0.03,
      date: decision,
    };
    const hot = fedRule({ ...shared, inflation: 0.04 });
    const atTarget = fedRule({ ...shared, inflation: 0.02 });
    expect(hot).toBeGreaterThan(atTarget);
    expect(hot - atTarget).toBeCloseTo(0.01, 9);
    expect(fedRule({ ...shared, inflation: 0.04 })).toBe(hot);
  });

  it("sets a lower rate when the labor market is slacker than full employment", () => {
    const shared = {
      expectedInflation: 0.02,
      inflation: 0.02,
      policyRate: 0.03,
      date: decision,
    };
    const slack = fedRule({ ...shared, unemployment: 0.07 });
    const full = fedRule({ ...shared, unemployment: 0.05 });
    expect(slack).toBeLessThan(full);
    expect(full - slack).toBeCloseTo(0.01, 9);
  });

  it("floors a decision-day rule at zero", () => {
    // Deep deflation at full employment, which is the only shape that takes the
    // rule below the floor once both halves of the mandate lean the same way.
    expect(
      fedRule({
        expectedInflation: -0.05,
        inflation: -0.1,
        unemployment: 0.05,
        policyRate: 0.05,
        date: decision,
      }),
    ).toBe(0);
  });
});

describe("leanOnFed", () => {
  it("adds at most five hundredths to the tilt and a starting premium of 25 basis points", () => {
    expect(leanOnFed(0, 0)).toEqual({ tilt: 0, premium: 0 });
    expect(leanOnFed(0, 1).tilt).toBeCloseTo(0.05, 9);
    expect(leanOnFed(0, -1).tilt).toBeCloseTo(-0.05, 9);
    expect(leanOnFed(0, 1).premium).toBeCloseTo(0.0025, 9);
    expect(leanOnFed(0, -1).premium).toBeCloseTo(0.0025, 9);
  });
});

describe("fedPressure", () => {
  it("reads 1 or -1, treats a boolean true as 1, and otherwise stays at 0", () => {
    expect(fedPressure({ "founding-complete": true, "fed-pressure": true })).toBe(1);
    expect(fedPressure({ "founding-complete": true, "fed-pressure": false })).toBe(0);
    expect(fedPressure({ "founding-complete": true, "fed-pressure": 1 })).toBe(1);
    expect(fedPressure({ "founding-complete": true, "fed-pressure": -1 })).toBe(-1);
    expect(fedPressure({ "founding-complete": true })).toBe(0);
    expect(fedPressure(undefined)).toBe(0);
  });
});

describe("macroStep", () => {
  it("keeps a nation that is not the founding nation on the reduced-form rule", () => {
    const campaign = buildCampaign();
    const nation = "ALP" as NationId;
    const runtime = campaign.nations[nation]!;
    const player = campaign.founding.nation;
    const state = campaign.macro?.[nation] ?? openingMacroState(runtime, player);
    const gap = gapBetween(runtime.stats.economy.gdp, state.potential);
    const expected = policyRule(runtime, player, state.expectedInflation, runtime.stats.economy.inflation, gap);
    const step = macroStep(campaign, runtime, nation, NO_RESTING_OFFSET);
    expect(step.rule).toBe(expected);
    expect(macroStep(campaign, runtime, nation, NO_RESTING_OFFSET).rule).toBe(step.rule);
  });
});

// The rule was wired, unit-tested on a hand-built Thursday, and dead: every
// assertion above passes on a date the simulation never produces, and for four
// revisions the United States ran on one policy rate forever. These two hold the
// reachability itself — one on the dates a week is actually read on, one on the
// rate a running campaign actually produces — so the body cannot go dead again
// while its unit tests stay green.
describe("the rule is neutral on the economy the country was founded on", () => {
  it("decides the rate the reduced form opens the country on, so its first decision moves nothing", () => {
    // The shipped dataset, not a fixture: the intercept is written against these
    // figures, and this is what fails if either the dataset or the statutory
    // benchmarks move and the intercept does not. A rule anchored a point off
    // reprices every week of interest, the books and the ten-year yield, and
    // nothing else in the tree would say so.
    const authored = worldDataset.nations.find((entry) => entry.id === ("USA" as NationId))!.stats.economy;
    const decided = fedRule({
      expectedInflation: authored.inflation,
      inflation: authored.inflation,
      unemployment: authored.unemployment,
      policyRate: 0,
      // A decision day, so the rule's own body answers rather than the hold.
      date: decision,
    });
    expect(decided).toBeCloseTo(US_NEUTRAL_REAL_RATE + authored.inflation, 9);
  });
});

describe("the rule is reached on the days a campaign actually runs", () => {
  const YEARS = 2;
  const WEEKS = YEARS * 52;
  /** Eight planning months a year, less the one the first window may open before. */
  const LEAST_DECISIONS = YEARS * 8 - 1;

  it("reaches a decision week from the real oath, on every weekday a week can be read on", () => {
    // Every offset inside the week, because which one the law is read on is set
    // by the weekday the oath fell on and by which office day the macro group
    // runs in — neither of which this module may assume.
    for (let offset = 0; offset < DAYS_PER_TURN; offset += 1) {
      let reached = 0;
      const weekdays = new Set<number>();
      for (let week = 0; week < WEEKS; week += 1) {
        const date = addDays(CAMPAIGN_OPENING_DATE, week * DAYS_PER_TURN + offset);
        weekdays.add(weekdayOf(date));
        if (fomcDecisionInWeekEnding(date)) reached += 1;
      }
      expect(weekdays.size, `offset ${offset} should read one weekday`).toBe(1);
      expect(reached, `offset ${offset} reached no decision week`).toBeGreaterThanOrEqual(LEAST_DECISIONS);
      expect(reached).toBeLessThanOrEqual(YEARS * 8 + 1);
    }
  });

  it("moves the United States policy rate over two years of the law", () => {
    const rates = new Set<number>();
    let working: Campaign = buildCampaign();
    for (let week = 0; week < WEEKS; week += 1) {
      working = macroDriftPhase(working).reduce((state, packet) => apply(state, packet), working);
      working = { ...working, turn: working.turn + 1, calendar: addDays(working.calendar, DAYS_PER_TURN) };
      rates.add(selectMacroState(working, working.founding.nation)!.policyRate);
    }
    // One value over two years is the defect, whatever that value is.
    expect(rates.size).toBeGreaterThanOrEqual(LEAST_DECISIONS);
  });
});
