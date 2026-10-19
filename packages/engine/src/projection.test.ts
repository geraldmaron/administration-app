import { describe, expect, it } from "vitest";
import { CHARTER_PRESIDENTIAL_REPUBLIC } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { EXECUTIVE_ORDERS, projectOrder } from "./orders.js";
import { projectPolicyStance } from "./policy-draft.js";
import { openConflict } from "./conflicts.js";
import { projectPeace } from "./peace.js";
import { projectConfirmation } from "./congress.js";
import { projectForceAuthorization } from "./force-authorization.js";
import { projectAppropriation } from "./appropriation.js";
import { projectLobbyingOptions } from "./lobbying.js";
import type { Campaign, HillPostId } from "./state.js";
import { defaultFlagDesign, worldDataset } from "@admin/world";
import { makeCampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding, type FoundingChoices } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import {
  bundleAppropriation,
  bundleConfirmation,
  bundleForceAuthorization,
  bundleLobbying,
  bundleOrder,
  bundlePeace,
  bundlePolicyStance,
  materialDecisionGate,
  type ProjectionBundle,
} from "./projection.js";

const CHARTER = CHARTER_PRESIDENTIAL_REPUBLIC;

function foundedCampaign(): Campaign {
  const seed = makeCampaignSeed("projection-seed");
  const pool = generateFoundingPool(seed, worldDataset);
  const nation = worldDataset.nations.find((n) => n.playable)!;
  const charter = worldDataset.charters[0]!;
  const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0)!;
  const cabinet = Object.fromEntries(
    Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0]!.id]),
  );
  const choices: FoundingChoices = {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Test President",
    title: "President",
    charterId: charter.id,
    cradleId: cradle.id,
    flag: defaultFlagDesign,
    compactIds: [],
    cabinet,
    leader: { ...defaultLeaderDraft(), name: "Test President" },
  };
  return sealFounding(seed, worldDataset, choices);
}

function atWar(): Campaign {
  const campaign = buildCampaign();
  const conflict = openConflict(nationA.id, nationB.id, campaign.turn, "USA invades ALP");
  return { ...campaign, conflicts: { [conflict.id]: conflict } };
}


describe("the bundle adapters", () => {
  it("are deterministic: the same projection always bundles to the same bundle", () => {
    const campaign = buildCampaign();
    for (const order of EXECUTIVE_ORDERS) {
      const projection = projectOrder(campaign, CHARTER, order);
      expect(bundleOrder(campaign, projection)).toEqual(bundleOrder(campaign, projection));
    }
  });

  it("never emits an order figure the source projection did not carry", () => {
    const campaign = buildCampaign();
    for (const order of EXECUTIVE_ORDERS) {
      const projection = projectOrder(campaign, CHARTER, order);
      const bundle = bundleOrder(campaign, projection);
      // The odds are the exact chance the signature rolls against, unrestated.
      expect(bundle.odds?.chance).toBe(projection.challengeChance);
      // The cost is a passthrough, never rescaled.
      expect(bundle.cost).toEqual(projection.cost);
      // Every impact traces to a delta the projection itself priced.
      const sourceDomains = new Set([...Object.keys(projection.cost), ...Object.keys(order.nationEffects)]);
      for (const impact of bundle.impacts) expect(sourceDomains.has(impact.domain)).toBe(true);
    }
  });

  it("bands an order's impacts without inventing precision", () => {
    const campaign = buildCampaign();
    // The catalogue prices money as a share of output, so the sum only exists
    // against a country: the fixture's GDP is 50,000 and its treasury 1,000.
    const impactOf = (id: string) => {
      const order = EXECUTIVE_ORDERS.find((entry) => entry.id === id)!;
      const bundle = bundleOrder(campaign, projectOrder(campaign, CHARTER, order));
      return bundle.impacts.find((impact) => impact.domain === "treasury")!;
    };

    // Stafford relief allocates a statute's existing cash; the order cannot
    // show a second Treasury debit in the projection.
    const relief = EXECUTIVE_ORDERS.find((entry) => entry.id === "order-relief-program")!;
    const reliefBundle = bundleOrder(campaign, projectOrder(campaign, CHARTER, relief));
    expect(reliefBundle.impacts.some((impact) => impact.domain === "treasury")).toBe(false);
    expect(reliefBundle.impacts.some((impact) => impact.domain === "politics.protestPressure")).toBe(true);

    // Relief is the heaviest unilateral fiscal act left on the catalogue: no
    // order the office can sign alone reaches the major band.
    for (const order of EXECUTIVE_ORDERS.filter((entry) => entry.treasuryOfGdp !== undefined)) {
      expect(impactOf(order.id).band, order.id).not.toBe("major");
    }
  });

  it("bundles a policy stance with both of its horizons", () => {
    const campaign = buildCampaign();
    const projection = projectPolicyStance(campaign, CHARTER, "fiscal", "fiscal-austerity");
    const bundle = bundlePolicyStance(campaign, projection);
    expect(bundle.cost).toEqual(projection.enactment);
    expect(bundle.odds).toBeUndefined();
    const horizons = new Set(bundle.impacts.map((impact) => impact.horizon));
    for (const horizon of horizons) expect(["next-turn", "term"]).toContain(horizon);
    const sourceDomains = new Set([...Object.keys(projection.enactment), ...Object.keys(projection.perTurn)]);
    for (const impact of bundle.impacts) expect(sourceDomains.has(impact.domain)).toBe(true);
  });

  it("prices the enactment as modeled and the standing weekly effect as an estimate", () => {
    // The one-time signing cost is a priced packet; what the stance does every
    // week it stands is authored, not rolled — so the two horizons carry two
    // different confidences even though both come off the same projection.
    const campaign = foundedCampaign();
    const projection = projectPolicyStance(campaign, worldDataset.charters[0]!, "fiscal", "fiscal-austerity");
    const bundle = bundlePolicyStance(campaign, projection);
    for (const impact of bundle.impacts.filter((entry) => entry.horizon === "next-turn")) {
      expect(impact.confidence).toBe("modeled");
    }
    for (const impact of bundle.impacts.filter((entry) => entry.horizon === "term")) {
      expect(impact.confidence).toBe("estimated");
    }
    expect(bundle.impacts.some((impact) => impact.horizon === "term")).toBe(true);
  });

  it("flags a lobbying play's chamber-level row as not-modeled — it is one member's own gain, not the chamber math", () => {
    const campaign = foundedCampaign();
    const post: HillPostId = "post-house-speaker";
    const [projection] = projectLobbyingOptions(campaign, post);
    const bundle = bundleLobbying(campaign, projection!);
    const congress = bundle.impacts.find((impact) => impact.domain === "congress")!;
    expect(congress).toBeDefined();
    expect(congress.confidence).toBe("not-modeled");
  });

  it("produces all three confidence levels across the fixture corpus — none of the three is dead decoration", () => {
    const seen = new Set<string>();
    const founded = foundedCampaign();
    const charter = worldDataset.charters[0]!;
    for (const impact of bundlePolicyStance(founded, projectPolicyStance(founded, charter, "fiscal", "fiscal-austerity")).impacts) {
      seen.add(impact.confidence);
    }
    const post: HillPostId = "post-house-speaker";
    for (const projection of projectLobbyingOptions(founded, post)) {
      for (const impact of bundleLobbying(founded, projection).impacts) seen.add(impact.confidence);
    }
    expect(seen).toEqual(new Set(["modeled", "estimated", "not-modeled"]));
  });

  it("marks a counted vote as having no odds and states what it does not price", () => {
    const campaign = buildCampaign();
    const appropriation = bundleAppropriation(projectAppropriation(campaign));
    expect(appropriation.odds).toBeUndefined();
    expect(appropriation.clockTurns).toBeGreaterThan(0);

    const confirmation = bundleConfirmation(
      projectConfirmation(campaign, campaign.founding.leadRole, Object.keys(campaign.people)[0] as never),
    );
    expect(confirmation.odds).toBeUndefined();
    expect(confirmation.notModeled.length).toBeGreaterThan(0);
  });

  it("carries war on a force authorization and a peace table, with the AUMF clock", () => {
    const campaign = atWar();
    const aumf = bundleForceAuthorization(projectForceAuthorization(campaign, nationB.id));
    expect(aumf.risks).toContain("war");
    expect(aumf.clockTurns).toBe(52);
    expect(aumf.affected).toEqual([nationB.id]);

    const peace = projectPeace(campaign, Object.keys(campaign.conflicts)[0]!)!;
    const bundle = bundlePeace(peace);
    expect(bundle.risks).toContain("war");
    expect(bundle.reversibility).toBe("irreversible");
    expect(bundle.affected).toContain(nationB.id);
    expect(bundle.assumptions).toContain(peace.reasoning);
  });

  it("passes a lobbying play's own figures through unrestated, without an exact roll percentage for ordinary play", () => {
    // The bare fixture seats no Hill leadership, so this test founds a full
    // campaign the way the lobbying suite does.
    const campaign = foundedCampaign();
    const post: HillPostId = "post-house-speaker";
    for (const projection of projectLobbyingOptions(campaign, post)) {
      const bundle = bundleLobbying(campaign, projection);
      expect(bundle.odds).toBeUndefined();
      expect(bundle.assumptions.some((line) => line.includes(projection.forecast.likelihood))).toBe(true);
      expect(bundle.cost).toEqual(projection.play.cost);
      expect(bundle.affected).toEqual([post]);
      const sourceDomains = new Set([...Object.keys(projection.play.cost), "congress"]);
      for (const impact of bundle.impacts) expect(sourceDomains.has(impact.domain)).toBe(true);
    }
  });
});

// A bare bundle that trips no threshold, for the gate tests to add one at a time.
function routine(over: Partial<ProjectionBundle> = {}): ProjectionBundle {
  return {
    instrument: "executive-order",
    title: "Routine",
    impacts: [],
    cost: {},
    reversibility: "reversible",
    affected: [],
    assumptions: [],
    notModeled: [],
    risks: [],
    ...over,
  };
}

const impact = (domain: string) =>
  ({ domain, direction: "down", band: "slight", horizon: "next-turn", confidence: "modeled" }) as const;

describe("materialDecisionGate", () => {
  it("lets a routine act through", () => {
    expect(materialDecisionGate(routine(), 1000).material).toBe(false);
  });

  it("trips on a material share of the treasury, at the edge and not below it", () => {
    expect(materialDecisionGate(routine({ cost: { treasury: -50 } }), 1000).material).toBe(true);
    expect(materialDecisionGate(routine({ cost: { treasury: -49 } }), 1000).material).toBe(false);
  });

  it("trips on removal risk only when the odds are real", () => {
    const risky = routine({ risks: ["removal"], odds: { label: "Contested", chance: 0.25 } });
    const safe = routine({ risks: ["removal"], odds: { label: "Contested", chance: 0.24 } });
    expect(materialDecisionGate(risky, 1000).material).toBe(true);
    expect(materialDecisionGate(safe, 1000).material).toBe(false);
  });

  it("trips on war regardless of odds, on irreversibility, and on a clock", () => {
    expect(materialDecisionGate(routine({ risks: ["war"] }), 1000).material).toBe(true);
    expect(materialDecisionGate(routine({ reversibility: "irreversible" }), 1000).material).toBe(true);
    expect(materialDecisionGate(routine({ clockTurns: 52 }), 1000).material).toBe(true);
  });

  it("trips on cross-domain spread at three domains, not two", () => {
    const wide = routine({ impacts: [impact("treasury"), impact("stability"), impact("standing")] });
    const narrow = routine({ impacts: [impact("treasury"), impact("stability")] });
    expect(materialDecisionGate(wide, 1000).material).toBe(true);
    expect(materialDecisionGate(narrow, 1000).material).toBe(false);
  });

  it("is deterministic and names every tripped threshold", () => {
    const bundle = routine({ risks: ["war"], reversibility: "irreversible", clockTurns: 52 });
    const first = materialDecisionGate(bundle, 1000);
    expect(first).toEqual(materialDecisionGate(bundle, 1000));
    expect(first.reasons).toHaveLength(3);
  });
});
