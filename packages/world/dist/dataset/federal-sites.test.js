import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FederalSite, StateCapitol } from "../schemas/site.js";
import { STATE_IDS } from "../schemas/state.js";
import { CABINET_DEPARTMENT_INSTITUTIONS, FEDERAL_SITES, federalSite, federalSitePoint } from "./federal-sites.js";
import { STATE_CAPITOLS, stateCapitol } from "./state-capitols.js";
function vendored(file) {
    const path = fileURLToPath(new URL(`./seed/${file}.tsv`, import.meta.url));
    const lines = readFileSync(path, "utf8").trim().split("\n").filter((line) => !line.startsWith("#"));
    const header = lines[0].split("\t");
    return lines.slice(1).map((line) => Object.fromEntries(line.split("\t").map((cell, index) => [header[index], cell])));
}
const cell = (value) => (value === undefined ? "" : String(value));
// Buildings named for a person are labeled by place or function, the rule the
// basing table follows; these are the names the opened records carry.
const PERSON_NAMED = ["Eisenhower", "Truman", "Kennedy", "Whitten", "Hoover", "Perkins", "Humphrey", "Weaver", "Forrestal", "Johnson", "Eccles", "Clinton", "Bush", "Marshall", "Roybal", "Reagan", "Wilson", "Rios", "Winder"];
describe("federal sites", () => {
    it("holds the vendored file cell for cell", () => {
        const rows = vendored("federal-sites");
        expect(rows).toHaveLength(FEDERAL_SITES.length);
        rows.forEach((row, index) => {
            const site = FEDERAL_SITES[index];
            expect([row.institution, row.site, row.state, row.location, row.lat, row.lon, row.hq_source, row.reason, row.source, row.opened]).toEqual([
                site.institution,
                site.site,
                cell(site.state),
                site.location,
                cell(site.lat),
                cell(site.lon),
                site.hqSource,
                site.reason,
                site.source,
                site.opened,
            ]);
        });
    });
    it("parses every row and lists each institution once", () => {
        for (const site of FEDERAL_SITES)
            expect(() => FederalSite.parse(site), site.institution).not.toThrow();
        expect(new Set(FEDERAL_SITES.map((site) => site.institution)).size).toBe(FEDERAL_SITES.length);
    });
    it("gives every cabinet department a point", () => {
        expect(CABINET_DEPARTMENT_INSTITUTIONS).toHaveLength(15);
        for (const department of CABINET_DEPARTMENT_INSTITUTIONS)
            expect(federalSitePoint(department), department).toBeDefined();
    });
    it("answers no point for a row with no location, and nothing for an unknown id", () => {
        expect(federalSite("INST-STATES")?.location).toBe("none");
        expect(federalSitePoint("INST-STATES")).toBeUndefined();
        expect(federalSite("INST-NOWHERE")).toBeUndefined();
        expect(federalSitePoint("INST-DOD")).toEqual({ lat: 38.8708, lon: -77.055 });
    });
    it("labels no site by a person's name", () => {
        for (const site of FEDERAL_SITES)
            for (const name of PERSON_NAMED)
                expect(site.site, site.institution).not.toContain(name);
        for (const capitol of STATE_CAPITOLS)
            for (const name of PERSON_NAMED)
                expect(capitol.capitol, capitol.state).not.toContain(name);
    });
});
describe("state capitols", () => {
    it("holds the vendored file cell for cell", () => {
        const rows = vendored("state-capitols");
        expect(rows).toHaveLength(STATE_CAPITOLS.length);
        rows.forEach((row, index) => {
            const capitol = STATE_CAPITOLS[index];
            expect([row.state, row.capitol, row.city, row.lat, row.lon, row.source, row.opened]).toEqual([
                capitol.state,
                capitol.capitol,
                capitol.city,
                cell(capitol.lat),
                cell(capitol.lon),
                capitol.source,
                capitol.opened,
            ]);
        });
    });
    it("covers the fifty states and DC once each", () => {
        expect(STATE_CAPITOLS.map((capitol) => capitol.state).sort()).toEqual([...STATE_IDS].sort());
        for (const capitol of STATE_CAPITOLS)
            expect(() => StateCapitol.parse(capitol), capitol.state).not.toThrow();
        expect(stateCapitol("MT")?.city).toBe("Helena");
    });
});
