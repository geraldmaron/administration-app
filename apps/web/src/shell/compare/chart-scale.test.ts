import { describe, expect, it } from "vitest";
import { axisTicks, nearestIndex, niceTicks, spreadLabels } from "./chart-scale";

describe("the chart's round-number axes", () => {
  it("covers the data with round ticks", () => {
    expect(niceTicks(3.5, 4.7)).toEqual([3.5, 4, 4.5, 5]);
    expect(niceTicks(0, 10)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  it("never returns fewer than two ticks, even for a flat series", () => {
    expect(niceTicks(4, 4).length).toBeGreaterThanOrEqual(2);
  });

  it("ticks the shared axis on whole numbers", () => {
    expect(axisTicks(0, 35)).toEqual([0, 10, 20, 30]);
    expect(axisTicks(2007, 2012)).toEqual([2007, 2008, 2009, 2010, 2011, 2012]);
  });

  it("finds the reading nearest a pointer", () => {
    expect(nearestIndex([0, 10, 20], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20], 16)).toBe(2);
  });

  it("spreads end labels apart without losing their order", () => {
    const spread = spreadLabels(
      [
        { id: "a", x: 300, y: 100 },
        { id: "b", x: 300, y: 104 },
        { id: "c", x: 20, y: 102 },
      ],
      16,
      80,
      10,
      200,
    );
    expect(spread.get("b")! - spread.get("a")!).toBeGreaterThanOrEqual(16);
    expect(spread.get("c")).toBe(102);
  });
});
