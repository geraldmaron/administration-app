import { describe, expect, it } from "vitest";
import { COHORT_AXES, STATE_IDS } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { mostImportantProblem, rankedProblems } from "../polling/crosstabs";
import { electorateView, stateDemographics } from "./electorate";

const campaign = openingCampaign();

describe("the electorate book", () => {
  const view = electorateView(campaign);

  it("carries six judgments with their weights, and a poll with its error band", () => {
    expect(view.topline.judgments).toHaveLength(6);
    expect(view.topline.poll.low).toBeLessThanOrEqual(view.topline.poll.reading);
    expect(view.topline.poll.high).toBeGreaterThanOrEqual(view.topline.poll.reading);
    const weights = view.topline.judgments.reduce((sum, row) => sum + row.weight, 0);
    expect(weights).toBeCloseTo(1, 1);
  });

  it("keeps the approval series the engine keeps and no other", () => {
    expect(view.topline.series.length).toBe(campaign.player.metricHistory.length + 1);
    expect(view.topline.series.at(-1)).toBe(campaign.player.metrics.approval);
  });

  it("cuts the country ten ways, each strip summing to the whole country", () => {
    expect(view.cuts.map((cut) => cut.id)).toEqual([...COHORT_AXES]);
    for (const cut of view.cuts) {
      const total = cut.rows.reduce((sum, row) => sum + (row.share ?? 0), 0);
      expect(total, cut.id).toBeCloseTo(1, 1);
    }
  });

  it("reads the cuts against their own average, which sits inside the range of the cells", () => {
    const supports = view.cuts.flatMap((cut) => cut.rows.map((row) => row.support));
    expect(view.cutsAverage).toBeGreaterThanOrEqual(Math.min(...supports));
    expect(view.cutsAverage).toBeLessThanOrEqual(Math.max(...supports));
  });

  it("ranks the problems with shares that sum to one, led by the single most important problem", () => {
    const ranked = rankedProblems(campaign);
    expect(ranked.length).toBe(6);
    expect(ranked.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 5);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1]!.share).toBeGreaterThanOrEqual(ranked[i]!.share);
    expect(ranked[0]).toEqual(mostImportantProblem(campaign));
  });

  it("reads a state for every state the campaign carries, in dataset order", () => {
    expect(view.states.map((cell) => cell.state)).toEqual(STATE_IDS.filter((id) => campaign.states[id]));
  });

  it("is a read: it does not change the campaign", () => {
    const before = JSON.stringify(campaign);
    electorateView(campaign);
    stateDemographics(campaign, "TX");
    expect(JSON.stringify(campaign)).toBe(before);
  });
});

describe("a state's demographic profile", () => {
  it("has ten axes whose cells sum to one for the state and for the nation", () => {
    const axes = stateDemographics(campaign, "TX")!;
    expect(axes.map((axis) => axis.axis)).toEqual([...COHORT_AXES]);
    for (const axis of axes) {
      expect(axis.cells.reduce((sum, cell) => sum + cell.state, 0), axis.axis).toBeCloseTo(1, 2);
      expect(axis.cells.reduce((sum, cell) => sum + cell.nation, 0), axis.axis).toBeCloseTo(1, 2);
      for (const cell of axis.cells) expect(cell.gap).toBeCloseTo(cell.state - cell.nation, 10);
    }
  });
});
