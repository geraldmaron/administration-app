import { describe, expect, it } from "vitest";
import { worldDataset, type NationId, type PersonId } from "@admin/world";
import { balanceSeeds, foundedForBalance } from "./balance-harness.js";
import { generateFoundingPool } from "./founding.js";
import { candidatesForRole } from "./people.js";
import { makeCampaignSeed } from "./rng.js";
import { ENGAGEMENT_KINDS, ENGAGEMENT_TERMS, ENVOY_WEIGHT, projectEngagement, receivePreview, warmthScale, type EngagementRequest } from "./engagement.js";
import { counterpartPreview, secretaryOfState } from "./treaty-counterpart.js";
import { dispositionOf } from "./person-disposition.js";
import type { Effect } from "./effects.js";
import { relationshipKey, selectRelationship, type Campaign } from "./state.js";

// How much the Secretary of State's craft moves the President's diplomacy,
// measured across the people a President could actually name to the job. The
// intent: the strongest plausible Secretary makes a received meeting about 12%
// warmer, the weakest about 12% cooler, an empty chair 15% cooler; the term on
// a capital's decision to receive, or to sign, stays a modifier inside its noise.
//
// The bench is every State-eligible American in each seed's founding pool. The
// pinned constants come from the first twelve balance seeds; twelve more, held
// out, check that the reading holds on a bench it was not measured on. About
// ten seconds.

const STATE = "role-foreign-minister";
const GBR = "GBR" as NationId;
const RECEIVE_NOISE = 0.1;

function benchCraft(seeds: readonly string[]): readonly number[] {
  return seeds
    .flatMap((seed) => candidatesForRole(generateFoundingPool(makeCampaignSeed(seed), worldDataset), "USA", STATE))
    .map((person) => dispositionOf(person).craft);
}

function quantile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.round(q * (sorted.length - 1))]!;
}

/** The Secretary running State rewritten so their craft reads `target`, by charisma alone, the axis's heaviest field. */
function seatCraft(campaign: Campaign, target: number): Campaign {
  const runtime = secretaryOfState(campaign)!;
  const id = runtime.base.id as PersonId;
  const now = dispositionOf(runtime.base).craft;
  const charisma = Math.max(0, Math.min(1, runtime.base.charisma + (target - now) / 0.45));
  return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, charisma } } } };
}

function vacated(campaign: Campaign): Campaign {
  const cabinet = Object.fromEntries(Object.entries(campaign.player.cabinet).filter(([role]) => role !== STATE));
  return { ...campaign, player: { ...campaign.player, cabinet: cabinet as Campaign["player"]["cabinet"] }, actings: {} };
}

/** Britain within reach of every kind, so each kind's warmth can be read. */
function opened(campaign: Campaign): Campaign {
  const us = campaign.founding.nation;
  const edge = (from: NationId, to: NationId) => ({ ...selectRelationship(campaign, from, to)!, trust: 0.5, tension: 0.35, history: [] });
  return {
    ...campaign,
    relationships: { ...campaign.relationships, [relationshipKey(us, GBR)]: edge(us, GBR), [relationshipKey(GBR, us)]: edge(GBR, us) },
  };
}

const table = opened(foundedForBalance("ws-b-battery").campaign);
const ask = (kind: EngagementRequest["kind"]): EngagementRequest => ({ actor: table.founding.nation, target: GBR, kind });
const trustStep = (campaign: Campaign, request: EngagementRequest): number =>
  (projectEngagement(campaign, request)!.effects[0] as Extract<Effect, { kind: "relationship" }>).deltas!.trust ?? 0;
const envoyTerm = (campaign: Campaign, kind: EngagementRequest["kind"]) =>
  receivePreview(campaign, ask(kind)).terms.find((term) => term.key === "envoy")?.value ?? 0;
const treatyTerm = (campaign: Campaign) => counterpartPreview(campaign, GBR, "alliance")!.terms.find((term) => term.key === "envoy")!.value;

const pinned = benchCraft(balanceSeeds(12));
const heldOut = benchCraft(balanceSeeds(24).slice(12));

describe("WS-B battery: the Secretary of State's craft in the President's diplomacy", () => {
  for (const [name, bench] of [["pinned seeds", pinned], ["held-out seeds", heldOut]] as const) {
    it(`sizes a received meeting 0.88-0.92x at the bench's p10 and 1.08-1.12x at its p90 (${name})`, () => {
      const p10 = at(quantile(bench, 0.1));
      const p90 = at(quantile(bench, 0.9));
      const low = warmthScale(p10, ask("visit"));
      const high = warmthScale(p90, ask("visit"));
      console.log(
        `[ws-b] ${name}: n=${bench.length} craft p10 ${quantile(bench, 0.1).toFixed(4)} p50 ${quantile(bench, 0.5).toFixed(4)} p90 ${quantile(bench, 0.9).toFixed(4)}; warmth x${low} -> x${high}; visit trust ${trustStep(p10, ask("visit"))} -> ${trustStep(p90, ask("visit"))} (base ${ENGAGEMENT_TERMS.visit.warmth.trust})`,
      );
      expect(low).toBeGreaterThanOrEqual(0.88);
      expect(low).toBeLessThanOrEqual(0.92);
      expect(high).toBeGreaterThanOrEqual(1.08);
      expect(high).toBeLessThanOrEqual(1.12);
      expect(trustStep(p90, ask("visit"))).toBeGreaterThan(trustStep(p10, ask("visit")));
    });
  }

  it("makes a meeting 15% cooler with nobody in the chair, below the whole bench", () => {
    expect(warmthScale(vacated(table), ask("visit"))).toBe(0.85);
    expect(warmthScale(vacated(table), ask("visit"))).toBeLessThan(warmthScale(at(Math.min(...pinned)), ask("visit")));
  });

  it("keeps the envoy term on receiving and signing a modifier: inside the noise across p10-p90", () => {
    const p10 = at(quantile(pinned, 0.1));
    const p90 = at(quantile(pinned, 0.9));
    for (const kind of ENGAGEMENT_KINDS.filter((entry) => ENVOY_WEIGHT[entry] > 0)) {
      console.log(`[ws-b] receive ${kind}: envoy term ${envoyTerm(p10, kind)} at p10, ${envoyTerm(p90, kind)} at p90, ${envoyTerm(vacated(table), kind)} empty`);
      expect(envoyTerm(p90, kind)).toBeGreaterThan(envoyTerm(p10, kind));
      expect(envoyTerm(p90, kind) - envoyTerm(p10, kind)).toBeLessThan(RECEIVE_NOISE);
    }
    console.log(`[ws-b] alliance: envoy term ${treatyTerm(p10)} at p10, ${treatyTerm(p90)} at p90, ${treatyTerm(vacated(table))} empty`);
    expect(treatyTerm(p90)).toBeGreaterThan(treatyTerm(p10));
    expect(treatyTerm(p90) - treatyTerm(p10)).toBeLessThan(RECEIVE_NOISE);
  });
});

function at(craft: number): Campaign {
  return seatCraft(table, craft);
}
