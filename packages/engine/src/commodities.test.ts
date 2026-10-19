/**
 * Historical anchors stay measurements. Opening levels stay forecasts.
 */
import { describe, expect, it } from "vitest";
import {
  CORN_ANCHOR,
  CORN_OPENING_FORECAST,
  CRUDE_ANCHOR,
  CRUDE_OPENING_FORECAST,
  WHEAT_ANCHOR,
  WHEAT_OPENING_FORECAST,
  commodityIndex,
  openingCommodityIndex,
  producerShareAtWar,
} from "./commodities.js";

describe("commodity price anchors", () => {
  it("keeps the historical anchors at the opened figures", () => {
    expect(CRUDE_ANCHOR.usd).toBe(69);
    expect(CRUDE_ANCHOR.unit).toBe("usd_per_barrel");
    expect(CRUDE_ANCHOR.kind).toBe("historical");
    expect(WHEAT_ANCHOR.usd).toBe(5.52);
    expect(WHEAT_ANCHOR.unit).toBe("usd_per_bushel");
    expect(WHEAT_ANCHOR.kind).toBe("historical");
    expect(CORN_ANCHOR.usd).toBe(4.24);
    expect(CORN_ANCHOR.unit).toBe("usd_per_bushel");
    expect(CORN_ANCHOR.kind).toBe("historical");
  });

  it("opens crude at the 2027 forecast over the 2025 anchor", () => {
    expect(openingCommodityIndex("crude")).toBe(74 / 69);
    expect(CRUDE_OPENING_FORECAST.usd).toBe(74);
    expect(CRUDE_OPENING_FORECAST.kind).toBe("forecast");
    expect(CRUDE_OPENING_FORECAST.kind).not.toBe("historical");
  });

  it("does not mark a forecast row as historical", () => {
    expect(CRUDE_OPENING_FORECAST.kind).not.toBe("historical");
    expect(WHEAT_OPENING_FORECAST.kind).not.toBe("historical");
    expect(CORN_OPENING_FORECAST.kind).not.toBe("historical");
    expect(WHEAT_OPENING_FORECAST.usd).toBe(6.4);
    expect(CORN_OPENING_FORECAST.usd).toBe(4.8);
    expect(openingCommodityIndex("wheat")).toBe(6.4 / 5.52);
    expect(openingCommodityIndex("corn")).toBe(4.8 / 4.24);
  });

  it("sets the crude index to 1 at the historical anchor", () => {
    expect(commodityIndex("crude", 69)).toBe(1);
    expect(commodityIndex("wheat", 5.52)).toBe(1);
    expect(commodityIndex("corn", 4.24)).toBe(1);
  });

  it("counts a belligerent's production share and ignores a nation that does not produce", () => {
    expect(producerShareAtWar("crude", ["RUS", "IRN"])).toBeCloseTo(0.15, 5);
    expect(producerShareAtWar("crude", ["UKR"])).toBe(0);
    expect(producerShareAtWar("wheat", ["RUS"])).toBeCloseTo(0.102, 5);
  });
});
