import { describe, it, expect } from "vitest";
import { validateDataset } from "../validate/dataset-validator.js";
import { US_ID } from "./nations.js";
import { worldCities, worldDataset } from "./index.js";

// Floors and identity pins for the baked city table: US coverage, one capital
// per nation, Pittsburgh industrial, demShare only on the United States.

describe("world cities", () => {
  const usCities = worldDataset.cities.filter((city) => city.nation === US_ID);
  const foreign = worldDataset.cities.filter((city) => city.nation !== US_ID);

  it("passes the dataset validator with the city table assembled", () => {
    expect(validateDataset(worldDataset)).toEqual([]);
  });

  it("ships at least 200 US cities", () => {
    expect(usCities.length).toBeGreaterThanOrEqual(200);
  });

  it("gives every nation at least one city, and exactly one capital matching identity", () => {
    for (const nation of worldDataset.nations) {
      const cities = worldDataset.cities.filter((city) => city.nation === nation.id);
      expect(cities.length, nation.id).toBeGreaterThanOrEqual(1);
      const capitals = cities.filter((city) => city.kind === "capital");
      expect(capitals).toHaveLength(1);
      expect(capitals[0]!.name).toBe(nation.identity.capital);
    }
  });

  it("pins Pittsburgh as an industrial metro", () => {
    const pittsburgh = worldCities.find((city) => city.id === "CITY-USA-pittsburgh");
    expect(pittsburgh).toMatchObject({
      id: "CITY-USA-pittsburgh",
      name: "Pittsburgh",
      kind: "industrial",
      nation: US_ID,
      state: "PA",
    });
    expect(pittsburgh!.demShare).toBeGreaterThanOrEqual(0.47);
    expect(pittsburgh!.demShare).toBeLessThanOrEqual(0.55);
  });

  it("requires demShare on the United States and forbids it elsewhere", () => {
    expect(usCities.every((city) => city.demShare !== undefined)).toBe(true);
    expect(foreign.every((city) => city.demShare === undefined)).toBe(true);
    expect(usCities.every((city) => city.state !== undefined)).toBe(true);
    expect(foreign.every((city) => city.state === undefined)).toBe(true);
    const berlin = worldCities.find((city) => city.id === "CITY-DEU-berlin");
    expect(berlin).toBeDefined();
    expect(berlin!.demShare).toBeUndefined();
  });
});
