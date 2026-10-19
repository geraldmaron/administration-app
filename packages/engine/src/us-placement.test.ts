import { describe, expect, it } from "vitest";
import type { CityId, NationId, StateId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { placeUsOnset } from "./us-placement.js";
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

  it("weights a state by population", () => {
    const light: StateRuntime = { ...campaign.states["FL" as StateId]!, population: 1 };
    const heavy: StateRuntime = { ...campaign.states["TX" as StateId]!, population: 99 };
    const thin: Campaign = { ...campaign, states: { [light.base.id]: light, [heavy.base.id]: heavy } as Campaign["states"] };
    expect(placeUsOnset(thin, USA, "cyclone", "region", 0).state).toBe(light.base.id);
    expect(placeUsOnset(thin, USA, "cyclone", "region", 0.2).state).toBe(heavy.base.id);
  });
});
