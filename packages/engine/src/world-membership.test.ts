import { describe, expect, it } from "vitest";
import { Nation, Relationship, type NationId, type OrgId } from "@admin/world";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { createRngStreams } from "./rng.js";
import { apply } from "./effects.js";
import { relationshipKey, type Campaign } from "./state.js";
import { applyMembership } from "./world-events.js";
import { liveMembers } from "./world-events-filing.js";
import { rosterPackets, standingNotice, SUMMIT_EVERY_WEEKS } from "./world-membership.js";

const OPEC = "ORG-OPEC-PLUS" as OrgId;
const EU = "ORG-EU" as OrgId;
const IDS = ["AAA", "BBB", "CCC", "DDD"] as const;
const LEAVER = "AAA" as NationId;

function nation(id: string, traits: Partial<Nation["traits"]> = {}): Nation {
  return Nation.parse({ ...nationB, id, identity: { ...nationB.identity, name: id }, geo: { ...nationB.geo, neighbors: [] }, traits: { ...nationB.traits, ...traits } });
}

function edge(from: NationId, to: NationId, trust: number): Relationship {
  return Relationship.parse({ from, to, trust, alignment: 0, tension: 0.3, tradeDependence: 0.01, militaryThreat: 0, treaties: [], grudges: [], history: [] });
}

// Four members of one body; the first has fallen out with the other three, has
// almost no trade with them and would rather stand alone.
function body(org: OrgId, leaverTrust = -0.6): Campaign {
  const base = buildCampaign();
  const nations = IDS.map((id) => nation(id, id === LEAVER ? { isolationism: 0.95, legalism: 0.05 } : {}));
  const edges = IDS.flatMap((from) => IDS.filter((to) => to !== from).map((to) => edge(from as NationId, to as NationId, from === LEAVER ? leaverTrust : 0.3)));
  const seeded: Campaign = {
    ...base,
    turn: SUMMIT_EVERY_WEEKS,
    nations: { ...base.nations, ...Object.fromEntries(nations.map((n) => [n.id, { base: n, stats: n.stats, traits: n.traits }])) },
    relationships: { ...base.relationships, ...Object.fromEntries(edges.map((r) => [relationshipKey(r.from, r.to), r])) },
  };
  return IDS.reduce((c, id) => applyMembership(c, { kind: "membership", nation: id as NationId, org, change: "accede" }), seeded);
}

const summit = (campaign: Campaign) => rosterPackets(campaign, createRngStreams(campaign.seed));
const withdrawn = (packets: ReturnType<typeof summit>) =>
  packets.some((packet) => packet.effects.some((effect) => effect.kind === "membership" && effect.change === "withdraw"));
const after = (campaign: Campaign, weeks: number): Campaign => {
  const applied = summit(campaign).reduce((c, packet) => apply(c, packet), campaign);
  return { ...applied, turn: applied.turn + weeks };
};

describe("leaving a body", () => {
  it("gives notice first and leaves nobody the same summit", () => {
    const packets = summit(body(OPEC));
    expect(withdrawn(packets)).toBe(false);
    expect(packets.some((packet) => packet.narration.summary.includes("gives notice"))).toBe(true);
  });

  it("goes at the first summit after the body's notice has run", () => {
    const noticed = after(body(OPEC), SUMMIT_EVERY_WEEKS);
    expect(standingNotice(noticed, LEAVER, OPEC)).toBe(SUMMIT_EVERY_WEEKS);
    expect(withdrawn(summit(noticed))).toBe(true);
  });

  it("waits out a long notice: two years under the EU's", () => {
    const noticed = after(body(EU), SUMMIT_EVERY_WEEKS);
    expect(standingNotice(noticed, LEAVER, EU)).toBeDefined();
    expect(withdrawn(summit(noticed))).toBe(false);
    expect(withdrawn(summit({ ...noticed, turn: SUMMIT_EVERY_WEEKS * 9 }))).toBe(true);
  });

  it("takes the notice back if the quarrel is mended before it runs out", () => {
    const noticed = after(body(OPEC), SUMMIT_EVERY_WEEKS);
    const mended = Object.fromEntries(
      Object.entries(noticed.relationships).map(([key, r]) => [key, r.from === LEAVER ? { ...r, trust: 0.6, tradeDependence: 0.4 } : r]),
    );
    const packets = summit({ ...noticed, relationships: mended });
    expect(withdrawn(packets)).toBe(false);
    expect(packets.some((packet) => packet.narration.summary.includes("withdraws its notice"))).toBe(true);
    const revoked = packets.reduce((c, packet) => apply(c, packet), { ...noticed, relationships: mended });
    expect(standingNotice(revoked, LEAVER, OPEC)).toBeUndefined();
  });

  it("starts over after a member who left is admitted again: the old notice is spent", () => {
    const noticed = after(body(OPEC), SUMMIT_EVERY_WEEKS);
    const gone = summit(noticed).reduce((c, packet) => apply(c, packet), noticed);
    expect(liveMembers(gone, OPEC)).not.toContain(LEAVER);
    const readmitted = applyMembership({ ...gone, turn: gone.turn + SUMMIT_EVERY_WEEKS * 2 }, { kind: "membership", nation: LEAVER, org: OPEC, change: "accede" });
    expect(standingNotice(readmitted, LEAVER, OPEC)).toBeUndefined();
    const packets = summit(readmitted);
    expect(withdrawn(packets)).toBe(false);
    expect(packets.some((packet) => packet.narration.summary.includes("gives notice"))).toBe(true);
    const renoticed = packets.reduce((c, packet) => apply(c, packet), readmitted);
    expect(standingNotice(renoticed, LEAVER, OPEC)).toBe(readmitted.turn);
  });

  it("leaves a member that still trusts the others in its seat", () => {
    expect(summit(body(OPEC, 0.2))).toEqual([]);
  });
});
