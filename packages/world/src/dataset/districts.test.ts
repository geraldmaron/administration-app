import { describe, expect, it } from "vitest";
import { worldDataset } from "./index.js";
import { worldDistricts, districtById, districtsOfState } from "./districts.js";
import { worldStates } from "./states.js";
import { validateDataset } from "../validate/dataset-validator.js";

// Additive to the state layer: `delegations.ts`'s seat math never reads a
// district, so these tests prove the two things that do depend on this table —
// the map and dossier surfaces, and the sum against each state's own
// population — without touching anything the legislative mechanic covers.

describe("districts", () => {
  it("ships 435 numbered/at-large districts plus DC's one delegate seat", () => {
    expect(worldDistricts).toHaveLength(436);
    expect(new Set(worldDistricts.map((district) => district.id)).size).toBe(436);
  });

  it("gives every state exactly its authored houseSeats, and DC exactly one", () => {
    for (const state of worldStates) {
      const count = districtsOfState(state.id).length;
      if (state.id === "DC") {
        expect(count, state.id).toBe(1);
      } else {
        expect(count, state.id).toBe(state.houseSeats);
      }
    }
  });

  it("sums every state's district populations to exactly the state's own population", () => {
    for (const state of worldStates) {
      const districts = districtsOfState(state.id);
      const sum = districts.reduce((total, district) => total + district.population, 0);
      expect(sum, state.id).toBe(state.population);
    }
  });

  it("resolves a known district by id", () => {
    const wy = districtById.get("WY-AL");
    expect(wy?.state).toBe("WY");
    expect(wy?.number).toBe(0);
  });

  it("passes the dataset validator with no exemptions", () => {
    expect(validateDataset(worldDataset)).toEqual([]);
  });

  it("fails the dataset when a state's district count drifts from its houseSeats", () => {
    const [first, ...rest] = worldDataset.districts;
    const dropped = { ...worldDataset, districts: rest };
    const errors = validateDataset(dropped);
    expect(errors.map((error) => error.path)).toContain(`districts.${first!.state}`);
  });

  it("fails the dataset when a district's population is edited without the state being rebalanced", () => {
    const [first, ...rest] = worldDataset.districts;
    const edited = { ...worldDataset, districts: [{ ...first!, population: first!.population + 10_000 }, ...rest] };
    const errors = validateDataset(edited);
    expect(errors.map((error) => error.path)).toContain(`districts.${first!.state}.population`);
  });

  it("refuses a duplicate district id", () => {
    const [first, ...rest] = worldDataset.districts;
    const duplicated = { ...worldDataset, districts: [first!, first!, ...rest] };
    expect(validateDataset(duplicated).map((error) => error.path)).toContain("districts");
  });
});
