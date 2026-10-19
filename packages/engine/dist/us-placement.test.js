import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { placeUsOnset } from "./us-placement.js";
const USA = "USA";
const TULSA = "CITY-USA-tulsa";
const NASHVILLE = "CITY-USA-nashville";
const INLAND = new Set(["AR", "KY", "MO", "OK", "TN"]);
function withPopulation(city, population) {
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
            if (city.state)
                expect(INLAND.has(city.state)).toBe(false);
            if (region.state)
                expect(INLAND.has(region.state)).toBe(false);
        }
    });
    it("weights a city by population", () => {
        const miami = withPopulation(campaign.cities["CITY-USA-miami"], 1);
        const tampa = withPopulation(campaign.cities["CITY-USA-tampa"], 99);
        const florida = campaign.states["FL"];
        const thin = {
            ...campaign,
            cities: { [miami.base.id]: miami, [tampa.base.id]: tampa },
            states: { [florida.base.id]: florida },
        };
        expect(placeUsOnset(thin, USA, "cyclone", "city", 0).city).toBe(miami.base.id);
        expect(placeUsOnset(thin, USA, "cyclone", "city", 0.2).city).toBe(tampa.base.id);
    });
    it("weights a state by population", () => {
        const light = { ...campaign.states["FL"], population: 1 };
        const heavy = { ...campaign.states["TX"], population: 99 };
        const thin = { ...campaign, states: { [light.base.id]: light, [heavy.base.id]: heavy } };
        expect(placeUsOnset(thin, USA, "cyclone", "region", 0).state).toBe(light.base.id);
        expect(placeUsOnset(thin, USA, "cyclone", "region", 0.2).state).toBe(heavy.base.id);
    });
});
