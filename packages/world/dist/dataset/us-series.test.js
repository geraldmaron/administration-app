import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { US_SERIES, US_SERIES_RELEASES, US_SERIES_SOURCES, US_SERIES_VINTAGE } from "./us-series.js";
// The published half of the economy room's history: every figure is one the
// agency printed, with the series and release it came from, and nothing the
// agency did not publish is filled in.
const seed = readFileSync(new URL("./seed/us-series.tsv", import.meta.url), "utf8");
const rows = seed
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("series\t"))
    .map((line) => line.split("\t"));
describe("the vendored United States series", () => {
    it("carries exactly the seed's rows, each naming a source the header states and the release it came from", () => {
        const baked = Object.entries(US_SERIES).flatMap(([series, points]) => points.map((point) => [series, point.date, String(point.value)]));
        expect(baked).toEqual(rows.map(([series, date, value]) => [series, date, value]));
        for (const [series, , , source, vintage] of rows) {
            expect(US_SERIES_SOURCES[source], `${series} source`).toMatch(/Bureau of (Labor Statistics|Economic Analysis).*https:\/\/.*opened \d{4}-\d{2}-\d{2}$/);
            expect(vintage).toBe(US_SERIES_RELEASES[series]);
        }
    });
    it("holds the unemployment rate, the price index and real growth from 2017 to the vintage, in date order", () => {
        expect(Object.keys(US_SERIES).sort()).toEqual(["cpi", "gdp-growth", "unemployment"]);
        for (const [series, points] of Object.entries(US_SERIES)) {
            const dates = points.map((point) => point.date);
            expect(dates, series).toEqual([...dates].sort());
            expect(new Set(dates).size, series).toBe(dates.length);
            for (const date of dates)
                expect(date, series).toMatch(/^\d{4}-(0[1-9]|1[0-2]|Q[1-4])$/);
        }
        expect(US_SERIES.unemployment[0].date).toBe("2017-01");
        expect(US_SERIES["gdp-growth"][0].date).toBe("2017-Q1");
        expect(US_SERIES.cpi[0].date).toBe("2016-01");
        expect(US_SERIES_VINTAGE).toBe(Object.values(US_SERIES_RELEASES).sort().at(-1));
    });
    it("leaves out October 2025, which the lapse in appropriations kept the agency from collecting", () => {
        expect(US_SERIES.unemployment.some((point) => point.date === "2025-10")).toBe(false);
        expect(US_SERIES.cpi.some((point) => point.date === "2025-10")).toBe(false);
        expect(US_SERIES.unemployment.some((point) => point.date === "2025-09")).toBe(true);
    });
});
