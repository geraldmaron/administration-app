import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MACRO_ANCHORS, MACRO_ANCHOR_SOURCES } from "./macro-anchors.js";
import { metricFor } from "./metrics.js";
import { worldNations } from "./nations.js";
// The anchors are the one place the three rates are sourced, and the engine
// rests every economy on its authored record, so a record that drifted from its
// anchor would be a resting point nobody published. These hold the three
// together: the vendored table, the TypeScript table and the records.
const SEED = fileURLToPath(new URL("./seed/macro-anchors.tsv", import.meta.url));
const RATES = ["growth", "inflation", "unemployment"];
function vendoredRows() {
    const lines = readFileSync(SEED, "utf8").trim().split("\n").filter((line) => !line.startsWith("#"));
    const columns = lines[0].split("\t");
    return lines.slice(1).map((line) => Object.fromEntries(line.split("\t").map((value, i) => [columns[i], value])));
}
/** The schema's own range for a rate, which is what a record may carry. */
function heldToRange(rate, value) {
    const spec = metricFor(`stats.economy.${rate}`);
    return Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, value));
}
describe("the macro anchors", () => {
    it("are the vendored table, cell for cell", () => {
        const rows = vendoredRows();
        expect(rows.length).toBe(worldNations.length);
        for (const row of rows) {
            const anchor = MACRO_ANCHORS[row.iso3] ?? {};
            for (const rate of RATES) {
                const cell = row[rate];
                if (cell === "") {
                    expect(anchor[rate], `${row.iso3} ${rate}`).toBeUndefined();
                    continue;
                }
                const [percent, year] = cell.split("@").map(Number);
                expect(anchor[rate], `${row.iso3} ${rate}`).toEqual({
                    value: Math.round((percent / 100) * 1_000_000) / 1_000_000,
                    year,
                    source: row[`${rate}_source`],
                });
            }
        }
    });
    it("names a source and a year inside the window for every figure", () => {
        for (const [nation, anchor] of Object.entries(MACRO_ANCHORS)) {
            for (const rate of RATES) {
                const figure = anchor[rate];
                if (!figure)
                    continue;
                expect(MACRO_ANCHOR_SOURCES[figure.source], `${nation} ${rate}`).toBeTruthy();
                expect(figure.year, `${nation} ${rate}`).toBeGreaterThanOrEqual(2020);
                expect(figure.year, `${nation} ${rate}`).toBeLessThanOrEqual(2024);
            }
        }
    });
    // Within the nation bake's four places, which is all a composed record
    // carries; a stated record carries the anchor itself.
    it("holds every record's rates to its anchor wherever one exists", () => {
        let held = 0;
        for (const nation of worldNations) {
            const anchor = MACRO_ANCHORS[nation.id] ?? {};
            for (const rate of RATES) {
                const figure = anchor[rate];
                if (!figure)
                    continue;
                const gap = Math.abs(nation.stats.economy[rate] - heldToRange(rate, figure.value));
                expect(gap, `${nation.id} ${rate}`).toBeLessThanOrEqual(0.0000501);
                held += 1;
            }
        }
        expect(held).toBeGreaterThan(500);
    });
    // Each figure below was read off the source named beside it on 2026-09-23
    // before it was written here.
    it("reads the United States from its own agencies", () => {
        expect(MACRO_ANCHORS.USA).toEqual({
            growth: { value: 0.028, year: 2024, source: "bea" },
            inflation: { value: 0.029495, year: 2024, source: "bls" },
            unemployment: { value: 0.040167, year: 2024, source: "bls" },
        });
    });
    it("keeps the economies the formula used to erase", () => {
        // Argentina's 2024 CPI inflation (World Bank FP.CPI.TOTL.ZG, 219.9%) is
        // past the 200% the model reads, so the record carries the ceiling.
        expect(MACRO_ANCHORS.ARG?.inflation?.value).toBeCloseTo(2.1988, 4);
        expect(worldNations.find((n) => n.id === "ARG").stats.economy.inflation).toBe(2);
        expect(MACRO_ANCHORS.ZAF?.unemployment?.value).toBeCloseTo(0.3228, 4);
        expect(MACRO_ANCHORS.TUR?.inflation?.value).toBeCloseTo(0.5851, 4);
        expect(MACRO_ANCHORS.CHN?.inflation?.value).toBeCloseTo(0.0022, 4);
    });
});
