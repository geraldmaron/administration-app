import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { selectFragility } from "./fragility.js";
import { ASSESSED_METRICS, SPENT_METRICS, assessPosition, realizePositionCost, splitPrice } from "./position-assessment.js";
import type { Campaign } from "./state.js";

function healthy(): Campaign {
  const base = buildCampaign();
  return {
    ...base,
    player: {
      ...base.player,
      metrics: { ...base.player.metrics, treasury: 2_000_000, stability: 0.8, standing: 0.8, approval: 0.7 },
      opinion: { ...base.player.opinion, polarization: 1 },
    },
    congress: { ...base.congress, disposition: 0.8 },
  };
}

function fragile(): Campaign {
  const base = buildCampaign();
  return {
    ...base,
    player: {
      ...base.player,
      metrics: { ...base.player.metrics, treasury: 80, stability: 0.25, standing: 0.2, approval: 0.25 },
      opinion: { ...base.player.opinion, polarization: 1.2 },
    },
    congress: { ...base.congress, disposition: 0.1 },
  };
}

describe("what the President spends and what the country decides", () => {
  it("names the two halves once, and every metric a cost can carry is in exactly one", () => {
    const all = [...SPENT_METRICS, ...ASSESSED_METRICS].sort();
    expect(all).toEqual(["militaryReadiness", "stability", "standing", "treasury"]);
    const split = splitPrice({ treasury: -120, militaryReadiness: -0.05, stability: -0.03, standing: 0.02 });
    expect(split.spent).toEqual({ treasury: -120, militaryReadiness: -0.05 });
    expect(split.assessed).toEqual({ stability: -0.03, standing: 0.02 });
  });

  it("reads the sticker price on a united board, and a debit no heavier than its fragility makes it", () => {
    const campaign = healthy();
    const reading = selectFragility(campaign);
    expect(reading.amplification).toBeLessThan(selectFragility(fragile()).amplification);
    const realized = realizePositionCost(campaign, { stability: -0.03, standing: 0.02, treasury: -50 });
    expect(realized.treasury).toBe(-50);
    // No division, so a credit lands whole.
    expect(realized.standing).toBe(0.02);
    expect(realized.stability ?? 0).toBeCloseTo(-0.03 * reading.amplification, 3);
  });

  it("lands a debit harder on a fragile administration and a credit softer on a divided public", () => {
    const campaign = fragile();
    const reading = selectFragility(campaign);
    expect(reading.amplification).toBeGreaterThan(1.1);
    const realized = realizePositionCost(campaign, { stability: -0.04, standing: 0.05, militaryReadiness: -0.1 });
    expect(realized.stability ?? 0).toBeLessThan(-0.04);
    expect(realized.stability ?? 0).toBeCloseTo(-0.04 * reading.amplification, 3);
    expect(realized.standing ?? 0).toBeLessThan(0.05);
    expect(realized.standing ?? 0).toBeGreaterThan(0);
    // Spent metrics are the President's own and pass through untouched.
    expect(realized.militaryReadiness).toBe(-0.1);
  });

  it("is deterministic for the same board", () => {
    const campaign = fragile();
    expect(realizePositionCost(campaign, { stability: -0.04 })).toEqual(realizePositionCost(campaign, { stability: -0.04 }));
  });

  it("bands the assessed half, prints the spent half, and is surest on a healthy board", () => {
    const sure = assessPosition(healthy(), { stability: -0.03, treasury: -50 });
    expect(sure.spent).toEqual({ treasury: -50 });
    expect(sure.assessed).toEqual([{ domain: "stability", direction: "down", band: "moderate", horizon: "next-turn", confidence: "estimated" }]);
    expect(sure.confidence).toBe("high");
    expect(sure.basis).toMatch(/face value/);

    const doubted = assessPosition(healthy(), { stability: -0.03 }, { briefingDoubted: true });
    expect(["moderate", "low"]).toContain(doubted.confidence);

    const shaky = assessPosition(fragile(), { stability: -0.03 });
    expect(shaky.confidence).not.toBe("high");
    expect(shaky.basis).toMatch(/absorbs a shock/);
  });
});
