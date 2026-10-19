import { describe, expect, it } from "vitest";
import { City } from "../schemas/city.js";
import { EnergyMix, SECTOR_IDS, SectorId } from "../schemas/sector.js";
import { worldDataset } from "./index.js";
import { fillSectorMix } from "./sectors.js";
// Closed 23, mix construction, and the ids writers cannot invent.
describe("closed sector catalogue", () => {
    it("ships twenty-three ids with no retail-wholesale and no energy-coal", () => {
        expect(SECTOR_IDS).toHaveLength(23);
        expect(SECTOR_IDS).toContain("textiles");
        expect(SECTOR_IDS).toContain("mining");
        expect(SECTOR_IDS).toContain("chemicals");
        expect(SECTOR_IDS).toContain("food-processing");
        expect(SECTOR_IDS).toContain("tourism-hospitality");
        expect(SECTOR_IDS).toContain("healthcare");
        expect(SECTOR_IDS).toContain("pharma");
        expect(SECTOR_IDS).toContain("utilities");
        expect(SECTOR_IDS.includes("retail-wholesale")).toBe(false);
        expect(SECTOR_IDS.includes("energy-coal")).toBe(false);
    });
    it("rejects an unknown SectorId rather than storing a free string", () => {
        expect(SectorId.safeParse("retail-wholesale").success).toBe(false);
        expect(SectorId.safeParse("energy-coal").success).toBe(false);
        expect(SectorId.safeParse("auto").success).toBe(true);
    });
    it("rejects energy-coal as an energy.mix key instead of stripping it", () => {
        const parsed = EnergyMix.safeParse({ "energy-oil": 0.5, "energy-coal": 0.5 });
        expect(parsed.success).toBe(false);
    });
});
describe("fillSectorMix", () => {
    it("returns a mix that sums to 1", () => {
        const mix = fillSectorMix(["auto"], { "energy-oil": 0.6, "energy-renewables": 0.4 }, 10_000_000, 0.05);
        const total = mix.reduce((sum, entry) => sum + entry.mix, 0);
        expect(total).toBeCloseTo(1, 3);
    });
    it("does not give every nation a textiles sliver — tails are utilities, healthcare, infrastructure, finance, housing", () => {
        const autoOnly = fillSectorMix(["auto"], { "energy-oil": 1 }, 8_000_000, 0.04);
        expect(autoOnly.some((entry) => entry.sector === "auto")).toBe(true);
        expect(autoOnly.some((entry) => entry.sector === "textiles")).toBe(false);
        expect(autoOnly.some((entry) => entry.sector === "utilities")).toBe(true);
        expect(autoOnly.some((entry) => entry.sector === "healthcare")).toBe(true);
    });
    it("puts textiles on a nation that actually exports them, at more than a tail sliver", () => {
        const withTextiles = fillSectorMix(["textiles"], { "energy-oil": 1 }, 8_000_000, 0.04);
        const textiles = withTextiles.find((entry) => entry.sector === "textiles");
        expect(textiles).toBeDefined();
        expect(textiles.mix).toBeGreaterThan(0.1);
    });
    it("leaves textiles off nations that do not feature them in the shipped table", () => {
        const withTextiles = worldDataset.nations.filter((nation) => nation.sectors.some((entry) => entry.sector === "textiles" && entry.mix > 0));
        expect(withTextiles.length).toBeGreaterThan(0);
        expect(withTextiles.length).toBeLessThan(worldDataset.nations.length);
    });
});
describe("US city schema", () => {
    it("rejects a United States city with no state", () => {
        const parsed = City.safeParse({
            id: "CITY-USA-nowhere",
            nation: "USA",
            name: "Nowhere",
            kind: "interior",
            lat: 40,
            lon: -80,
            population: 1000,
            employment: 500,
            taxBase: 10,
            demShare: 0.5,
        });
        expect(parsed.success).toBe(false);
        if (parsed.success)
            return;
        expect(parsed.error.issues.some((issue) => issue.path.includes("state"))).toBe(true);
    });
});
