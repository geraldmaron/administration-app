// routeCohorts: determinism, concentration, and the movement floor.
import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { routeDomestic, type DomesticSignature } from "./domestic-signature.js";
import {
  COHORT_STRAIN_FLOOR,
  cohortAffinity,
  cohortGeography,
  placeTilt,
  routeCohorts,
} from "./route-cohorts.js";
import type { StateEffect } from "./effects.js";

const steelSignature = (over: Partial<DomesticSignature> = {}): DomesticSignature => ({
  sectors: ["steel-heavy"],
  magnitude: "heavy",
  signature: "tariff:steel",
  reason: "A steel tariff lands where the mills are.",
  ...over,
});

describe("placeTilt / cohortAffinity", () => {
  it("reads authored, differentiated cohort beliefs for an identity-coded act with no economic axes", () => {
    // COHORT_MOTIVATION's beliefs were populated and differentiated before
    // this function could read them — rural and urban already sit on
    // opposite sides of authLibertarian. This is the direct case; there is
    // no proxy to derive, unlike stateAffinity's stateValues.
    const signature: DomesticSignature = {
      magnitude: "heavy",
      signature: "ruling:identity-protections",
      reason: "test",
      values: { authLibertarian: -0.6 },
    };
    const urban = cohortAffinity("urban", signature);
    const rural = cohortAffinity("rural", signature);
    expect(Math.sign(urban)).not.toBe(Math.sign(rural));
  });

  it("moves nothing from values on a cohort whose beliefs sit at the origin on every touched axis", () => {
    const signature: DomesticSignature = { magnitude: "heavy", signature: "no-op", reason: "test", values: {} };
    expect(cohortAffinity("urban", signature)).toBe(0);
  });

  it("tilts place cohorts the way state urbanization does", () => {
    expect(placeTilt("urban")).toBe(1);
    expect(placeTilt("suburban")).toBe(0);
    expect(placeTilt("rural")).toBe(-1);
    expect(placeTilt("goods-producing")).toBe(0);
  });

  it("concentrates affinity on goods-producing for a steel signature", () => {
    const signature = steelSignature();
    const goods = Math.abs(cohortAffinity("goods-producing", signature));
    const professional = Math.abs(cohortAffinity("professional-technical", signature));
    expect(goods).toBeGreaterThan(professional);
  });
});

describe("routeCohorts", () => {
  it("returns byte-identical effect lists across runs", () => {
    const campaign = buildCampaign();
    const signature = steelSignature();
    const routed = routeDomestic(campaign, signature);
    const first = routeCohorts(campaign, signature, routed);
    const second = routeCohorts(campaign, signature, routed);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("concentrates strain on cohorts employed by a single-axis signature", () => {
    const campaign = buildCampaign();
    const signature = steelSignature();
    const routed = routeDomestic(campaign, signature);
    const effects = routeCohorts(campaign, signature, routed);
    const byCohort = new Map(effects.map((effect) => [effect.cohort, effect.addStrain?.weight ?? 0]));
    const goods = byCohort.get("goods-producing") ?? 0;
    const professional = byCohort.get("professional-technical") ?? 0;
    const ageMid = byCohort.get("age-35-64") ?? 0;
    expect(goods).toBeGreaterThan(0);
    expect(goods).toBeGreaterThan(professional);
    expect(goods).toBeGreaterThan(ageMid);
  });

  it("emits nothing below COHORT_STRAIN_FLOOR", () => {
    const campaign = buildCampaign();
    const signature = steelSignature({ magnitude: "light", sectors: ["tourism-hospitality"] });
    const routed = routeDomestic(campaign, signature);
    const effects = routeCohorts(campaign, signature, routed);
    for (const effect of effects) {
      expect(effect.addStrain?.weight ?? 0).toBeGreaterThanOrEqual(COHORT_STRAIN_FLOOR);
    }
  });

  it("returns an empty list when affinity and geography leave every cohort under the floor", () => {
    const campaign = buildCampaign();
    const signature: DomesticSignature = {
      axes: { tech: 0.01 },
      magnitude: "light",
      signature: "whisper",
      reason: "Barely a touch.",
    };
    const effects = routeCohorts(campaign, signature, []);
    expect(effects.every((effect) => (effect.addStrain?.weight ?? 0) >= COHORT_STRAIN_FLOOR)).toBe(true);
  });
});

describe("cohortGeography weights by people, not by swing alone", () => {
  // States carry a population, and it is load-bearing here: an act that moves
  // two states by the same amount of lean is not the same size of act when one
  // of them holds sixty times the people.
  const swing = (state: StateEffect["state"], lean: number): StateEffect => ({
    kind: "state",
    state,
    deltas: { lean },
    reason: "test",
  });

  it("reads a big state and a small one as different sizes of the same swing", () => {
    const campaign = buildCampaign();
    const california = campaign.states.CA!.base.population;
    const wyoming = campaign.states.WY!.base.population;
    expect(california).toBeGreaterThan(wyoming * 10);

    // One cohort, two acts of identical political displacement in states with
    // very different cohort mixes. A |lean|-only weighting forces these two
    // readings to be equal for any pair of states; they are allowed to differ
    // only because the mass term exists.
    const big = cohortGeography(campaign, "professional-technical", [swing("CA", 0.02)]);
    const small = cohortGeography(campaign, "professional-technical", [swing("WY", 0.02)]);
    expect(big).not.toBeCloseTo(small, 3);
  });

  it("lets the larger state dominate a mixed act", () => {
    const campaign = buildCampaign();
    const mixed = cohortGeography(campaign, "professional-technical", [swing("CA", 0.02), swing("WY", 0.02)]);
    const californiaOnly = cohortGeography(campaign, "professional-technical", [swing("CA", 0.02)]);
    const wyomingOnly = cohortGeography(campaign, "professional-technical", [swing("WY", 0.02)]);
    // Nearer the state holding the people than the one holding the same swing.
    expect(Math.abs(mixed - californiaOnly)).toBeLessThan(Math.abs(mixed - wyomingOnly));
  });

  it("reads a uniform act as the national distribution", () => {
    const campaign = buildCampaign();
    const everywhere = Object.keys(campaign.states).map((id) => swing(id as StateEffect["state"], 0.01));
    expect(cohortGeography(campaign, "professional-technical", everywhere)).toBeCloseTo(1, 2);
  });

  it("contributes nothing for a state the campaign has no runtime for", () => {
    const campaign = buildCampaign();
    const states = { ...campaign.states } as Record<string, unknown>;
    delete states.WY;
    const withGhost = { ...campaign, states } as unknown as typeof campaign;
    expect(() => cohortGeography(withGhost, "professional-technical", [swing("WY", 0.02)])).not.toThrow();
    expect(cohortGeography(withGhost, "professional-technical", [swing("WY", 0.02)])).toBe(1);
  });
});
