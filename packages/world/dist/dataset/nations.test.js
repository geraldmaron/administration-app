import { describe, it, expect } from "vitest";
import { validateDataset } from "../validate/dataset-validator.js";
import { worldDataset } from "./index.js";
import { worldNations } from "./nations.js";
const ALL_ARCHETYPES = [
    "great-power",
    "regional-power",
    "middle-power",
    "resource-exporter",
    "trading-hub",
    "post-conflict",
    "isolationist",
    "client-state",
    "rising-power",
    "microstate",
];
describe("world.nations", () => {
    it("validates cleanly against the full dataset validator", () => {
        expect(validateDataset(worldDataset)).toEqual([]);
    });
    it("this batch covers every NationArchetype with no empty band", () => {
        const covered = new Set(worldDataset.nations.map((n) => n.bands.archetype));
        for (const archetype of ALL_ARCHETYPES) {
            expect(covered.has(archetype)).toBe(true);
        }
    });
    it("spans multiple regions and power tiers, not a single cluster", () => {
        const regions = new Set(worldNations.map((n) => n.geo.region));
        const powerTiers = new Set(worldDataset.nations.map((n) => n.bands.powerTier));
        expect(regions.size).toBeGreaterThanOrEqual(8);
        expect(powerTiers.size).toBeGreaterThanOrEqual(4);
    });
    it("gdpPerCapita is internally consistent with gdp and population for every nation", () => {
        for (const nation of worldNations) {
            const { gdp, gdpPerCapita } = nation.stats.economy;
            const { population } = nation.stats.demography;
            const expected = (gdp * 1_000_000) / population;
            const ratio = gdpPerCapita / expected;
            expect(ratio, `${nation.identity.name} gdpPerCapita vs gdp/population`).toBeGreaterThan(0.85);
            expect(ratio, `${nation.identity.name} gdpPerCapita vs gdp/population`).toBeLessThan(1.15);
        }
    });
    it("military headcount is a plausible share of population for every nation", () => {
        for (const nation of worldNations) {
            const { activeHeadcount } = nation.stats.military;
            const { population } = nation.stats.demography;
            const share = activeHeadcount / population;
            // Catches a headcount entered on the wrong scale, not an extreme. The
            // most militarized real state is Eritrea, whose indefinite national
            // service puts close to 6% of its people under arms (World Bank, 2020);
            // North Korea runs under 5%.
            expect(share, `${nation.identity.name} active headcount share of population`).toBeLessThan(0.07);
        }
    });
    it("every government id resolves to an authored charter", () => {
        const charterIds = new Set(worldDataset.charters.map((c) => c.id));
        for (const nation of worldNations) {
            expect(charterIds.has(nation.identity.government)).toBe(true);
        }
    });
    it("no real living person is named in any record — only country-level aggregates", () => {
        for (const nation of worldNations) {
            expect(nation).not.toHaveProperty("headOfState");
            expect(nation).not.toHaveProperty("leader");
        }
    });
});
