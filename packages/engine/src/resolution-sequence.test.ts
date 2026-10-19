import { describe, expect, it } from "vitest";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { INSTRUMENT_IDS } from "./instruments.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import {
  resolutionSituationKey,
  selectResolutionSequence,
  stagedResolutionFeedItem,
  stagedResolutionFor,
  type ResolutionSequenceEntry,
  type ResolutionSequenceSituation,
  type StagedResolutionAct,
} from "./resolution-sequence.js";
import { resolveAction, RISK_IDS, type ResolutionRequest } from "./resolution.js";
import type { Campaign } from "./state.js";

// A stand-in for the shipped bank, in its shape: military and covert only, two
// sequences in every success and partial cell, one per named failure branch,
// and nothing at all for the three instruments that resolve in a room.
function bank(): readonly ResolutionSequenceEntry[] {
  const staged = ["military", "covert"] as const;
  const bands = ["low", "mid", "high"] as const;
  return staged.flatMap((instrument) =>
    bands.flatMap((band) => [
      ...[0, 1].map((n) => ({ id: `${instrument}-${band}-success-${n}`, instrument, rungBands: [band], valence: "success" as const, weight: 1 })),
      ...[0, 1].map((n) => ({ id: `${instrument}-${band}-partial-${n}`, instrument, rungBands: [band], valence: "partial" as const, weight: 1 })),
      ...RISK_IDS[instrument].map((riskId) => ({
        id: `${instrument}-${band}-failure-${riskId}`,
        instrument,
        rungBands: [band],
        valence: "failure" as const,
        riskAffinity: [riskId],
        weight: 1,
      })),
    ]),
  );
}

const ACT: StagedResolutionAct = {
  campaignSeed: "test-seed",
  actor: nationA.id,
  target: nationB.id,
  instrument: "military",
  rung: 4,
  turn: 6,
};

const SITUATION: ResolutionSequenceSituation = { instrument: "military", rungBand: "high", valence: "success" };

function seeded(campaignSeed: string): string {
  return [campaignSeed, "resolution-sequence", ACT.actor, ACT.target, ACT.instrument, "4", "6"].join(":");
}

function militaryBoard(): Campaign {
  return buildCampaign();
}

const REQUEST: ResolutionRequest = { actor: nationA.id, target: nationB.id, instrument: "military", rung: 4 };

describe("staged resolution selection", () => {
  it("writes the situation key the way the bank is keyed, branch and all", () => {
    expect(resolutionSituationKey(SITUATION)).toBe("military:high:success:any");
    expect(resolutionSituationKey({ ...SITUATION, valence: "failure", riskId: "escalation" })).toBe("military:high:failure:escalation");
  });

  it("draws the same sequence every time the same act is read", () => {
    const pool = bank();
    const first = selectResolutionSequence(pool, SITUATION, seeded("test-seed"));
    expect(first).toBeDefined();
    for (let i = 0; i < 20; i += 1) {
      expect(selectResolutionSequence(pool, SITUATION, seeded("test-seed"))?.id).toBe(first!.id);
    }
  });

  it("does not hand two campaigns the same sequence for the same move", () => {
    const pool = bank();
    const drawn = new Set(
      Array.from({ length: 40 }, (_, i) => selectResolutionSequence(pool, SITUATION, seeded(`seed-${i}`))?.id),
    );
    expect(drawn.size).toBeGreaterThan(1);
  });

  it("refuses a sequence written for another instrument, band, valence or branch", () => {
    const entry: ResolutionSequenceEntry = {
      id: "one",
      instrument: "military",
      rungBands: ["high"],
      valence: "failure",
      riskAffinity: ["escalation"],
      weight: 1,
    };
    const failure: ResolutionSequenceSituation = { instrument: "military", rungBand: "high", valence: "failure", riskId: "escalation" };
    expect(selectResolutionSequence([entry], failure, "s")?.id).toBe("one");
    expect(selectResolutionSequence([entry], { ...failure, riskId: "civilian-harm" }, "s")).toBeUndefined();
    expect(selectResolutionSequence([entry], { ...failure, riskId: undefined }, "s")).toBeUndefined();
    expect(selectResolutionSequence([entry], { ...failure, rungBand: "low" }, "s")).toBeUndefined();
    expect(selectResolutionSequence([entry], { ...failure, instrument: "covert" }, "s")).toBeUndefined();
    expect(selectResolutionSequence([{ ...entry, weight: 0 }], failure, "s")).toBeUndefined();
  });

  it("lets an unaffiliated failure sequence be the floor for every branch of its cell", () => {
    const floor: ResolutionSequenceEntry = { id: "floor", instrument: "covert", rungBands: ["mid"], valence: "failure", weight: 1 };
    for (const riskId of RISK_IDS.covert) {
      expect(selectResolutionSequence([floor], { instrument: "covert", rungBand: "mid", valence: "failure", riskId }, "s")?.id).toBe("floor");
    }
  });

  it("hands back nothing for the three instruments the bank deliberately leaves empty", () => {
    const pool = bank();
    for (const instrument of INSTRUMENT_IDS.filter((id) => id !== "military" && id !== "covert")) {
      for (const rungBand of ["low", "mid", "high"] as const) {
        expect(selectResolutionSequence(pool, { instrument, rungBand, valence: "success" }, "s")).toBeUndefined();
      }
    }
  });
});

describe("what a resolution carries", () => {
  it("carries no staged key at all when the caller banked nothing", () => {
    expect(stagedResolutionFor(ACT, "success", undefined, undefined)).toEqual({});
    expect(stagedResolutionFor(ACT, "success", undefined, [])).toEqual({});
  });

  it("carries no staged key when nothing in the bank answers the situation", () => {
    expect(stagedResolutionFor({ ...ACT, instrument: "diplomatic" }, "success", undefined, bank())).toEqual({});
  });

  it("hands the renderer a seed that names the same formation for the same act", () => {
    const staged = stagedResolutionFor(ACT, "success", undefined, bank()).staged;
    expect(staged?.situationKey).toBe("military:high:success:any");
    expect(staged?.seedParts).toEqual(["test-seed", "resolution-sequence", ACT.actor, ACT.target, "military", "4", "6"]);
    expect(stagedResolutionFor(ACT, "success", undefined, bank()).staged?.sequenceId).toBe(staged?.sequenceId);
  });

  it("resolves a diplomatic act exactly as it did before sequences existed", () => {
    const campaign = militaryBoard();
    const request: ResolutionRequest = { actor: nationA.id, target: nationB.id, instrument: "diplomatic", rung: 1 };
    const plain = resolveAction(campaign, request, createRngStreams(makeCampaignSeed("s")));
    const staged = resolveAction(campaign, request, createRngStreams(makeCampaignSeed("s")), "action", { sequences: bank() });
    expect(staged).toEqual(plain);
    expect(staged.ok && "staged" in staged).toBe(false);
  });

  it("stages a military act without changing a single effect it lands", () => {
    const campaign = militaryBoard();
    const plain = resolveAction(campaign, REQUEST, createRngStreams(makeCampaignSeed("s")));
    const staged = resolveAction(campaign, REQUEST, createRngStreams(makeCampaignSeed("s")), "action", { sequences: bank() });
    expect(staged.ok).toBe(true);
    if (!staged.ok || !plain.ok) throw new Error("the fixture should resolve");
    expect(staged.packet).toEqual(plain.packet);
    expect(staged.staged?.sequenceId).toMatch(/^military-high-failure-/);
    expect(staged.staged?.situationKey).toMatch(/^military:high:failure:/);
  });
});

describe("the wire desk's reading of a staged act", () => {
  const report = {
    act: ACT,
    valence: "success" as const,
    actorName: nationA.identity.name,
    targetName: nationB.identity.name,
    byPlayer: true,
    visible: true,
  };

  it("names the formation the sequence named", () => {
    const item = stagedResolutionFeedItem({ ...report, unit: "319th Interceptor Squadron" });
    expect(item.headline).toContain("319th Interceptor Squadron");
    expect(item.headline).toContain(nationB.identity.name);
    expect(item.facts?.subject).toBe("319th Interceptor Squadron");
    expect(item.kind).toBe("player-action");
    expect(item.turn).toBe(ACT.turn);
  });

  it("falls back to the government when no step named a formation", () => {
    const item = stagedResolutionFeedItem(report);
    expect(item.headline).toContain(nationA.identity.name);
    expect(item.facts?.subject).toBeUndefined();
  });

  it("says how it went, and never says it went the other way", () => {
    const partial = stagedResolutionFeedItem({ ...report, valence: "partial" });
    const failure = stagedResolutionFeedItem({ ...report, valence: "failure" });
    expect(partial.headline).toContain("short of the order");
    expect(failure.headline).toContain("did not");
    expect(stagedResolutionFeedItem(report).headline).not.toContain("did not");
  });

  it("keeps an unseen act off the public wire", () => {
    expect(stagedResolutionFeedItem({ ...report, visible: false, byPlayer: false }).visibility).toBe("intelligence");
    expect(stagedResolutionFeedItem({ ...report, visible: false, byPlayer: false }).kind).toBe("npc-action");
  });
});
