import { describe, expect, it } from "vitest";
import { ordinal, rankColumn } from "./rank";
import { niceTicks, fitDomain } from "./scale";

describe("rankColumn", () => {
  it("ranks higher-is-better columns with ties sharing the better rank", () => {
    const ranks = rankColumn([3, 7, 7, null, 1], "up");
    expect(ranks.map((r) => r?.rank)).toEqual([3, 1, 1, undefined, 4]);
    expect(ranks[1]?.of).toBe(4);
    expect(ranks[1]?.percentile).toBe(1);
    expect(ranks[4]?.percentile).toBe(0.25);
  });

  it("ranks lower-is-better columns, such as inflation", () => {
    expect(rankColumn([2.1, 8.4, 0.5], "down").map((r) => r?.rank)).toEqual([2, 3, 1]);
  });

  it("gives a lone reading the top percentile", () => {
    expect(rankColumn([5], "up")[0]).toEqual({ rank: 1, of: 1, percentile: 1 });
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [112, "112th"],
  ])("%i is %s", (n, said) => expect(ordinal(n)).toBe(said));
});

describe("scale", () => {
  it("covers the data with round ticks", () => {
    const ticks = niceTicks(0.37, 0.61);
    expect(ticks[0]).toBeLessThanOrEqual(0.37);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(0.61);
  });

  it("pads a flat series so it still draws", () => {
    const [low, high] = fitDomain([5, 5, 5]);
    expect(high).toBeGreaterThan(low);
  });
});
