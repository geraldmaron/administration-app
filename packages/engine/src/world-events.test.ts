import { describe, expect, it } from "vitest";
import { Nation, Relationship, type NationId, type OrgId } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { relationshipKey, type Campaign, type Conflict, type NationCondition } from "./state.js";
import { apply } from "./effects.js";
import { QUESTION_TERMS } from "./willingness.js";
import { applyMembership, worldEventPhase } from "./world-events.js";
import { TEMPLATES } from "./world-event-templates.js";
import { onEdge } from "./world-events-filing.js";
import { campaignPhaseSequence, weekGroups } from "./turn-phases.js";
import { foundedForBalance } from "./balance-harness.js";

// Every kept family is typed, decided by its parties through the willingness
// model, names the fields it writes, and files from its own bank. A clash on a
// border is never a war.

const USA = nationA.id as NationId;
const ALP = nationB.id as NationId;
const BOR = "BOR" as NationId;
const CRU = "CRU" as NationId;

const borNation = Nation.parse({
  ...nationB,
  id: "BOR",
  identity: { ...nationB.identity, name: "Boria" },
  geo: { ...nationB.geo, neighbors: ["ALP", "CRU"] },
  traits: { ...nationB.traits, aggression: 0.9, riskTolerance: 0.9, legalism: 0.05, isolationism: 0, vengefulness: 0.8 },
});
const alpNation = Nation.parse({ ...nationB, geo: { ...nationB.geo, neighbors: ["BOR", "CRU"] } });
const cruNation = Nation.parse({ ...nationB, id: "CRU", identity: { ...nationB.identity, name: "Crusia" }, geo: { ...nationB.geo, neighbors: ["ALP", "BOR"] } });

function edge(from: NationId, to: NationId, over: Partial<Relationship> = {}): Relationship {
  return Relationship.parse({
    from,
    to,
    trust: 0.2,
    alignment: 0.1,
    tension: 0.1,
    tradeDependence: 0.2,
    militaryThreat: 0.1,
    treaties: [],
    grudges: [],
    history: [],
    ...over,
  });
}

const HOSTILE = { trust: -0.7, tension: 0.9 };

function world(pairs: readonly [NationId, NationId, Partial<Relationship>][]): Campaign {
  const base = buildCampaign();
  return {
    ...base,
    nations: {
      ...base.nations,
      [ALP]: { base: alpNation, stats: alpNation.stats, traits: alpNation.traits },
      [BOR]: { base: borNation, stats: borNation.stats, traits: borNation.traits },
      [CRU]: { base: cruNation, stats: cruNation.stats, traits: cruNation.traits },
    },
    relationships: Object.fromEntries(pairs.map(([from, to, over]) => [relationshipKey(from, to), edge(from, to, over)])),
  };
}

const packetsOf = (campaign: Campaign) => worldEventPhase(campaign);

describe("the world-event templates", () => {
  it("each kept family names its question, its threshold, the fields it writes and a bank of three and three", () => {
    expect(TEMPLATES.map((template) => template.family)).toEqual([
      "sanctions-package",
      "border-clash",
      "accession",
      "disaster-aid",
      "election-interference",
    ]);
    for (const template of TEMPLATES) {
      expect(QUESTION_TERMS[template.question], template.id).toBeDefined();
      expect(Number.isFinite(template.threshold), template.id).toBe(true);
      expect(template.writes.length, template.id).toBeGreaterThan(0);
      expect(template.bank.headlines).toHaveLength(3);
      expect(template.bank.standfirsts).toHaveLength(3);
    }
  });

  it("runs on the third office day, after the wars have moved", () => {
    const days = weekGroups(campaignPhaseSequence(foundedForBalance("world-events-days").charter));
    expect(days[2]!.map((phase) => phase.id)).toContain("worldEventPhase");
  });
});

describe("a border clash", () => {
  const rivals = world([
    [BOR, ALP, { ...HOSTILE, grudges: [] }],
    [ALP, BOR, HOSTILE],
    [USA, ALP, {}],
    [ALP, USA, {}],
  ]);

  it("is decided by the government that fires, through the willingness model, and stamped", () => {
    const clashes = packetsOf(rivals).filter((packet) => packet.provenance?.decision?.question === "world-event");
    expect(clashes.length).toBeGreaterThan(0);
    const decision = clashes[0]!.provenance!.decision!;
    expect(decision.acts).toBe(true);
    expect(decision.terms.map((term) => term.key)).toContain("border");
  });

  it("never opens a war", () => {
    for (const packet of packetsOf(rivals)) {
      expect(packet.effects.some((effect) => effect.kind === "conflict")).toBe(false);
    }
  });

  it("files a wire item from its own bank and leaves a grudge on the side that was hit", () => {
    const [clash] = packetsOf(rivals).filter((packet) => packet.provenance?.decision?.question === "world-event");
    const feed = clash!.effects.find((effect) => effect.kind === "feed");
    expect(feed && "items" in feed && feed.items[0]!.headline).toMatch(/border|frontier/);
    expect(clash!.effects.some((effect) => effect.kind === "relationship" && effect.addGrudge !== undefined)).toBe(true);
  });

  it("waits out its cooldown on the same pair", () => {
    const after = packetsOf(rivals).reduce((campaign, packet) => apply(campaign, packet), rivals);
    const again = packetsOf({ ...after, turn: after.turn + 1 }).filter((packet) => packet.provenance?.decision?.question === "world-event");
    expect(again).toHaveLength(0);
  });

  it("answers the same week the same way on every replay", () => {
    expect(packetsOf(rivals)).toEqual(packetsOf(rivals));
  });
});

describe("a bloc's sanctions package", () => {
  const union = "ORG-EU" as OrgId;
  const war: Conflict = {
    id: "war:CRU:ALP:1",
    aggressor: CRU,
    defender: ALP,
    joined: { aggressor: [], defender: [] },
    startedTurn: 1,
    cause: "an invasion",
    intensity: 0.6,
    warSupport: { aggressor: 0.6, defender: 0.7 },
    exhaustion: { aggressor: 0.1, defender: 0.2 },
    status: "active",
    beats: [],
  };
  function bloc(): Campaign {
    const base = world([
      [ALP, CRU, HOSTILE],
      [BOR, CRU, HOSTILE],
      [CRU, ALP, HOSTILE],
      [CRU, BOR, HOSTILE],
      [ALP, BOR, {}],
      [BOR, ALP, {}],
    ]);
    const joined = [ALP, BOR].reduce((campaign, nation) => applyMembership(campaign, { kind: "membership", nation, org: union, change: "accede" }), base);
    return { ...joined, conflicts: { [war.id]: war } };
  }

  it("is each member's vote, stamped as the member's own decision, and lands on every member's edge", () => {
    const sanctions = packetsOf(bloc()).filter((packet) => packet.provenance?.decision?.question === "org-vote");
    expect(sanctions.map((packet) => packet.provenance!.decision!.actor).sort()).toEqual([ALP, BOR]);
    for (const packet of sanctions) expect(packet.provenance!.decision!.subject).toBe(CRU);
  });
});

describe("relief after a disaster", () => {
  it("comes from a neighbor that weighs the need, and is stamped as its decision to send aid", () => {
    const flooded: NationCondition = {
      id: "condition:flood:ALP:1",
      nation: ALP,
      kind: "flood",
      scope: "nation",
      severity: 0.8,
      startedTurn: 1,
      status: "active",
      beats: [],
    } as NationCondition;
    const campaign = { ...world([[BOR, ALP, { trust: 0.7, tension: 0.05 }], [ALP, BOR, { trust: 0.6 }]]), conditions: { [flooded.id]: flooded } };
    const aid = packetsOf(campaign).filter((packet) => packet.provenance?.decision?.question === "send-aid");
    expect(aid.map((packet) => packet.provenance!.decision!.actor)).toContain(BOR);
  });
});

describe("a membership change", () => {
  it("accedes once and withdraws cleanly, overriding the authored roster", () => {
    const campaign = world([]);
    const org = "ORG-ASEAN" as OrgId;
    const joined = applyMembership(applyMembership(campaign, { kind: "membership", nation: ALP, org, change: "accede" }), {
      kind: "membership",
      nation: ALP,
      org,
      change: "accede",
    });
    expect(joined.nations[ALP]!.memberships).toEqual([org]);
    const left = applyMembership(joined, { kind: "membership", nation: ALP, org, change: "withdraw" });
    expect(left.nations[ALP]!.memberships).toEqual([]);
  });
});

describe("a reaction toward a government the graph holds no edge to", () => {
  it("lands only on edges the graph holds, so the week applies on the real world", () => {
    // A seed whose first week passes a bloc's sanctions on Russia, the reaction
    // that threw here: Russia holds no edge toward every member that applies them.
    const { campaign } = foundedForBalance("a");
    const packets = worldEventPhase(campaign);
    expect(packets.some((packet) => packet.narration.summary.includes("applied the bloc's sanctions"))).toBe(true);
    for (const packet of packets) {
      for (const effect of packet.effects) {
        if (effect.kind === "relationship") expect(campaign.relationships[relationshipKey(effect.from, effect.to)], `${effect.from} -> ${effect.to}`).toBeDefined();
      }
    }
    expect(() => packets.reduce((state, packet) => apply(state, packet), campaign)).not.toThrow();
  });

  it("drops the reaction rather than inventing the edge", () => {
    const campaign = buildCampaign();
    const missing = { kind: "relationship" as const, from: "ZZZ" as NationId, to: ALP, deltas: { trust: -0.03 } };
    expect(onEdge(campaign, missing)).toEqual([]);
  });
});
