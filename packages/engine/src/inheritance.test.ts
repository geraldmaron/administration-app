import { describe, expect, it } from "vitest";
import { INHERITED_WEEKS, inheritedMetricHistory } from "./inheritance.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import type { MetricSet } from "./state-campaign.js";

const OPENING: MetricSet = {
  approval: 0.62,
  treasury: 2_400_000,
  stability: 0.71,
  militaryReadiness: 0.68,
  standing: 0.7,
};

describe("inheritedMetricHistory", () => {
  it("hands the president a full quarter of closed weeks", () => {
    const history = inheritedMetricHistory(createRngStreams(makeCampaignSeed("seed-a")), OPENING);
    expect(history).toHaveLength(INHERITED_WEEKS);
  });

  it("lands adjacent to the opening reading rather than being reconciled to it", () => {
    // The walk runs backwards from today, so the last inherited week is one
    // week's drift from the number the room draws — never a jump the player
    // would read as an event they missed.
    const history = inheritedMetricHistory(createRngStreams(makeCampaignSeed("seed-a")), OPENING);
    const last = history.at(-1)!;
    expect(Math.abs(last.approval - OPENING.approval)).toBeLessThan(0.05);
    expect(Math.abs(last.standing - OPENING.standing)).toBeLessThan(0.05);
  });

  it("gives two seeds two different quarters, and one seed the same one twice", () => {
    const a = inheritedMetricHistory(createRngStreams(makeCampaignSeed("seed-a")), OPENING);
    const b = inheritedMetricHistory(createRngStreams(makeCampaignSeed("seed-b")), OPENING);
    const again = inheritedMetricHistory(createRngStreams(makeCampaignSeed("seed-a")), OPENING);
    expect(a).toEqual(again);
    expect(a).not.toEqual(b);
  });

  it("keeps every inherited ratio inside its own range", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      for (const week of inheritedMetricHistory(createRngStreams(makeCampaignSeed(seed)), OPENING)) {
        for (const key of ["approval", "stability", "militaryReadiness", "standing"] as const) {
          expect(week[key]).toBeGreaterThan(0);
          expect(week[key]).toBeLessThanOrEqual(1);
        }
        expect(week.treasury).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("moves each reading week to week, so no sparkline opens as a flat line", () => {
    const history = inheritedMetricHistory(createRngStreams(makeCampaignSeed("seed-a")), OPENING);
    const approval = history.map((week) => week.approval);
    expect(new Set(approval).size).toBeGreaterThan(1);
  });
});
