import { describe, expect, it } from "vitest";
import { Nation, Relationship, type NationId, type OrgId } from "@admin/world";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { relationshipKey, type Campaign, type Conflict, type NationCondition } from "./state.js";
import { apply, type EffectPacket } from "./effects.js";
import { QUESTION_TERMS } from "./willingness.js";
import { applyMembership, clashHazard, worldEventPhase } from "./world-events.js";
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

  const isClash = (packet: EffectPacket) => packet.provenance?.decision?.question === "world-event";
  // A willing pair clashes on a weekly hazard, so the first week it does is
  // found by walking the weeks rather than assumed to be this one.
  const firstClashWeek = (campaign: Campaign): Campaign => {
    for (let turn = campaign.turn; turn < campaign.turn + 600; turn += 1) {
      if (packetsOf({ ...campaign, turn }).some(isClash)) return { ...campaign, turn };
    }
    throw new Error("no clash in 600 weeks");
  };
  const clashing = firstClashWeek(rivals);

  it("is decided by the government that fires, through the willingness model, and stamped", () => {
    const clashes = packetsOf(clashing).filter(isClash);
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
    const [clash] = packetsOf(clashing).filter(isClash);
    const feed = clash!.effects.find((effect) => effect.kind === "feed");
    expect(feed && "items" in feed && feed.items[0]!.headline).toMatch(/border|frontier/);
    expect(clash!.effects.some((effect) => effect.kind === "relationship" && effect.addGrudge !== undefined)).toBe(true);
  });

  it("rests after a clash before the pair can clash again", () => {
    const after = packetsOf(clashing).reduce((campaign, packet) => apply(campaign, packet), clashing);
    for (let weeks = 1; weeks < 4; weeks += 1) {
      expect(packetsOf({ ...after, turn: after.turn + weeks }).filter(isClash)).toHaveLength(0);
    }
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

describe("border clashes come in episodes", () => {
  const rivals = world([
    [BOR, ALP, HOSTILE],
    [ALP, BOR, HOSTILE],
    [USA, ALP, {}],
    [ALP, USA, {}],
  ]);
  const clashedAt = (campaign: Campaign, ...weeksAgo: number[]): Campaign => {
    const key = relationshipKey(BOR, ALP);
    const history = weeksAgo.map((weeks) => ({ turn: campaign.turn - weeks, kind: "world-event:border-clash", description: "a clash" }));
    return { ...campaign, turn: campaign.turn, relationships: { ...campaign.relationships, [key]: { ...campaign.relationships[key]!, history } } };
  };
  const at = (turn: number) => ({ ...rivals, turn });

  it("rests after a clash, then runs hotter for a season than a quiet pair does", () => {
    const quiet = clashHazard(at(60), BOR, ALP, []);
    expect(quiet).toBeGreaterThan(0);
    expect(clashHazard(clashedAt(at(60), 2), BOR, ALP, [])).toBe(0);
    expect(clashHazard(clashedAt(at(60), 6), BOR, ALP, [])).toBeGreaterThan(quiet * 2);
    expect(clashHazard(clashedAt(at(60), 40), BOR, ALP, [])).toBe(quiet);
  });

  it("does not run a pair on one fixed interval", () => {
    let campaign = at(1);
    const turns: number[] = [];
    for (let week = 0; week < 1500 && turns.length < 6; week += 1) {
      const packets = packetsOf(campaign);
      if (packets.some((packet) => packet.provenance?.decision?.question === "world-event")) turns.push(campaign.turn);
      campaign = { ...packets.reduce((c, packet) => apply(c, packet), campaign), turn: campaign.turn + 1 };
    }
    expect(turns.length).toBeGreaterThanOrEqual(4);
    const gaps = new Set(turns.slice(1).map((turn, i) => turn - turns[i]!));
    expect(gaps.size).toBeGreaterThan(1);
  });

  it("files one clash for the pair in a week, though both sides are willing", () => {
    for (let turn = 1; turn < 400; turn += 1) {
      const clashes = packetsOf(at(turn)).filter((packet) => packet.provenance?.decision?.question === "world-event");
      expect(clashes.length).toBeLessThanOrEqual(1);
    }
  });
});

describe("a clash on a treaty partner's border", () => {
  const NATO = "ORG-NATO" as OrgId;
  const guarded = (() => {
    const base = world([
      [BOR, ALP, HOSTILE],
      [ALP, BOR, HOSTILE],
      [CRU, BOR, {}],
      [USA, ALP, {}],
      [ALP, USA, {}],
    ]);
    const join = (c: Campaign, id: NationId) => applyMembership(c, { kind: "membership", nation: id, org: NATO, change: "accede" });
    return join(join(base, ALP), CRU);
  })();

  it("is far less likely where the side that would be hit sits under a defense treaty", () => {
    const open = world([[BOR, ALP, HOSTILE], [ALP, BOR, HOSTILE]]);
    expect(clashHazard({ ...guarded, turn: 60 }, BOR, ALP, [])).toBeLessThan(clashHazard({ ...open, turn: 60 }, BOR, ALP, []) / 5);
  });

  it("brings the guarantors to consult, and the consultation deters the next one", () => {
    let campaign = { ...guarded, turn: 1 };
    let consulted: EffectPacket | undefined;
    for (let week = 0; week < 20000 && !consulted; week += 1) {
      consulted = packetsOf(campaign).find((packet) => packet.narration.summary.includes("consult"));
      if (!consulted) campaign = { ...campaign, turn: campaign.turn + 1 };
    }
    expect(consulted).toBeDefined();
    const marked = consulted!.effects.find((effect) => effect.kind === "relationship" && effect.from === CRU && effect.to === BOR);
    expect(marked && "addHistory" in marked && marked.addHistory?.kind).toBe("world-event:consultation");
    const after = packetsOf(campaign).reduce((c, packet) => apply(c, packet), campaign);
    const later = { ...after, turn: after.turn + 30 };
    const forget = (c: Campaign, from: NationId): Campaign => {
      const key = relationshipKey(from, BOR);
      const edge = c.relationships[key]!;
      return { ...c, relationships: { ...c.relationships, [key]: { ...edge, history: edge.history.filter((e) => e.kind !== "world-event:consultation") } } };
    };
    const unconsulted = forget(forget(later, CRU), ALP);
    expect(clashHazard(later, BOR, ALP, [])).toBeLessThan(clashHazard(unconsulted, BOR, ALP, []));
  });
});
