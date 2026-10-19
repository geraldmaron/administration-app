/**
 * Pump and grocery stay readings of an index. They do not write inflation.
 */
import { describe, expect, it } from "vitest";
import { openingCommodityIndex } from "./commodities.js";
import { groceryCpiPoints, groceryIndex, pumpPrice } from "./household-prices.js";

describe("household prices", () => {
  it("prices the gallon at 3.10 when crude is at its anchor", () => {
    expect(pumpPrice(1)).toBe(3.1);
  });

  it("lifts the gallon by the crude share times the index gap", () => {
    const crudeIndex = 74 / 69;
    const gap = crudeIndex - 1;
    const higherBy = pumpPrice(crudeIndex) - pumpPrice(1);
    expect(higherBy).toBeCloseTo(3.1 * 0.514 * gap, 12);
  });

  it("holds the grocery bill at 1 when grain is at its anchor", () => {
    expect(groceryIndex(1)).toBe(1);
  });

  it("moves the grocery bill by the farm and crop shares of a grain shock", () => {
    expect(groceryIndex(1.5)).toBe(1 + 0.185 * 0.37 * 0.5);
  });

  it("uses the mean of the wheat, corn and soybean opening indexes when none is passed", () => {
    const grain = (openingCommodityIndex("wheat") + openingCommodityIndex("corn") + openingCommodityIndex("soybeans")) / 3;
    expect(groceryIndex()).toBe(groceryIndex(grain));
  });

  it("turns a 50 percent grain shock into food-at-home CPI points", () => {
    const billMove = groceryIndex(1.5) - 1;
    expect(groceryCpiPoints(1.5)).toBe(billMove * 100 * 0.08325);
  });
});

describe("household readings on a running market", () => {
  it("draws the pump a week ahead of the crude it has already bought, and names a sharp rise as a shock", async () => {
    const { foundedForBalance } = await import("./balance-harness.js");
    const { pumpPriceSeries, pumpShock, oathPumpPrice } = await import("./household-prices.js");
    const { referenceIndex } = await import("./commodity-registry.js");
    const { campaign } = foundedForBalance("household-readings", "democrat", {}, { carriedWorld: false });
    const reference = referenceIndex("crude");
    const series = [...Array.from({ length: 8 }, () => reference), ...Array.from({ length: 8 }, () => reference * 1.5)];
    const running = { ...campaign, markets: { commodities: { crude: { index: reference * 1.5, anchorUsd: 69, series, norm: reference, inventory: 0.8 } }, equity: { level: 1, series: [] } } };
    const points = pumpPriceSeries(running);
    expect(points.at(-1)?.ahead).toBe(true);
    expect(points.filter((point) => point.ahead)).toHaveLength(1);
    expect(points[0]?.value).toBeCloseTo(oathPumpPrice(), 9);
    expect(pumpShock(running)).toBe(true);
    expect(pumpShock(campaign)).toBe(false);
  });

  it("numbers each point by its week of the term once the record has dropped its oldest weeks", async () => {
    const { foundedForBalance } = await import("./balance-harness.js");
    const { pumpPriceSeries } = await import("./household-prices.js");
    const { referenceIndex } = await import("./commodity-registry.js");
    const { EQUITY_SERIES_WINDOW } = await import("./state-world.js");
    const { campaign } = foundedForBalance("household-readings", "democrat", {}, { carriedWorld: false });
    const reference = referenceIndex("crude");
    const series = Array.from({ length: EQUITY_SERIES_WINDOW }, () => reference);
    const turn = EQUITY_SERIES_WINDOW + 51;
    const late = { ...campaign, turn, markets: { commodities: { crude: { index: reference, anchorUsd: 69, series, norm: reference, inventory: 0.8 } }, equity: { level: 1, series: [] } } };
    const points = pumpPriceSeries(late);
    const now = points.filter((point) => !point.ahead).at(-1)!;
    expect(now.week).toBe(turn - 1);
    expect(points[0]!.week).toBe(turn - 1 - EQUITY_SERIES_WINDOW);
  });
});
