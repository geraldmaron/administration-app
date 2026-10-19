import { describe, expect, it } from "vitest";
import { Nation, Relationship, type NationId } from "@admin/world";
import { buildCampaign, nationA, relationship } from "./__fixtures__/campaign.js";
import { apply, type EffectPacket } from "./effects.js";
import { openConflict } from "./conflicts.js";
import { UNILATERAL_FORCE_COST } from "./congress.js";
import { joinConflict, joinCost, joinPriceScale, projectJoin, selectJoinableConflicts } from "./war-entry.js";
import { relationshipKey, type Campaign, type Conflict } from "./state.js";

const USA = nationA.id;
const ALP = "ALP" as NationId;
const CAS = "CAS" as NationId;

/** Alpland invades Castrel; the President's government is a friend of the victim and on speaking terms with the invader. */
function somebodyElsesWar(arsenal = { warheads: 0, deliveryTriad: false }): { campaign: Campaign; conflict: Conflict } {
  const base = buildCampaign();
  const invader = Nation.parse({
    ...nationA,
    id: ALP,
    identity: { ...nationA.identity, name: "Alpland" },
    stats: { ...nationA.stats, military: { ...nationA.stats.military, arsenal } },
  });
  const victim = Nation.parse({ ...nationA, id: CAS, identity: { ...nationA.identity, name: "Castrel" } });
  const withSides: Campaign = {
    ...base,
    nations: {
      ...base.nations,
      [ALP]: { base: invader, stats: invader.stats, traits: invader.traits },
      [CAS]: { base: victim, stats: victim.stats, traits: victim.traits },
    },
    relationships: {
      ...base.relationships,
      [relationshipKey(USA, CAS)]: Relationship.parse({ ...relationship, from: USA, to: CAS, trust: 0.6 }),
      [relationshipKey(USA, ALP)]: Relationship.parse({ ...relationship, from: USA, to: ALP }),
      [relationshipKey(ALP, USA)]: Relationship.parse({ ...relationship, from: ALP, to: USA }),
    },
  };
  const conflict = openConflict(ALP, CAS, withSides.turn, "Alpland invades Castrel.");
  return { campaign: { ...withSides, conflicts: { [conflict.id]: conflict } }, conflict };
}

function metricCharged(packet: EffectPacket, key: "standing" | "stability" | "militaryReadiness"): number {
  return packet.effects.reduce((total, effect) => total + (effect.kind === "metric" ? (effect.deltas[key] ?? 0) : 0), 0);
}

function authorizedAgainst(campaign: Campaign, target: NationId): Campaign {
  const authorization = { id: `aumf:${target}:${campaign.turn}`, title: "Authorization for Use of Military Force", target, enactedTurn: campaign.turn, expiresTurn: campaign.turn + 52, vote: [] };
  return { ...campaign, congress: { ...campaign.congress, authorizations: [...campaign.congress.authorizations, authorization] } };
}

describe("entering somebody else's war goes through War Powers", () => {
  it("opens the forty-eight hour report and the record of acting without a vote", () => {
    const { campaign, conflict } = somebodyElsesWar();
    const result = joinConflict(campaign, USA, conflict.id, "defender");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = apply(campaign, result.packet);
    expect(after.security.warPowers.obligations).toEqual([
      expect.objectContaining({ target: ALP, kind: "hostilities", description: "Forces sent into the war against Alpland: forces introduced into hostilities." }),
    ]);
    expect(after.congress.unauthorized.map((action) => action.target)).toEqual([ALP]);
    expect(after.congress.disposition).toBeLessThan(campaign.congress.disposition);
  });

  it("charges exactly the price it stated before the President chose", () => {
    const { campaign, conflict } = somebodyElsesWar();
    const quoted = joinCost(campaign, conflict, "defender");
    const result = joinConflict(campaign, USA, conflict.id, "defender");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(metricCharged(result.packet, "standing")).toBeCloseTo(quoted.standing, 9);
    expect(metricCharged(result.packet, "stability")).toBeCloseTo(quoted.stability, 9);
    expect(metricCharged(result.packet, "militaryReadiness")).toBeCloseTo(quoted.militaryReadiness, 9);
    expect(quoted.standing).toBeCloseTo(0.04 + UNILATERAL_FORCE_COST.standing, 9);
  });

  it("owes the report but runs no withdrawal clock, and costs nothing extra, when Congress has voted", () => {
    const { campaign: open, conflict } = somebodyElsesWar();
    const campaign = authorizedAgainst(open, ALP);
    expect(joinCost(campaign, conflict, "defender").standing).toBeCloseTo(0.04, 9);
    expect(projectJoin(campaign, conflict.id, "defender")?.warPowers.kind).toBe("authorized");
    const result = joinConflict(campaign, USA, conflict.id, "defender");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = apply(campaign, result.packet);
    expect(after.security.warPowers.obligations.map((obligation) => obligation.target)).toEqual([ALP]);
    expect(after.congress.unauthorized).toEqual([]);
  });

  it("refuses the entry where the office's own authority does not reach, and still offers the war so the screen can say why", () => {
    const { campaign: open, conflict } = somebodyElsesWar();
    // Force already in action elsewhere without a vote: a second front is not the office's to open.
    const campaign: Campaign = {
      ...open,
      congress: { ...open.congress, unauthorized: [{ id: `unauthorized:CAS:${open.turn}`, target: CAS, turn: open.turn, rung: 4, description: "Air strikes against Castrel, ordered without a vote." }] },
    };
    const result = joinConflict(campaign, USA, conflict.id, "defender");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missingCapability).toMatch(/congressional authorization/);
    expect(projectJoin(campaign, conflict.id, "defender")?.refusal).toMatch(/congressional authorization/);
    expect(selectJoinableConflicts(campaign, USA).map((option) => option.side)).toContain("defender");
  });

  it("warns before the join when the government on the other side is nuclear-armed", () => {
    const quiet = somebodyElsesWar();
    expect(projectJoin(quiet.campaign, quiet.conflict.id, "defender")?.deterrence.defenderNuclear).toBe(false);
    const armed = somebodyElsesWar({ warheads: 5_000, deliveryTriad: true });
    expect(projectJoin(armed.campaign, armed.conflict.id, "defender")?.deterrence).toMatchObject({ defenderNuclear: true });
  });

  it("names the governments in the sentence the join is remembered by", () => {
    const { campaign, conflict } = somebodyElsesWar();
    const result = joinConflict(campaign, USA, conflict.id, "defender");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.narration.summary).toBe("The United States enters the war beside Castrel, against Alpland.");
  });
});

// Going to war against a nuclear power, or a far stronger enemy, spends more of
// the force than going in against a small state; the preview is still the
// price the join charges.
describe("the join's price follows the enemy and the ground", () => {
  it("costs more of the force against an enemy with an arsenal", () => {
    const plain = somebodyElsesWar();
    const armed = somebodyElsesWar({ warheads: 300, deliveryTriad: true });
    expect(joinCost(armed.campaign, armed.conflict, "defender").militaryReadiness).toBeLessThan(joinCost(plain.campaign, plain.conflict, "defender").militaryReadiness);
  });

  it("stays inside half and two and a half times the base", () => {
    const { campaign, conflict } = somebodyElsesWar({ warheads: 300, deliveryTriad: true });
    const scale = joinPriceScale(campaign, USA, conflict, "defender");
    expect(scale).toBeGreaterThanOrEqual(0.5);
    expect(scale).toBeLessThanOrEqual(2.5);
  });

  it("charges the scaled price it previewed", () => {
    const { campaign, conflict } = somebodyElsesWar({ warheads: 300, deliveryTriad: true });
    const quoted = joinCost(campaign, conflict, "defender");
    const result = joinConflict(campaign, USA, conflict.id, "defender");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(metricCharged(result.packet, "militaryReadiness")).toBeCloseTo(quoted.militaryReadiness, 9);
    expect(metricCharged(result.packet, "stability")).toBeCloseTo(quoted.stability, 9);
  });

  it("refuses the join while the strike rung's munitions are spent", () => {
    const { campaign, conflict } = somebodyElsesWar();
    const spent: Campaign = {
      ...campaign,
      munitions: { us: { "cruise-standoff": { count: 0, onOrder: [] } }, index: {} },
    };
    const result = joinConflict(spent, USA, conflict.id, "defender");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("cruise and standoff missiles");
  });
});
