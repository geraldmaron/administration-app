import { describe, it, expect } from "vitest";
import { validateDataset } from "../validate/dataset-validator.js";
import { genericCharters } from "./charters.js";
import { worldDataset } from "./index.js";
import { CRADLE_POTOMAC, cradles } from "./orgs-cradles.js";
import { US_ID } from "./nations.js";

describe("generic charter catalogue", () => {
  it("ships at least six charters", () => {
    expect(genericCharters.length).toBeGreaterThanOrEqual(6);
  });

  it("passes the dataset validator with no exemptions alongside the US charter", () => {
    expect(validateDataset(worldDataset)).toEqual([]);
  });

  it("gives every charter a distinct institution set", () => {
    const institutionSets = genericCharters.map((c) => c.institutions.map((i) => i.name).sort().join("|"));
    expect(new Set(institutionSets).size).toBe(genericCharters.length);
  });

  it("gives every charter a distinct cabinet role set", () => {
    const roleSets = genericCharters.map((c) => [...c.cabinetRoles].sort().join("|"));
    expect(new Set(roleSets).size).toBe(genericCharters.length);
  });

  it("omits named tickets — inventing Democrat analogues would be a lie", () => {
    for (const charter of genericCharters) {
      expect(charter.parties, charter.id).toBeUndefined();
    }
  });

  it("gives every charter a non-empty decision constraint and succession rule", () => {
    for (const charter of genericCharters) {
      expect(charter.decisionConstraint.length).toBeGreaterThan(0);
      expect(charter.successionRule.length).toBeGreaterThan(0);
    }
  });

  it("covers every removal mechanism the schema defines", () => {
    const mechanisms = new Set(genericCharters.map((c) => c.removalMechanism));
    expect(mechanisms).toEqual(new Set(["no-confidence", "impeachment", "coup", "clerical-council", "electoral-defeat"]));
  });
});

describe("world.cradles integrity", () => {
  // A cradle is a placement, and its region decides which region the player's
  // own nation sits in for the rest of the campaign. A cradle naming a region
  // no nation uses drops the player into a region of one, which the World
  // screen then offers as a filter that selects exactly them.
  it("places every cradle in a region some nation actually occupies", () => {
    const occupied = new Set(worldDataset.nations.map((nation) => nation.geo.region as string));
    for (const cradle of worldDataset.cradles) {
      expect(occupied, `${cradle.name} sits in ${cradle.region}`).toContain(cradle.region as string);
    }
  });

  // Two cradles under one name is a founding choice the player cannot make:
  // the picker offers the same words twice and they place you differently.
  it("gives every cradle a distinct name and id", () => {
    const names = worldDataset.cradles.map((cradle) => cradle.name);
    expect(new Set(names).size, names.join(", ")).toBe(names.length);
    const ids = worldDataset.cradles.map((cradle) => cradle.id as string);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives the homeland cradle exactly the United States' own neighbors, so founding through it changes nothing", () => {
    const home = cradles.find((cradle) => cradle.id === CRADLE_POTOMAC)!;
    const us = worldDataset.nations.find((nation) => nation.id === US_ID)!;
    expect([...home.startingNeighbors].sort()).toEqual([...us.geo.neighbors].sort());
  });

  it("names only real nations as starting neighbors", () => {
    const known = new Set(worldDataset.nations.map((nation) => nation.id as string));
    for (const cradle of worldDataset.cradles) {
      for (const neighbor of cradle.startingNeighbors) {
        expect(known, `${cradle.name} neighbors ${neighbor}`).toContain(neighbor as string);
      }
    }
  });
});
