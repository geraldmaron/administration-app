import { describe, expect, it } from "vitest";
import { COHORT_AXES, COHORT_IDS } from "@admin/world";
import { INHERITED_WEEKS, selectApproval, trackingPoll } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { pollReading } from "./polls";
import { crosstabs, mostImportantProblem } from "./crosstabs";
import { approvalRangeTrack } from "./range-track";

/** The real seal of the real dataset, which is the only campaign player-core tests read. */
const buildCampaign = openingCampaign;

describe("the tracking poll as the chapter reads it", () => {
  it("reads the poll's own band and never the settled figure", () => {
    const campaign = buildCampaign();
    const reading = pollReading(campaign);
    const poll = trackingPoll(campaign);
    expect(reading.reading).toBe(poll.reading);
    expect(reading.range).toBe(`${Math.round(poll.low * 100)}% to ${Math.round(poll.high * 100)}%`);
    expect(reading.figure).not.toBe(`${Math.round(selectApproval(campaign) * 100)}%`);
    expect(reading.margin).toMatch(/^±\d+ points$/);
  });
});

describe("the crosstabs", () => {
  it("cuts the country by cell, one strip per axis", () => {
    const campaign = buildCampaign();
    const cells = crosstabs(campaign);
    expect(cells.map((group) => group.id)).toEqual([...COHORT_AXES]);
    expect(cells.flatMap((group) => group.rows)).toHaveLength(COHORT_IDS.length);
  });

  it("names every row and gives each a word for where it stands", () => {
    for (const group of crosstabs(buildCampaign())) {
      expect(group.name.length).toBeGreaterThan(0);
      for (const row of group.rows) {
        expect(row.name.length).toBeGreaterThan(0);
        expect(row.word.length).toBeGreaterThan(0);
        expect(row.figure).toMatch(/^\d+%$/);
      }
    }
  });

  it("keeps the cells of a strip in the dataset's order, so a strip stays put", () => {
    const campaign = buildCampaign();
    const ageStrip = crosstabs(campaign).find((group) => group.id === "age");
    expect(ageStrip?.rows.map((row) => row.id)).toEqual(["age-under-35", "age-35-64", "age-65-plus"]);
  });

  it("orders the coalitions strongest first, which is the one cut small enough to sort", () => {
    const rows = crosstabs(buildCampaign())[0]!.rows;
    expect([...rows].sort((a, b) => b.support - a.support)).toEqual(rows);
  });

  it("adds no cut of the country the dataset does not have", () => {
    // The party-identification axis is deliberately absent: it would change the
    // dataset's own cohort enum and every balance figure that reads a lens.
    const ids = crosstabs(buildCampaign()).map((group) => group.id);
    expect(ids).toEqual([...COHORT_AXES]);
    expect(ids).not.toContain("party");
  });
});

describe("the most important problem", () => {
  it("names one judgment, what the public means by it, and its share", () => {
    const problem = mostImportantProblem(buildCampaign());
    expect(problem).toBeDefined();
    expect(problem!.label.length).toBeGreaterThan(0);
    expect(problem!.meaning.length).toBeGreaterThan(0);
    expect(problem!.share).toBeGreaterThan(0);
    expect(problem!.share).toBeLessThanOrEqual(1);
    expect(problem!.figure).toMatch(/^\d+%$/);
    // The problem is never a level on its own: the heaviest term behind that
    // judgment is named with it.
    expect(problem!.cause).toBeDefined();
    expect(problem!.causeDetail).toBeDefined();
  });

  it("names the judgment with the largest weighted shortfall, not simply the lowest", () => {
    const base = buildCampaign();
    // Unity on the floor but weighted least of the six; prosperity middling and
    // weighted most. The problem is the one the week actually weighs.
    const campaign = {
      ...base,
      player: {
        ...base.player,
        opinion: { ...base.player.opinion, unity: 0.28, prosperity: 0.3, security: 0.9, services: 0.9, integrity: 0.9, competence: 0.9 },
      },
    };
    expect(mostImportantProblem(campaign)?.driver).toBe("prosperity");
  });
});

describe("the range track", () => {
  it("says nothing where there is no closed week to draw a span from", () => {
    const base = buildCampaign();
    expect(approvalRangeTrack({ ...base, player: { ...base.player, metricHistory: [] } })).toBeUndefined();
  });

  it("draws the full scale, the term's span inside it, and the Gallup landmarks on it", () => {
    const base = buildCampaign();
    const campaign = {
      ...base,
      player: {
        ...base.player,
        metricHistory: [0.62, 0.41, 0.5].map((approval) => ({ ...base.player.metrics, approval })),
      },
    };
    const reading = approvalRangeTrack(campaign)!;
    expect(reading.scaleLow).toBe(0);
    expect(reading.scaleHigh).toBe(1);
    expect(reading.opening).toBe(0.62);
    expect(reading.termLow).toBe(0.41);
    expect(reading.termHigh).toBeGreaterThanOrEqual(0.62);
    expect(reading.sinceOpening).toMatch(/points since you took office|no change since you took office/);
    const landmarks = reading.marks.filter((mark) => mark.kind === "historical").map((mark) => mark.label);
    expect(landmarks).toContain("Nixon, August 1974");
    expect(landmarks).toContain("Modern ceiling");
    for (const mark of reading.marks) {
      expect(mark.offset).toBeGreaterThanOrEqual(0);
      expect(mark.offset).toBeLessThanOrEqual(1);
      expect(mark.claim.length).toBeGreaterThan(0);
    }
  });

  it("says what kind of claim each mark is, so a published reading is not taken for a rule", () => {
    const base = buildCampaign();
    const campaign = {
      ...base,
      // Own-record marks read only governed weeks, so the history must reach past the inherited quarter.
      player: { ...base.player, metricHistory: Array.from({ length: INHERITED_WEEKS + 3 }, (_, week) => ({ ...base.player.metrics, approval: 0.4 + (week % 4) * 0.05 })) },
    };
    const reading = approvalRangeTrack(campaign)!;
    const historical = reading.marks.find((mark) => mark.kind === "historical");
    const own = reading.marks.find((mark) => mark.kind === "own-record");
    expect(historical?.claim).toBe("a real poll result from the past");
    expect(own?.claim).toBe("where you've been this term");
  });
});
