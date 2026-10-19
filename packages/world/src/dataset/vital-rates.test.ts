import { describe, it, expect } from "vitest";
import { worldDataset } from "./index.js";
import { worldNations } from "./nations.js";
import { worldStates } from "./states.js";
import { STATE_VITAL_ANCHORS } from "./state-vitals.js";
import { RETIRED_DEBT_TO_GDP, debtToGdp } from "./fiscal-identities.js";
import { applyVitalRates } from "./vital-rates.js";

describe("vital rates", () => {
  it("derives the growth rate from the three rates that make it", () => {
    const [nation] = applyVitalRates([
      { stats: { demography: { birthRate: 0.02, deathRate: 0.008, netMigration: 0.003, growthRate: 0.4 } } },
    ] as never);
    expect((nation as { stats: { demography: { growthRate: number } } }).stats.demography.growthRate).toBe(0.015);
  });

  // The pass is installed before the first vintage refresh splits the two, so
  // today it has to be provably inert: every authored row already satisfies
  // the identity, and the assembled dataset carries the number the record does.
  it("changes no authored figure today", () => {
    const derived = applyVitalRates([...worldNations]);
    expect(derived.map((n) => n.stats.demography.growthRate)).toEqual(
      worldNations.map((n) => n.stats.demography.growthRate),
    );
  });

  it("authors every nation at the snapshot price level", () => {
    expect(worldDataset.nations.every((n) => n.stats.economy.costOfLiving === 1)).toBe(true);
  });

  it("reproduces every retired debt-to-GDP ratio from the stock that replaced it", () => {
    // Only the records authored while the ratio was a field have one to
    // reproduce; a country added later carries a sourced debt stock from birth.
    const retired = worldDataset.nations.filter((nation) => RETIRED_DEBT_TO_GDP[nation.id as string] !== undefined);
    expect(retired).toHaveLength(61);
    for (const nation of retired) {
      expect(debtToGdp(nation.stats)).toBeCloseTo(RETIRED_DEBT_TO_GDP[nation.id as string]!, 3);
    }
  });
});

describe("state vital anchors", () => {
  it("covers all 51 rows", () => {
    expect(Object.keys(STATE_VITAL_ANCHORS)).toHaveLength(51);
    expect(worldStates.every((state) => state.character.vitalAnchor !== undefined)).toBe(true);
  });

  // Tighter than the validator's 0.005, because the validator's job is to
  // refuse a table that has drifted and this one's is to notice the moment it
  // starts to: a centered column comes out three orders of magnitude inside
  // the tolerance, so anything near it is a table that was never re-centered.
  it("centers each column on the country, population-weighted", () => {
    const total = worldStates.reduce((sum, state) => sum + state.population, 0);
    for (const field of ["unemployment", "crimeIndex", "costOfLiving"] as const) {
      const mean =
        worldStates.reduce((sum, state) => sum + state.character.vitalAnchor[field] * state.population, 0) / total;
      expect(Math.abs(mean)).toBeLessThan(0.001);
    }
  });

  it("keeps every state's reading inside the national field's own range", () => {
    const usa = worldDataset.nations.find((nation) => nation.id === "USA")!;
    for (const state of worldStates) {
      const anchor = state.character.vitalAnchor;
      expect(usa.stats.economy.unemployment + anchor.unemployment).toBeGreaterThan(0);
      expect(usa.stats.security.crimeIndex + anchor.crimeIndex).toBeGreaterThan(0);
      expect(usa.stats.security.crimeIndex + anchor.crimeIndex).toBeLessThan(1);
      expect(usa.stats.economy.costOfLiving + anchor.costOfLiving).toBeGreaterThan(0.5);
    }
  });
});
