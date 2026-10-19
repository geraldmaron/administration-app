import { describe, expect, it } from "vitest";
import { FOUNDING_DYADS, worldDataset, type NationId } from "@admin/world";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { makeCampaignSeed } from "./rng.js";
import { applyFoundingDyads } from "./founding-dyads.js";
import { buildInitialRelationships, deriveRelationship } from "./relationship-graph.js";
import { relationshipKey } from "./state-campaign.js";
import { signTreaty, TREATY_TERMS } from "./treaties.js";
import { selectRelationship } from "./state-selectors.js";

// The sourced pairs are laid over the derivation and nothing else is. Every
// edge a row does not name has to come out exactly as the derivation made it,
// and every edge a row names has to move only the way its kind says.

const USA = "USA" as NationId;
const nations = worldDataset.nations;
const byId = new Map(nations.map((nation) => [nation.id as string, nation]));
const named = new Set(FOUNDING_DYADS.flatMap(({ pair: [a, b] }) => [`${a}->${b}`, `${b}->${a}`]));

function sealed(seedText: string) {
  const seed = makeCampaignSeed(seedText);
  const nation = nations.find((entry) => entry.playable)!;
  const charter = worldDataset.charters.find((entry) => entry.id === nation.identity.government)!;
  const slate = draftCabinetCandidates(charter, nation.id, generateFoundingPool(seed, worldDataset));
  const cabinet = Object.fromEntries(Object.entries(slate).map(([role, people]) => [role, people[0]!.id]));
  return sealFounding(seed, worldDataset, { cabinet, leader: { ...defaultLeaderDraft(), name: "Test President" } });
}

describe("the founding dyads", () => {
  const graph = buildInitialRelationships(nations, USA);

  it("leaves every edge no row names exactly as the derivation made it", () => {
    let checked = 0;
    for (const edge of Object.values(graph)) {
      if (named.has(`${edge.from}->${edge.to}`)) continue;
      expect(edge).toEqual(deriveRelationship(byId.get(edge.from)!, byId.get(edge.to)!));
      checked += 1;
    }
    expect(checked).toBeGreaterThan(8000);
  });

  it("moves both directions of a named pair, and only toward the row's reading", () => {
    for (const { pair, kind } of FOUNDING_DYADS) {
      // An adversarial row only hardens an edge; a friendly one only softens it.
      const sign = kind === "close" || kind === "dependent" ? -1 : 1;
      for (const [from, to] of [pair, [pair[1], pair[0]]] as const) {
        const derived = deriveRelationship(byId.get(from)!, byId.get(to)!);
        const laid = graph[relationshipKey(from as NationId, to as NationId)]!;
        const label = `${from}->${to}`;
        expect(sign * (derived.trust - laid.trust), label).toBeGreaterThanOrEqual(0);
        expect(sign * (laid.tension - derived.tension), label).toBeGreaterThanOrEqual(0);
        expect(sign * (laid.militaryThreat - derived.militaryThreat), label).toBeGreaterThanOrEqual(0);
        expect({ ...laid, trust: 0, tension: 0, militaryThreat: 0 }).toEqual({ ...derived, trust: 0, tension: 0, militaryThreat: 0 });
      }
    }
  });

  it("moves a row with levels to exactly the nearer of its level and the derived reading", () => {
    const round3 = (v: number) => Math.round(v * 1000) / 1000 || 0;
    for (const row of FOUNDING_DYADS.filter((entry) => entry.levels)) {
      const hard = row.kind === "hostile" || row.kind === "rivalrous" || row.kind === "cool";
      const pick = (derived: number, level: number, raise: boolean) => round3(raise ? Math.max(derived, level) : Math.min(derived, level));
      row.pair.forEach((from, index) => {
        const to = row.pair[1 - index]!;
        const derived = deriveRelationship(byId.get(from)!, byId.get(to)!);
        const laid = graph[relationshipKey(from as NationId, to as NationId)]!;
        const label = `${from}->${to}`;
        expect(laid.trust, label).toBe(pick(derived.trust, row.levels!.trust[index]!, !hard));
        expect(laid.tension, label).toBe(pick(derived.tension, row.levels!.tension, hard));
        expect(laid.militaryThreat, label).toBe(pick(derived.militaryThreat, row.levels!.threat[index]!, hard));
      });
    }
  });

  it("reads every rivalry and enmity row as adverse at founding, both ways", () => {
    for (const row of FOUNDING_DYADS.filter((entry) => entry.kind === "hostile" || entry.kind === "rivalrous")) {
      for (const [from, to] of [row.pair, [row.pair[1], row.pair[0]]] as const) {
        const laid = graph[relationshipKey(from as NationId, to as NationId)]!;
        expect(laid.trust < -0.1 || laid.tension > 0.35, `${from}->${to}`).toBe(true);
      }
    }
  });

  it("gives every sourced pair a working relationship, even two governments with no border, compact or trade", () => {
    for (const { pair } of FOUNDING_DYADS) {
      expect(graph[relationshipKey(pair[0] as NationId, pair[1] as NationId)], pair.join("-")).toBeDefined();
      expect(graph[relationshipKey(pair[1] as NationId, pair[0] as NationId)], pair.join("-")).toBeDefined();
    }
    expect(graph[relationshipKey("IRN" as NationId, "ISR" as NationId)]!.trust).toBeLessThanOrEqual(-0.9);
  });

  it("is its own fixed point: laying the rows twice changes nothing", () => {
    expect(applyFoundingDyads(graph, USA)).toEqual(graph);
  });

  it("reads a defensive enemy as an enemy without reading it as an army", () => {
    const cuba = graph[relationshipKey(USA, "CUB" as NationId)]!;
    const russia = graph[relationshipKey(USA, "RUS" as NationId)]!;
    expect(cuba.trust).toBeLessThan(-0.3);
    expect(cuba.militaryThreat).toBeLessThan(0.35);
    expect(russia.militaryThreat).toBeGreaterThan(0.55);
  });

  for (const seedText of ["foreign-truth-gate", "fixture-opening-d", "fixture-opening-r", "fixture-opening-i"]) {
    it(`leaves no arms treaty to sign with North Korea (${seedText})`, () => {
      const campaign = sealed(seedText);
      const korea = selectRelationship(campaign, USA, "PRK" as NationId)!;
      expect(korea.trust).toBeLessThan(TREATY_TERMS["arms-control"].minTrust);
      const charter = worldDataset.charters.find((entry) => entry.id === byId.get("USA")!.identity.government)!;
      const result = signTreaty(campaign, charter, "arms-control", "PRK" as NationId);
      expect(result.ok).toBe(false);
    });
  }
});
