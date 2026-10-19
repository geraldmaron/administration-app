import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { comparisonView, WINDOW_PRESETS } from "./comparison";

const base = openingCampaign();

/** Weekly samples with a known unemployment path: 4.0% for the first 14 weeks, then 5.0%. */
function played(weeks: number) {
  return {
    ...base,
    economyHistory: Array.from({ length: weeks }, (_, i) => ({
      turn: i + 1,
      growth: 0.02,
      inflation: 0.03,
      unemployment: i < 14 ? 0.04 : 0.05,
      costOfLiving: 1,
    })),
  };
}

describe("lining this presidency up against the published record", () => {
  it("offers only the windows the pack covers for the rate, and says why it refuses the others", () => {
    const view = comparisonView(played(30), "unemployment", "2017-2019");
    const ids = Object.fromEntries(
      view.windows.map((w) => [w.id, w.available]),
    );
    expect(ids).toEqual({
      "1973-1982": false,
      "2007-2012": false,
      "2015-2019": false,
      "2017-2019": true,
      "2020-2022": true,
    });
    expect(view.windows.find((w) => w.id === "1973-1982")!.reason).toMatch(
      /outside it/,
    );
  });

  it("refuses to draw an uncovered window rather than falling back to another", () => {
    const view = comparisonView(played(30), "unemployment", "1973-1982");
    expect(view.selected.id).toBe("1973-1982");
    expect(view.series).toEqual([]);
    expect(view.unavailable).toMatch(/covers 2017-01/);
  });

  it("aligns by months since each began and reads the campaign's fraction as a percent", () => {
    const view = comparisonView(played(30), "unemployment", "2017-2019");
    const [reference, mine] = view.series;
    expect(reference!.points[0]).toMatchObject({
      month: 0,
      label: "2017-01",
      value: 4.7,
    });
    expect(reference!.points).toHaveLength(36);
    expect(mine!.evidence).toBe("simulated");
    expect(mine!.points[0]).toMatchObject({ month: 0, value: 4 });
    expect(mine!.points.at(-1)!.value).toBe(5);
    expect(view.verdict.status).toBe("transform");
    expect(view.basis).toMatch(/aren't calendar dates/);
  });

  it("draws only months the campaign has finished", () => {
    const view = comparisonView(played(10), "unemployment", "2017-2019");
    const mine = view.series[1]!;
    const lastWeekMonth = Math.floor((10 * 7) / (365.25 / 12));
    expect(Math.max(...mine.points.map((p) => p.month))).toBeLessThan(
      lastWeekMonth,
    );
  });

  it("puts growth on the quarterly cadence of the published series", () => {
    const growth = comparisonView(played(60), "growth", "2017-2019");
    expect(growth.series[0]!.points).toHaveLength(12);
    expect(growth.series[1]!.points.every((p) => (p.month + 1) % 3 === 0)).toBe(
      true,
    );
  });

  it("does not change the campaign it reads", () => {
    const campaign = played(30);
    const before = JSON.stringify(campaign);
    for (const window of WINDOW_PRESETS)
      comparisonView(campaign, "inflation", window.id);
    expect(JSON.stringify(campaign)).toBe(before);
  });

  it("draws a presidency older than the weekly ring from the monthly archive, then the weeks", () => {
    const sample = (turn: number, unemployment: number) => ({ turn, growth: 0.02, inflation: 0.03, unemployment, costOfLiving: 1 });
    const archive = Array.from({ length: 10 }, (_, m) => sample(Math.round((m * 365.25) / 12 / 7) + 3, 0.045));
    const weekly = Array.from({ length: 104 }, (_, i) => sample(60 + i, 0.05));
    const view = comparisonView({ ...base, economyArchive: archive, economyHistory: weekly }, "unemployment", "2017-2019");
    const mine = view.series[1]!;
    expect(mine.points.length).toBeGreaterThan(30);
    expect(mine.points[0]!.value).toBe(4.5);
    expect(mine.points.at(-1)!.value).toBe(5);
    const months = mine.points.map((p) => p.month);
    expect(new Set(months).size).toBe(months.length);
  });
});
