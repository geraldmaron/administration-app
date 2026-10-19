import { describe, expect, it } from "vitest";
import { reliefSignature, type Campaign, type NationCondition, type PendingClaim } from "@admin/engine";
import type { StateId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { governorRequestGroups, guardCandidateHeadline, guardRequestCandidates } from "./attention-requests";
import { familySources } from "./family-sources";

const base = openingCampaign();

function claim(over: Partial<PendingClaim> & { signature: string; openedTurn: number }): PendingClaim {
  return { expiresTurn: over.openedTurn + 4, weight: 0.3, reason: "A state asked for federal help and has not had an answer.", ...over };
}

function withClaims(campaign: Campaign, byState: Readonly<Record<string, readonly PendingClaim[]>>): Campaign {
  const states = { ...campaign.states };
  for (const [id, claims] of Object.entries(byState)) {
    const runtime = states[id as StateId];
    if (!runtime) throw new Error(`Fixture references a state id the dataset does not carry: ${id}`);
    states[id as StateId] = { ...runtime, claims };
  }
  return { ...campaign, states };
}

function requestRows(campaign: Campaign) {
  return familySources(campaign)
    .filter((source) => source.row.source === "governor-request")
    .map((source) => source.row);
}

describe("governorRequestGroups: bundling one emergency, not fifty rows", () => {
  it("bundles claims sharing a signature and opening turn into one group", () => {
    const signature = reliefSignature("flood");
    const campaign = withClaims(base, {
      "MI": [claim({ signature, openedTurn: base.turn })],
      "OH": [claim({ signature, openedTurn: base.turn })],
      "IN": [claim({ signature, openedTurn: base.turn })],
    });
    const groups = governorRequestGroups(campaign);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.states).toHaveLength(3);
    expect(requestRows(campaign)[0]!.title).toBe("3 governors are waiting to hear if you'll send federal help");
  });

  it("keeps two different emergencies as two separate groups", () => {
    const campaign = withClaims(base, {
      "MI": [claim({ signature: reliefSignature("flood"), openedTurn: base.turn })],
      "CA": [claim({ signature: reliefSignature("drought"), openedTurn: base.turn })],
    });
    expect(governorRequestGroups(campaign)).toHaveLength(2);
  });

  it("is ambient in the onset week, because the condition's own row already stops the run then", () => {
    const campaign = withClaims(base, { "CA": [claim({ signature: reliefSignature("wildfire"), openedTurn: base.turn })] });
    expect(requestRows(campaign)[0]!.urgency).toBe("ambient");
  });

  it("turns soft only once the claim is inside its own closing window", () => {
    const signature = reliefSignature("drought");
    const far = withClaims(base, { "TX": [claim({ signature, openedTurn: base.turn - 1, expiresTurn: base.turn + 20 })] });
    expect(requestRows(far)[0]!.urgency).toBe("ambient");
    const close = withClaims(base, { "TX": [claim({ signature, openedTurn: base.turn - 1, expiresTurn: base.turn })] });
    expect(requestRows(close)[0]!.urgency).toBe("soft");
  });

  it("carries its due date as the claim's own expiry", () => {
    const campaign = withClaims(base, {
      "FL": [claim({ signature: reliefSignature("drought"), openedTurn: base.turn - 1, expiresTurn: base.turn })],
    });
    expect(requestRows(campaign)[0]!.dueDate).toBeDefined();
  });

  it("ignores a non-relief claim on the same state", () => {
    const campaign = withClaims(base, {
      "MI": [{ signature: "answered:flood", openedTurn: base.turn, expiresTurn: base.turn + 4, weight: 0.1, reason: "x" }],
    });
    expect(governorRequestGroups(campaign)).toHaveLength(0);
  });
});

function withFlood(campaign: Campaign, state: StateId, severity: number): Campaign {
  const condition: NationCondition = {
    id: `condition:flood:${campaign.founding.nation}:${state}:${campaign.turn}`,
    nation: campaign.founding.nation,
    kind: "flood",
    scope: "region",
    severity,
    startedTurn: campaign.turn,
    status: "active",
    beats: [],
    state,
  };
  return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}

describe("guardRequestCandidates: the President's own ask, the other direction from governorRequestGroups", () => {
  it("finds no candidate on a quiet map", () => {
    expect(guardRequestCandidates(base)).toEqual([]);
  });

  it("names the state, the emergency and a forecast off the same terms the decision weighs", () => {
    const campaign = withFlood(base, "OH", 0.7);
    const candidates = guardRequestCandidates(campaign);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.state).toBe("OH");
    expect(guardCandidateHeadline(candidates[0]!)).toMatch(/flood/i);
    expect(candidates[0]!.forecast.question).toBe("governor-consent");
  });

  it("ranks worst emergency first", () => {
    const campaign = withFlood(withFlood(base, "OH", 0.3), "TX", 0.9);
    const candidates = guardRequestCandidates(campaign);
    expect(candidates.map((candidate) => candidate.state)).toEqual(["TX", "OH"]);
  });
});
