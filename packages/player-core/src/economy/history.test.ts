import { describe, expect, it } from "vitest";
import { US_SERIES } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { ECONOMY_HISTORY_RATES, economyHistory } from "./history";

const base = openingCampaign();
const US = base.founding.nation;

describe("a rate's history in the economy room", () => {
  it("runs the published record, then one projected point at the oath, then the weeks played, in time order", () => {
    const played = {
      ...base,
      economyHistory: [
        { turn: 1, growth: 0.021, inflation: 0.03, unemployment: 0.041, costOfLiving: 1 },
        { turn: 2, growth: 0.022, inflation: 0.031, unemployment: 0.042, costOfLiving: 1 },
      ],
    };
    for (const rate of ECONOMY_HISTORY_RATES) {
      const { points } = economyHistory(played, rate);
      const kinds = points.map((point) => point.kind);
      const firstProjected = kinds.indexOf("projected");
      expect(kinds.slice(0, firstProjected).every((kind) => kind === "recorded"), rate).toBe(true);
      expect(kinds.filter((kind) => kind === "projected"), rate).toEqual(["projected"]);
      expect(kinds.slice(firstProjected + 1), rate).toEqual(["played", "played"]);
      const times = points.map((point) => point.at);
      expect(times, rate).toEqual([...times].sort((a, b) => a - b));
    }
    const unemployment = economyHistory(played, "unemployment").points;
    expect(unemployment.find((point) => point.kind === "projected")).toMatchObject({
      label: "When you took office",
      value: Math.round(base.nations[US]!.base.stats.economy.unemployment * 1000) / 10,
    });
    expect(unemployment.at(-1)).toMatchObject({ label: "Week 2", value: 4.2, kind: "played" });
  });

  it("prints only figures the agency published, and no month it did not", () => {
    const unemployment = economyHistory(base, "unemployment").points.filter((point) => point.kind === "recorded");
    expect(unemployment.map((point) => point.value)).toEqual(US_SERIES.unemployment!.map((point) => point.value));
    expect(unemployment.some((point) => point.label === "Oct 2025")).toBe(false);
    expect(unemployment[0]).toMatchObject({ label: "Jan 2017" });
    expect(economyHistory(base, "unemployment").source).toMatch(/Bureau of Labor Statistics/);
  });

  it("reads inflation as the twelve-month change in the published index, skipping a month whose year-ago figure is missing", () => {
    const inflation = economyHistory(base, "inflation").points.filter((point) => point.kind === "recorded");
    const cpi = new Map(US_SERIES.cpi!.map((point) => [point.date, point.value]));
    expect(inflation[0]).toMatchObject({ label: "Jan 2017", value: Math.round((cpi.get("2017-01")! / cpi.get("2016-01")! - 1) * 1000) / 10 });
    expect(inflation.some((point) => point.label === "Oct 2025")).toBe(false);
    expect(economyHistory(base, "growth").points[0]).toMatchObject({ label: "2017 Q1", kind: "recorded" });
  });
});
