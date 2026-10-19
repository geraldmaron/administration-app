import { describe, expect, it } from "vitest";
import { NationStats, type NationId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { TERM_LIMIT, TERM_TURNS } from "./elections.js";
import { MACRO_BOUNDS } from "./macro.js";
import {
  EXPECTATIONS_HALF_LIFE_WEEKS,
  GAP_CLOSING,
  gapBetween,
  gapClosingSpeed,
  nextMacroState,
  openingMacro,
  outputGap,
  POLICY_RATE_ADJUSTMENT,
  POLICY_RATE_FLOOR,
  policyRule,
  selectMacroState,
  US_NEUTRAL_REAL_RATE,
  WORLD_NEUTRAL_REAL_RATE,
  type MacroState,
} from "./macro-state.js";

const USA = "USA" as NationId;
const { campaign: FOUNDED } = foundedForBalance("macro-state");

describe("openingMacro", () => {
  it("opens every nation at its own output with no gap, its anchor as expected inflation, and the rate at the rule", () => {
    for (const [id, state] of Object.entries(FOUNDED.macro!)) {
      const runtime = FOUNDED.nations[id as NationId]!;
      expect(state.potential, id).toBe(runtime.stats.economy.gdp);
      expect(outputGap(FOUNDED, id as NationId), id).toBe(0);
      expect(state.expectedInflation, id).toBe(runtime.base.stats.economy.inflation);
      const neutral = id === "USA" ? US_NEUTRAL_REAL_RATE : WORLD_NEUTRAL_REAL_RATE;
      expect(state.policyRate, id).toBeCloseTo(Math.max(POLICY_RATE_FLOOR, neutral + state.expectedInflation), 6);
    }
  });

  it("puts the United States' short rate at the three-month bill it was founded on", () => {
    expect(selectMacroState(FOUNDED, USA)!.policyRate).toBeCloseTo(0.0419, 3);
  });

  it("opens a record for a campaign that predates it on the economy it has, so a load opens with no gap", () => {
    const campaign = buildCampaign();
    const moved = {
      ...campaign,
      nations: {
        ...campaign.nations,
        [USA]: { ...campaign.nations[USA]!, stats: { ...campaign.nations[USA]!.stats, economy: { ...campaign.nations[USA]!.stats.economy, gdp: 123_456 } } },
      },
    };
    expect(openingMacro(moved)[USA]!.potential).toBe(123_456);
  });
});

describe("the gap", () => {
  it("is the log of output over potential: a fraction of output, never points", () => {
    expect(gapBetween(102, 100)).toBeCloseTo(Math.log(1.02), 12);
    expect(gapBetween(98, 100)).toBeLessThan(0);
    expect(gapBetween(0, 100)).toBe(0);
  });
});

describe("the policy rule", () => {
  const runtime = FOUNDED.nations[USA]!;
  const anchor = runtime.base.stats.economy.inflation;

  it("leans against inflation above the anchor and output above potential, half a point for each", () => {
    const neutral = policyRule(runtime, USA, anchor, anchor, 0);
    expect(policyRule(runtime, USA, anchor, anchor + 0.02, 0) - neutral).toBeCloseTo(0.01, 9);
    expect(policyRule(runtime, USA, anchor, anchor, -0.02) - neutral).toBeCloseTo(-0.01, 9);
  });

  it("closes a gap at full speed off the floor and at less than half the speed on it", () => {
    expect(gapClosingSpeed(0.01)).toBe(GAP_CLOSING.free);
    expect(gapClosingSpeed(-0.01)).toBe(GAP_CLOSING.atFloor);
    expect(GAP_CLOSING.atFloor).toBeLessThan(GAP_CLOSING.free / 2);
  });
});

describe("nextMacroState", () => {
  const state: MacroState = { potential: 1000, expectedInflation: 0.02, policyRate: 0.03 };

  it("compounds potential at trend by the weekly step output compounds by, so an economy at trend holds its gap", () => {
    const next = nextMacroState(state, { trendGrowth: 0.026, inflation: 0.02, rule: 0.03 });
    expect(next.potential).toBeCloseTo(1000 * (1 + 0.026 / 52), 3);
  });

  it("moves expectations half way to the inflation the public lives with in two years", () => {
    let working = state;
    for (let week = 0; week < EXPECTATIONS_HALF_LIFE_WEEKS; week++) {
      working = nextMacroState(working, { trendGrowth: 0, inflation: 0.06, rule: 0.03 });
    }
    expect(working.expectedInflation).toBeCloseTo(0.04, 3);
  });

  it("moves the rate part way toward the rule, and never below the floor", () => {
    expect(nextMacroState(state, { trendGrowth: 0, inflation: 0.02, rule: 0.05 }).policyRate).toBeCloseTo(0.03 + 0.02 * POLICY_RATE_ADJUSTMENT, 6);
    let working = state;
    for (let week = 0; week < 400; week++) working = nextMacroState(working, { trendGrowth: 0, inflation: 0.02, rule: -0.04 });
    expect(working.policyRate).toBeGreaterThanOrEqual(POLICY_RATE_FLOOR);
    expect(working.policyRate).toBeLessThan(0.0001);
  });
});

describe("the price index's bound", () => {
  it("cannot be reached in a campaign: two terms at the highest inflation the law allows stay under it", () => {
    const years = (TERM_LIMIT * TERM_TURNS) / 52;
    expect((1 + MACRO_BOUNDS.inflation.max) ** years).toBeLessThan(MACRO_BOUNDS.costOfLiving.max);
  });

  it("is the dataset schema's own bound, so a save from a hyperinflating country still parses", () => {
    const schema = NationStats.shape.economy.shape;
    expect(schema.costOfLiving.maxValue).toBe(MACRO_BOUNDS.costOfLiving.max);
    expect(schema.costOfLiving.minValue).toBe(MACRO_BOUNDS.costOfLiving.min);
    expect(schema.inflation.maxValue).toBe(MACRO_BOUNDS.inflation.max);
  });
});
