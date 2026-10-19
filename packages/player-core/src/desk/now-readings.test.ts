import { describe, expect, it } from "vitest";
import { BEAT_THRESHOLDS, OPINION_DRIVERS, advanceTurn, campaignTurnPhases, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { approvalBreakdown } from "./approval-breakdown";
import { NOW_KEYS, nowReadings, removalStanding } from "./now-readings";

function weeksOn(campaign: Campaign, weeks: number): Campaign {
  const phases = campaignTurnPhases(charterOf(campaign));
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) working = advanceTurn(working, phases);
  return working;
}

const opening = openingCampaign();
const twoWeeks = weeksOn(opening, 2);

describe("the Brief's readings now", () => {
  it("draws the five readings, each a door to its own metric screen", () => {
    const readings = nowReadings(opening);
    expect(readings.map((reading) => reading.key)).toEqual([...NOW_KEYS]);
    expect(readings[0]?.href).toBe("/nation?view=opinion");
    for (const reading of readings) expect(reading.fraction).toBeGreaterThanOrEqual(0);
  });

  it("claims no weekly move on the morning of the oath, when the last week on file is the predecessor's", () => {
    expect(nowReadings(opening).every((reading) => reading.week === undefined)).toBe(true);
  });

  it("reads the week's move against the last closed week once one of this term has closed", () => {
    const approval = nowReadings(twoWeeks).find((reading) => reading.key === "approval")!;
    const last = twoWeeks.player.metricHistory.at(-1)!;
    expect(approval.week?.delta).toBeCloseTo(twoWeeks.player.metrics.approval - last.approval, 12);
  });
});

describe("standing against removal", () => {
  it("puts the arc's figure against the three lines that open each proceeding, terms heaviest first", () => {
    const standing = removalStanding(opening);
    expect(standing.thresholds.map((line) => line.at)).toEqual([...BEAT_THRESHOLDS]);
    expect(standing.terms).toHaveLength(6);
    const shares = standing.terms.map((term) => term.share);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
    expect(standing.liveTotal).toBeGreaterThanOrEqual(0);
  });
});

describe("approval opened up", () => {
  it("carries all six judgments in the engine's order, each with the week's move off the ledger", () => {
    const breakdown = approvalBreakdown(twoWeeks);
    expect(breakdown.judgments.map((judgment) => judgment.driver)).toEqual([...OPINION_DRIVERS]);
    expect(breakdown.approval).toBe(twoWeeks.player.metrics.approval);
    for (const judgment of breakdown.judgments) expect(judgment.weekText.length).toBeGreaterThan(0);
    expect(breakdown.polarization.value).toBeGreaterThanOrEqual(0);
  });
});
