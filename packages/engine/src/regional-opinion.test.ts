import { describe, expect, it } from "vitest";
import { STATE_IDS, type StateId } from "@admin/world";
import { atCampaignTurn, buildCampaign } from "./__fixtures__/campaign.js";
import {
  STATE_APPROVAL_LOGIT_SLOPE,
  stateApproval,
  stateApprovalSample,
  stateApprovalTarget,
  stateApprovals,
} from "./regional-opinion.js";
import { projectedStateCalls, stateShareShifts } from "./states.js";
import type { Campaign, StateRuntime } from "./state.js";

const HEADLINES = Array.from({ length: 19 }, (_, index) => Math.round((0.05 + index * 0.05) * 100) / 100);
const POLARIZATIONS = [0, 0.25, 0.5, 0.75, 1];

function withHeadline(campaign: Campaign, approval: number, polarization: number): Campaign {
  return {
    ...campaign,
    player: {
      ...campaign.player,
      metrics: { ...campaign.player.metrics, approval },
      opinion: { ...campaign.player.opinion, polarization },
    },
  };
}

/** The founding nation's unemployment doubled and its prices a tenth above their path: an economy that has moved. */
function withEconomyMoved(campaign: Campaign): Campaign {
  const id = campaign.founding.nation;
  const runtime = campaign.nations[id]!;
  const economy = runtime.stats.economy;
  return {
    ...campaign,
    nations: {
      ...campaign.nations,
      [id]: {
        ...runtime,
        stats: {
          ...runtime.stats,
          economy: { ...economy, unemployment: runtime.base.stats.economy.unemployment * 2, costOfLiving: economy.costOfLiving * 1.1 },
        },
      },
    },
  };
}

function populationMean(campaign: Campaign, approvals: Readonly<Partial<Record<StateId, number>>>): number {
  let mass = 0;
  let sum = 0;
  for (const id of STATE_IDS) {
    const value = approvals[id];
    const runtime = campaign.states[id];
    if (value === undefined || !runtime) continue;
    mass += runtime.population;
    sum += runtime.population * value;
  }
  return sum / mass;
}

describe("state approval", () => {
  const settled = atCampaignTurn(buildCampaign(), 40);

  it("averages, by population, to the headline without the honeymoon across headlines 0.05 to 0.95 and every polarization", () => {
    for (const base of [settled, withEconomyMoved(settled)]) {
      for (const polarization of POLARIZATIONS) {
        for (const headline of HEADLINES) {
          const campaign = withHeadline(base, headline, polarization);
          const target = stateApprovalTarget(campaign);
          expect(target).toBeCloseTo(headline, 12);
          expect(populationMean(campaign, stateApprovals(campaign))).toBeCloseTo(target, 9);
          // The stored sample is rounded to a thousandth, so its mean holds to within half of one.
          const sampled = stateApprovalSample(campaign, campaign.turn).approval;
          expect(Math.abs(populationMean(campaign, sampled) - target)).toBeLessThanOrEqual(0.0005);
        }
      }
    }
  });

  it("averages to the headline itself, honeymoon and all", () => {
    const opening = atCampaignTurn(buildCampaign(), 1);
    const campaign = withHeadline(opening, 0.55, 0.3);
    expect(stateApprovalTarget(campaign)).toBeCloseTo(0.55, 12);
    expect(populationMean(campaign, stateApprovals(campaign))).toBeCloseTo(0.55, 9);
  });


  it("keeps the opposed states off the floor at a headline deep in removal-pressure range", () => {
    const campaign = withHeadline(settled, 0.05, 1);
    const values = Object.values(stateApprovals(campaign));
    expect(values.every((value) => value > 0 && value < 0.5)).toBe(true);
    // Still a map rather than a floor: the most opposed state sits measurably below the most aligned.
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.01);
  });

  it("reads every state where the country is at the two ends, where no offset exists", () => {
    for (const headline of [0, 1]) {
      const values = Object.values(stateApprovals(withHeadline(settled, headline, 0.5)));
      expect(values.every((value) => value === headline)).toBe(true);
    }
  });

  it("is keyed and computed in STATE_IDS order, whatever order the campaign's states were built in", () => {
    const campaign = withHeadline(settled, 0.47, 0.4);
    const reversed: Record<string, StateRuntime> = {};
    for (const id of [...STATE_IDS].reverse()) reversed[id] = campaign.states[id]!;
    const shuffled = { ...campaign, states: reversed as Campaign["states"] };
    const forward = stateApprovals(campaign);
    const backward = stateApprovals(shuffled);
    expect(Object.keys(forward)).toEqual([...STATE_IDS]);
    expect(Object.keys(backward)).toEqual([...STATE_IDS]);
    for (const id of STATE_IDS) expect(backward[id]).toBe(forward[id]);
    expect(stateApprovals(campaign)).toEqual(forward);
  });

  it("agrees in sign with the electoral call wherever the map puts a state far from the country", () => {
    const share = 0.5;
    for (const headline of [0.3, 0.5, 0.7]) {
      const campaign = withHeadline(settled, headline, 0.5);
      const approvals = stateApprovals(campaign);
      const target = stateApprovalTarget(campaign);
      const far = projectedStateCalls(campaign, share).filter((call) => Math.abs(call.share - share) >= 0.05);
      expect(far.length).toBeGreaterThan(20);
      for (const call of far) {
        expect(Math.sign(approvals[call.state]! - target), call.state).toBe(Math.sign(call.share - share));
      }
    }
  });

  it("reads one point of map shift as one point of approval at an even headline", () => {
    const campaign = withHeadline(settled, 0.5, 0);
    const shifts = stateShareShifts(campaign);
    const approvals = stateApprovals(campaign);
    const id = STATE_IDS.find((state) => Math.abs(shifts[state]!) < 0.03)!;
    expect(approvals[id]! - 0.5).toBeCloseTo(shifts[id]!, 2);
    expect(STATE_APPROVAL_LOGIT_SLOPE).toBe(4);
  });

  it("does not count a state's grievance marks a second time: they move approval only through lean", () => {
    const campaign = withHeadline(settled, 0.5, 0.2);
    const id = STATE_IDS[4]!;
    const runtime = campaign.states[id]!;
    const marked: Campaign = {
      ...campaign,
      states: {
        ...campaign.states,
        [id]: { ...runtime, marks: [{ turn: 39, signature: "test", weight: 0.9, valence: -1, decayRate: 0.01, reason: "A test." }] },
      },
    };
    expect(stateApprovals(marked)).toEqual(stateApprovals(campaign));
  });

  it("moves a state whose anchors say it feels the economy harder when the economy turns", () => {
    const campaign = withHeadline(settled, 0.5, 0.2);
    const moved = withEconomyMoved(campaign);
    const exposed = [...STATE_IDS].sort(
      (a, b) => campaign.states[b]!.base.character.vitalAnchor.unemployment - campaign.states[a]!.base.character.vitalAnchor.unemployment,
    )[0]!;
    expect(stateApproval(moved, exposed)!).toBeLessThan(stateApproval(campaign, exposed)!);
  });

  it("is undefined for a state the campaign does not carry", () => {
    expect(stateApproval(settled, "STATE-NOT-REAL" as StateId)).toBeUndefined();
  });
});
