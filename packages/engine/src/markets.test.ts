/**
 * Equity index weights and the crash boundary at an 8 percent drop.
 */
import { describe, expect, it } from "vitest";
import { equityIndex, marketCrash } from "./markets.js";

describe("markets", () => {
  it("holds the index at 1 when every input is zero", () => {
    expect(equityIndex({ growthSurprise: 0, cycleDrag: 0, uncertainty: 0, commodityShock: 0 })).toBe(1);
  });

  it("treats a drop to 0.92 as a crash and a drop to 0.93 as none", () => {
    expect(marketCrash(1, 0.92)).toBe(true);
    expect(marketCrash(1, 0.93)).toBe(false);
  });
});

describe("the weekly index", () => {
  it("closes part of the way to its fair level and keeps a bounded series", async () => {
    const { foundedForBalance } = await import("./balance-harness.js");
    const { nextEquity, selectEquitySeries } = await import("./markets.js");
    const { EQUITY_SERIES_WINDOW } = await import("./state-world.js");
    const { campaign } = foundedForBalance("equity-week", "democrat", {}, { carriedWorld: false });
    const week = nextEquity(campaign, {});
    expect(week.series).toEqual([week.level]);
    expect(Math.abs(week.level - 1)).toBeLessThan(0.05);
    const full = { ...campaign, markets: { commodities: {}, equity: { level: 1, series: Array.from({ length: EQUITY_SERIES_WINDOW }, () => 1) } } };
    expect(nextEquity(full, {}).series).toHaveLength(EQUITY_SERIES_WINDOW);
    expect(selectEquitySeries(campaign)).toEqual([1]);
  });

  it("reads a crash only in the week the index fell past the line", async () => {
    const { foundedForBalance } = await import("./balance-harness.js");
    const { selectMarketShock } = await import("./markets.js");
    const { campaign } = foundedForBalance("equity-crash", "democrat", {}, { carriedWorld: false });
    const crashed = { ...campaign, markets: { commodities: {}, equity: { level: 0.9, series: [1, 1, 0.9] } } };
    expect(selectMarketShock(crashed)?.drop).toBeCloseTo(0.1, 9);
    const after = { ...campaign, markets: { commodities: {}, equity: { level: 0.9, series: [1, 0.9, 0.9] } } };
    expect(selectMarketShock(after)).toBeUndefined();
  });
});
