// The Desk's ending reads the stored night. A live projection is not
// substituted for a share the election already recorded.
import { describe, expect, it } from "vitest";
import { projectVote, type ElectionResult } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { presidencyEndingReading } from "./congress-reading";

function withOutcome(outcome: "defeated" | "term-limited" | undefined, elections?: readonly ElectionResult[]) {
  const campaign = openingCampaign();
  return {
    ...campaign,
    termClock: {
      ...campaign.termClock,
      ...(outcome === undefined ? {} : { outcome }),
      ...(elections === undefined ? {} : { elections }),
    },
  };
}

describe("presidency ending", () => {
  it("says nothing while the administration is in office", () => {
    expect(presidencyEndingReading(openingCampaign())).toBeUndefined();
  });

  it("names a removal without a vote share", () => {
    const campaign = openingCampaign();
    const reading = presidencyEndingReading({
      ...campaign,
      removal: { ...campaign.removal, resolved: true },
      termClock: { ...campaign.termClock, outcome: "defeated" },
    });
    expect(reading?.ending).toBe("removed");
    expect(reading?.share).toBeUndefined();
    expect(reading?.sentence).toMatch(/removed/i);
  });

  it("names a second term served without quoting a zero share", () => {
    const reading = presidencyEndingReading(withOutcome("term-limited"));
    expect(reading?.ending).toBe("term-limited");
    expect(reading?.share).toBeUndefined();
    expect(reading?.sentence).toMatch(/couldn't run again/);
  });

  it("names the live count when a defeat was forced and no night was stored", () => {
    const campaign = withOutcome("defeated");
    const reading = presidencyEndingReading(campaign);
    expect(reading?.ending).toBe("defeated");
    expect(reading?.share).toBeCloseTo(projectVote(campaign).share);
    expect(reading?.electoralVotes).toBeGreaterThan(0);
    expect(reading?.electoralMajority).toBe(270);
    expect(reading?.drivers.length).toBeGreaterThan(0);
  });

  it("keeps the stored share and drops drivers once the live count has moved", () => {
    const campaign = openingCampaign();
    const live = projectVote(campaign).share;
    const stored = Math.min(0.99, live + 0.2);
    const night: ElectionResult = {
      id: "election:presidential:9",
      kind: "presidential",
      turn: 9,
      voteShare: stored,
      won: false,
      summary: "The administration is defeated, and the term ends.",
    };
    const reading = presidencyEndingReading(withOutcome("defeated", [night]));
    expect(reading?.share).toBe(stored);
    expect(reading?.sentence).toBe(night.summary);
    expect(reading?.drivers).toEqual([]);
    expect(reading?.electoralVotes).toBeGreaterThan(0);
  });
});
