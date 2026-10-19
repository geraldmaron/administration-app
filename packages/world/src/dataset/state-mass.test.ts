import { describe, expect, it } from "vitest";
import { worldDataset } from "./index.js";
import { worldStates } from "./states.js";
import { applyStateMass, MASS_DERIVED_NATION } from "./state-mass.js";
import { validateDataset } from "../validate/dataset-validator.js";

// One level owns a fact. The states own the playable nation's mass and output;
// the nation's figures are the sums. These tests exist to prove the derivation
// actually runs and that the validator catches it when the two are split —
// a sum that is only checked in a comment is a sum nobody is checking.

const usa = () => worldDataset.nations.find((nation) => nation.id === MASS_DERIVED_NATION)!;

describe("state mass", () => {
  it("gives every state a population and a product", () => {
    for (const state of worldStates) {
      expect(state.population, state.id).toBeGreaterThan(0);
      expect(state.grp, state.id).toBeGreaterThan(0);
    }
  });

  it("sums the states into the nation's population and GDP", () => {
    const population = worldStates.reduce((sum, state) => sum + state.population, 0);
    const grp = worldStates.reduce((sum, state) => sum + state.grp, 0);
    expect(usa().stats.demography.population).toBe(population);
    expect(usa().stats.economy.gdp).toBe(grp);
  });

  it("touches no nation but the one whose states the dataset carries", () => {
    const before = worldDataset.nations.filter((nation) => nation.id !== MASS_DERIVED_NATION);
    const after = applyStateMass(worldDataset.nations, worldStates).filter(
      (nation) => nation.id !== MASS_DERIVED_NATION,
    );
    expect(after).toEqual(before);
  });

  it("leaves the nation alone when there are no states to sum", () => {
    expect(applyStateMass(worldDataset.nations, [])).toEqual(worldDataset.nations);
  });

  it("fails the dataset when a state figure is edited without the sum being rerun", () => {
    const [first, ...rest] = worldDataset.states;
    const split = {
      ...worldDataset,
      states: [{ ...first!, population: first!.population + 1_000 }, ...rest],
    };
    const errors = validateDataset(split);
    expect(errors.map((error) => error.path)).toContain("states.population");
  });

  it("fails the dataset when the nation's GDP is edited away from its states", () => {
    const split = {
      ...worldDataset,
      nations: worldDataset.nations.map((nation) =>
        nation.id === MASS_DERIVED_NATION
          ? { ...nation, stats: { ...nation.stats, economy: { ...nation.stats.economy, gdp: nation.stats.economy.gdp + 1 } } }
          : nation,
      ),
    };
    expect(validateDataset(split).map((error) => error.path)).toContain("states.grp");
  });

  it("refuses a country whose metros hold more people than the country", () => {
    const [first, ...rest] = worldDataset.cities;
    const overfull = {
      ...worldDataset,
      cities: [{ ...first!, population: 2_000_000_000 }, ...rest],
    };
    const paths = validateDataset(overfull).map((error) => error.path);
    expect(paths.some((path) => path.startsWith("cities."))).toBe(true);
  });
});
