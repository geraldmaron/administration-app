import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WORLD_SERIES, WORLD_SERIES_COUNTRIES, WORLD_SERIES_SOURCES, WORLD_SERIES_VINTAGE, } from "./world-series.js";
// The international half of the comparison pack: every figure is one the World
// Bank published, each row names its source and the database update it came
// from, and a year the source did not publish is a null, never a zero.
const seed = readFileSync(new URL("./seed/world-series.tsv", import.meta.url), "utf8");
const rows = seed
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("series\t"))
    .map((line) => line.split("\t"));
describe("the vendored World Bank series", () => {
    it("carries exactly the seed's rows, each naming a stated source and country", () => {
        const baked = Object.entries(WORLD_SERIES).flatMap(([series, byCountry]) => Object.entries(byCountry).flatMap(([country, points]) => points.map((p) => [
            series,
            country,
            p.date,
            p.value === null ? "" : String(p.value),
        ])));
        const bySeriesCountry = (a, b) => `${a[0]}${a[1]}${a[2]}`.localeCompare(`${b[0]}${b[1]}${b[2]}`);
        expect(baked.sort(bySeriesCountry)).toEqual(rows.map(([s, c, d, v]) => [s, c, d, v]).sort(bySeriesCountry));
        for (const [series, country, , , source, vintage] of rows) {
            expect(WORLD_SERIES_SOURCES[source], `${series} source`).toMatch(/^World Bank, World Development Indicators, [A-Z]{2}\.[A-Z.]+.*opened \d{4}-\d{2}-\d{2}$/);
            expect(WORLD_SERIES_COUNTRIES[country], country).toBeDefined();
            expect(vintage).toBe(WORLD_SERIES_VINTAGE);
        }
    });
    it("is in date order with no repeated year, and every country has every series", () => {
        for (const [series, byCountry] of Object.entries(WORLD_SERIES)) {
            expect(Object.keys(byCountry).sort(), series).toEqual(Object.keys(WORLD_SERIES_COUNTRIES).sort());
            for (const points of Object.values(byCountry)) {
                const years = points.map((p) => p.date);
                expect(years).toEqual([...new Set(years)].sort());
            }
        }
    });
});
