import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { worldDataset } from "../dataset/index.js";
import { BASING_COUNTRY_TOTAL, BASING_SPLIT_FROM, US_BASING } from "../dataset/us-basing.js";
import { MARITIME_ZONES } from "../dataset/maritime-zones.js";
import { checkForcePlacement, COASTAL_TOLERANCE_KM, outlineLessHosts } from "./placement-checks.js";
const seeded = { basing: US_BASING, zones: MARITIME_ZONES };
const kadena = US_BASING.find((row) => row.base.startsWith("Kadena"));
function withRow(row) {
    return { ...seeded, basing: [...US_BASING, row] };
}
function withZone(zone) {
    return { ...seeded, zones: [...MARITIME_ZONES, zone] };
}
describe("where forces stand", () => {
    it("passes the seeded anchors and seas", () => {
        expect(checkForcePlacement(worldDataset)).toEqual([]);
    });
    it("anchors every installation or says it is zone-level, and never anchors a country total", () => {
        for (const row of US_BASING) {
            if (row.base === BASING_COUNTRY_TOTAL)
                expect(row.anchor, row.country).toBe("zone-level");
            if (row.anchor === "sourced") {
                expect(row.anchorSource, row.base).toMatch(/^https:\/\//);
                expect(row.lat, row.base).toBeDefined();
            }
        }
    });
    it("splits every composite row into installations that are each on the table", () => {
        const labels = new Set(US_BASING.map((row) => row.base));
        for (const [composite, parts] of Object.entries(BASING_SPLIT_FROM)) {
            expect(labels.has(composite), composite).toBe(false);
            for (const part of parts)
                expect(labels.has(part), part).toBe(true);
        }
    });
    it("holds the vendored file and the table to the same anchors, cell for cell", () => {
        const path = fileURLToPath(new URL("../dataset/seed/us-basing.tsv", import.meta.url));
        const rows = readFileSync(path, "utf8").trim().split("\n").filter((line) => !line.startsWith("#")).slice(1).map((line) => line.split("\t"));
        expect(rows.map(([country, base, , , anchor, lat, lon, source, opened]) => ({ country, base, anchor, lat, lon, source, opened }))).toEqual(US_BASING.map((row) => ({
            country: row.country,
            base: row.base,
            anchor: row.anchor,
            lat: row.lat === undefined ? "" : String(row.lat),
            lon: row.lon === undefined ? "" : String(row.lon),
            source: row.anchorSource,
            opened: row.anchorOpened,
        })));
    });
    it("holds only Kosovo and the Marshall Islands to a radius, because the map draws neither", () => {
        expect(outlineLessHosts()).toEqual(["MHL", "XKX"]);
    });
    it("refuses a point in the wrong country", () => {
        const errors = checkForcePlacement(worldDataset, withRow({ ...kadena, lat: 37.0, lon: 127.0 }));
        expect(errors.map((error) => error.kind)).toEqual(["plausibility"]);
    });
    it("allows a harbor point just off the drawn coast, and refuses one past the tolerance", () => {
        const yokosuka = US_BASING.find((row) => row.base === "Yokosuka naval base");
        expect(checkForcePlacement(worldDataset, withRow(yokosuka))).toEqual([]);
        expect(COASTAL_TOLERANCE_KM).toBeLessThan(100);
        const offshore = { ...kadena, lon: kadena.lon + 1.2 };
        expect(checkForcePlacement(worldDataset, withRow(offshore)).map((error) => error.message)).toEqual([expect.stringContaining("coastal tolerance")]);
    });
    it("refuses a sourced anchor with no point or no opened source, and a zone-level row with a point", () => {
        const { lat: _lat, lon: _lon, ...pointless } = kadena;
        const errors = checkForcePlacement(worldDataset, {
            ...seeded,
            basing: [...US_BASING, pointless, { ...kadena, anchorSource: "" }, { ...kadena, anchor: "zone-level" }],
        });
        expect(errors).toHaveLength(3);
        expect(errors.every((error) => error.kind === "shape")).toBe(true);
    });
    it("refuses a sea that crosses itself, overlaps a neighbor, or is all land", () => {
        const base = MARITIME_ZONES[0];
        const bowtie = { ...base, id: base.id, name: "Bowtie", ring: [[-40, 30], [-30, 40], [-30, 30], [-40, 40]] };
        expect(checkForcePlacement(worldDataset, withZone({ ...bowtie, id: "SEA-bowtie" })).map((error) => error.message)).toEqual(expect.arrayContaining([expect.stringContaining("crosses itself")]));
        const overlap = { ...base, id: "SEA-overlap", name: "Overlap", ring: [[-40, 30], [-30, 30], [-30, 40], [-40, 40]] };
        expect(checkForcePlacement(worldDataset, withZone(overlap)).map((error) => error.message)).toEqual([expect.stringContaining("overlaps Overlap")]);
        const sahara = { ...base, id: "SEA-sahara", name: "Sahara", ring: [[5, 20], [15, 20], [15, 28], [5, 28]] };
        expect(checkForcePlacement(worldDataset, withZone(sahara)).map((error) => error.message)).toEqual([expect.stringContaining("no open water")]);
    });
    it("refuses a sea framed by a government on no roster, or a land id posing as a sea", () => {
        const base = MARITIME_ZONES[MARITIME_ZONES.length - 1];
        const errors = checkForcePlacement(worldDataset, withZone({ ...base, id: "JPN", littoral: [...base.littoral, "ZZZ"], ring: [[-150, -30], [-140, -30], [-140, -20]] }));
        expect(errors.map((error) => error.kind).sort()).toEqual(["dangling-reference", "shape"]);
    });
});
