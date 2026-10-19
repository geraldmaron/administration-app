import { describe, expect, it } from "vitest";
import { FORCE_COST_ANCHORS, US_ID, type NationId, type NationStats } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply, type Effect } from "./effects.js";
import { campaignCostIndex, forceCostBasis, militaryCostIndex, US_FORCE_PRICES } from "./force-costs.js";
import type { RungLevel } from "./instrument-ids.js";
import { projectAction, resolveAction } from "./resolution.js";
import { createRngStreams, makeCampaignSeed, type RngStreams } from "./rng.js";

// A force act is priced from what US operations have cost. These hold the
// arithmetic to the anchors, the price shown to the price charged, and the
// weekly bill to the commitment that carries it.

const anchor = (id: string) => FORCE_COST_ANCHORS.find((row) => row.anchor === id)!.value;
const toWorldDollars = (id: string, year: number) => anchor(id) * (anchor("cpi-2026") / anchor(`cpi-${year}`));

function alwaysLands(label: string): RngStreams {
  const inner = createRngStreams(makeCampaignSeed(label));
  return {
    stream(...keyParts) {
      const stream = inner.stream(...keyParts);
      return keyParts[0] === "resolution" ? { ...stream, next: () => 0 } : stream;
    },
  };
}

function stats(budget: number, activeHeadcount: number): NationStats {
  const { campaign } = founded;
  const base = campaign.nations[US_ID]!.base.stats;
  return { ...base, military: { ...base.military, budget, activeHeadcount } };
}

const founded = foundedForBalance("force-costs");

describe("the US price of each rung", () => {
  it("prices a strike sortie at the Libya campaign's cost over its strike sorties, two to an aircraft", () => {
    const sortie = toWorldDollars("odyssey-dawn-cost", 2011) / anchor("odyssey-dawn-strike-sorties");
    expect(US_FORCE_PRICES[4].upFront).toBeCloseTo(sortie * 2, 9);
    expect(US_FORCE_PRICES[4].weekly).toBe(0);
  });

  it("bills a carrier group a week's passage up front and the same week each week it stays", () => {
    const day =
      (toWorldDollars("carrier-year-direct", 2017) + toWorldDollars("air-wing-year-direct", 2017) + 5 * toWorldDollars("destroyer-year-direct", 2017)) / 365;
    expect(US_FORCE_PRICES[2].upFront).toBeCloseTo(day * 7, 9);
    expect(US_FORCE_PRICES[2].weekly).toBeCloseTo(day * 7, 9);
  });

  it("bills a brigade its shipping up front and its share of a year in Iraq each week", () => {
    expect(US_FORCE_PRICES[5].upFront).toBeCloseTo(anchor("brigade-shipping"), 9);
    expect(US_FORCE_PRICES[5].weekly).toBeCloseTo(toWorldDollars("brigade-year-in-theater", 2008) / 52, 9);
  });

  it("charges every rung something up front", () => {
    for (const rung of [1, 2, 3, 4, 5] as RungLevel[]) expect(US_FORCE_PRICES[rung].upFront).toBeGreaterThan(0);
  });
});

describe("the basis", () => {
  it("scales with the units sent, and puts the distance on the passage only", () => {
    const near = forceCostBasis(5, 4, 1, 1, "army.brigade-combat-team");
    const far = forceCostBasis(5, 8, 1, 1.5, "army.brigade-combat-team");
    expect(far.upFront).toBeCloseTo(near.upFront * 2 * 1.5, 1);
    expect(far.weekly).toBeCloseTo(near.weekly * 2, 1);
  });

  it("prices the United States at its own prices and a poorer military below them", () => {
    expect(campaignCostIndex(founded.campaign, US_ID)).toBe(1);
    const venezuela = campaignCostIndex(founded.campaign, "VEN" as NationId);
    expect(venezuela).toBeGreaterThan(0);
    expect(venezuela).toBeLessThan(1);
  });

  it("reads the index as spending per service member against the US figure, and the US price where a government has no force", () => {
    expect(militaryCostIndex(stats(100, 1_000), stats(1_000, 1_000))).toBeCloseTo(0.1, 9);
    expect(militaryCostIndex(stats(0, 0), stats(1_000, 1_000))).toBe(1);
  });
});

describe("the price shown is the price charged", () => {
  const { campaign } = founded;
  const us = campaign.founding.nation;
  const strike = { actor: us, target: "VEN" as NationId, instrument: "military" as const, rung: 4 as const, force: { branch: "air" as const, unitType: "air.fighter" as const, count: 48 } };

  it("debits a limited strike's projected price from budget authority, and quotes the basis it was built on", () => {
    const projected = projectAction(campaign, strike, alwaysLands("strike-quote"));
    expect(projected.ok, projected.ok ? "" : projected.missingCapability).toBe(true);
    if (!projected.ok) return;
    const basis = projected.projection.costBasis!;
    expect(basis.units).toBe(48);
    expect(projected.projection.cost.treasury).toBeCloseTo(-basis.upFront, 9);
    expect(basis.upFront).toBeCloseTo(US_FORCE_PRICES[4].upFront * 48 * basis.reach, 1);

    const resolved = resolveAction(campaign, strike, alwaysLands("strike-quote"));
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const after = apply(campaign, resolved.packet);
    expect(after.player.metrics.treasury - campaign.player.metrics.treasury).toBeCloseTo(projected.projection.cost.treasury!, 6);
  });

  it("opens a forward carrier's commitment at the weekly figure the basis quoted", () => {
    const deploy = { actor: us, target: "VEN" as NationId, instrument: "military" as const, rung: 2 as const, force: { branch: "navy" as const, unitType: "navy.aircraft-carrier" as const, count: 1 } };
    const resolved = resolveAction(campaign, deploy, alwaysLands("carrier-forward"));
    expect(resolved.ok, resolved.ok ? "" : resolved.missingCapability).toBe(true);
    if (!resolved.ok) return;
    const opened = resolved.packet.effects.find((effect): effect is Effect & { kind: "commitment" } => effect.kind === "commitment");
    expect(opened?.set.resource.amountPerTurn).toBe(resolved.projection.costBasis!.weekly);
  });
});
