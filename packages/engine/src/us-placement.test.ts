import { describe, expect, it } from "vitest";
import { STATE_DISASTER_ELIGIBILITY, type CityId, type NationId, type StateId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { nationFootprint, placeUsOnset } from "./us-placement.js";
import type { Campaign, CityRuntime, StateRuntime } from "./state.js";

const USA = "USA" as NationId;
const TULSA = "CITY-USA-tulsa" as CityId;
const NASHVILLE = "CITY-USA-nashville" as CityId;
const INLAND = new Set<StateId>(["AR", "KY", "MO", "OK", "TN"]);

function withPopulation(city: CityRuntime, population: number): CityRuntime {
  return { ...city, base: { ...city.base, population } };
}

describe("hurricane placement", () => {
  const campaign = buildCampaign();

  it("never places a hurricane in Tulsa or Nashville", () => {
    expect(campaign.cities[TULSA]?.base.state).toBe("OK");
    expect(campaign.cities[NASHVILLE]?.base.state).toBe("TN");
    for (let step = 0; step < 100; step += 1) {
      const roll = step / 100;
      const city = placeUsOnset(campaign, USA, "cyclone", "city", roll);
      const region = placeUsOnset(campaign, USA, "cyclone", "region", roll);
      expect(city.city).not.toBe(TULSA);
      expect(city.city).not.toBe(NASHVILLE);
      if (city.state) expect(INLAND.has(city.state)).toBe(false);
      if (region.state) expect(INLAND.has(region.state)).toBe(false);
    }
  });

  it("weights a city by population", () => {
    const miami = withPopulation(campaign.cities["CITY-USA-miami" as CityId]!, 1);
    const tampa = withPopulation(campaign.cities["CITY-USA-tampa" as CityId]!, 99);
    const florida = campaign.states["FL" as StateId]!;
    const thin: Campaign = {
      ...campaign,
      cities: { [miami.base.id]: miami, [tampa.base.id]: tampa } as Campaign["cities"],
      states: { [florida.base.id]: florida } as Campaign["states"],
    };
    expect(placeUsOnset(thin, USA, "cyclone", "city", 0).city).toBe(miami.base.id);
    expect(placeUsOnset(thin, USA, "cyclone", "city", 0.2).city).toBe(tampa.base.id);
  });

  it("weights a state by its hurricane record, not its population", () => {
    // OpenFEMA, 2005-2024: Florida 20 hurricane and tropical-storm major
    // disasters, Texas 7. Population no longer moves the draw.
    const light: StateRuntime = { ...campaign.states["FL" as StateId]!, population: 1 };
    const heavy: StateRuntime = { ...campaign.states["TX" as StateId]!, population: 99 };
    const thin: Campaign = { ...campaign, states: { [light.base.id]: light, [heavy.base.id]: heavy } as Campaign["states"] };
    const rolls = Array.from({ length: 100 }, (_, step) => placeUsOnset(thin, USA, "cyclone", "region", (step + 0.5) / 100).state);
    expect(rolls.filter((state) => state === "FL").length).toBeGreaterThan(rolls.filter((state) => state === "TX").length);
  });
});

describe("placement by hazard record", () => {
  const campaign = buildCampaign();
  const draws = (kind: Parameters<typeof placeUsOnset>[2], scope: "city" | "region", count = 2000) =>
    Array.from({ length: count }, (_, step) => placeUsOnset(campaign, USA, kind, scope, (step + 0.5) / count));

  it("almost never puts a city-scope tornado in New York City, and most often near Oklahoma City or Jackson", () => {
    const cities = draws("tornado", "city").map((place) => place.city);
    const share = (id: string) => cities.filter((city) => city === id).length / cities.length;
    expect(share("CITY-USA-new-york")).toBeLessThan(0.02);
    expect(share("CITY-USA-oklahoma-city")).toBeGreaterThan(share("CITY-USA-new-york"));
  });

  it("puts a region-scope tornado in Texas, Kansas and Oklahoma far more often than in the Northeast", () => {
    const states = draws("tornado", "region").map((place) => place.state);
    const count = (ids: readonly string[]) => states.filter((state) => state && ids.includes(state)).length;
    expect(count(["TX", "KS", "OK"])).toBeGreaterThan(5 * count(["NY", "NJ", "CT", "MA", "RI", "NH", "VT", "ME"]));
  });

  it("keeps a floor under an eligible state the record never named", () => {
    // Oregon is in the earthquake gate and has no earthquake declaration from
    // 2005 to 2024; add-half smoothing still leaves it reachable.
    const states = draws("earthquake", "region", 4000).map((place) => place.state);
    expect(states).toContain("OR");
    expect(states.filter((state) => state === "CA").length).toBeGreaterThan(states.filter((state) => state === "OR").length);
  });

  it("still weights heat by the people it falls on", () => {
    const states = draws("heat-wave", "region").map((place) => place.state);
    expect(states.filter((state) => state === "CA").length).toBeGreaterThan(states.filter((state) => state === "RI").length);
  });

  it("reaches one Census region of eligible states for a nationwide hazard, and the whole country for an epidemic", () => {
    for (const roll of [0.05, 0.35, 0.65, 0.95]) {
      const reach = nationFootprint(campaign, "cyclone", roll);
      expect(reach.length).toBeGreaterThan(0);
      expect(new Set(reach.map((id) => campaign.states[id]!.base.region)).size).toBe(1);
      for (const id of reach) expect(STATE_DISASTER_ELIGIBILITY.cyclone).toContain(id);
    }
    expect(nationFootprint(campaign, "pandemic", 0.5)).toHaveLength(Object.keys(campaign.states).length);
  });
});
