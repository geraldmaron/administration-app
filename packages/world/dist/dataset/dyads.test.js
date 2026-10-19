import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FOUNDING_DYADS } from "./dyads.js";
import { worldNations } from "./nations.js";
// The sourced pairs are the one place the founding board states a fact rather
// than deriving one, so each row has to be the vendored table's row and has to
// name where it came from. A row with no opened source is a guess wearing a
// citation's clothes.
const SEED = fileURLToPath(new URL("./seed/dyads.tsv", import.meta.url));
const KINDS = ["close", "cool", "hostile", "dependent", "rivalrous"];
function vendoredRows() {
    const lines = readFileSync(SEED, "utf8").trim().split("\n").filter((line) => !line.startsWith("#"));
    const columns = lines[0].split("\t");
    return lines.slice(1).map((line) => Object.fromEntries(line.split("\t").map((value, i) => [columns[i], value])));
}
describe("the founding dyads", () => {
    it("are the vendored table, cell for cell", () => {
        const rows = vendoredRows();
        expect(rows.map((row) => row.pair)).toEqual(FOUNDING_DYADS.map((dyad) => dyad.pair.join("-")));
        rows.forEach((row, index) => {
            const dyad = FOUNDING_DYADS[index];
            expect({ kind: dyad.kind, intensity: dyad.intensity, since: dyad.since, source: dyad.source, opened: dyad.opened }).toEqual({
                kind: row.kind,
                intensity: Number(row.intensity),
                since: Number(row.since),
                source: row.source,
                opened: row.opened,
            });
            const levels = row.trust_ab
                ? {
                    trust: [Number(row.trust_ab), Number(row.trust_ba)],
                    tension: Number(row.tension),
                    threat: [Number(row.threat_ab), Number(row.threat_ba)],
                }
                : undefined;
            expect(dyad.levels, row.pair).toEqual(levels);
        });
    });
    it("writes each pair once, lower id first, between two nations on the roster", () => {
        const ids = new Set(worldNations.map((nation) => nation.id));
        const seen = new Set();
        for (const { pair } of FOUNDING_DYADS) {
            const key = pair.join("-");
            expect(pair[0] < pair[1], key).toBe(true);
            expect(ids.has(pair[0]) && ids.has(pair[1]), key).toBe(true);
            expect(seen.has(key), key).toBe(false);
            seen.add(key);
        }
    });
    it("names an opened source, a kind and a bounded intensity on every row", () => {
        for (const dyad of FOUNDING_DYADS) {
            const key = dyad.pair.join("-");
            expect(KINDS, key).toContain(dyad.kind);
            expect(dyad.intensity, key).toBeGreaterThan(0);
            expect(dyad.intensity, key).toBeLessThanOrEqual(1);
            expect(dyad.source, key).toMatch(/^https:\/\/\S+$/);
            expect(dyad.opened, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(dyad.since, key).toBeLessThanOrEqual(Number(dyad.opened.slice(0, 4)));
        }
    });
    it("holds the five United States pairs the founding board opens with", () => {
        const withUs = FOUNDING_DYADS.filter((dyad) => dyad.pair.includes("USA")).map((dyad) => dyad.pair.join("-"));
        expect(withUs).toEqual(expect.arrayContaining(["CHN-USA", "CUB-USA", "IRN-USA", "PRK-USA", "RUS-USA"]));
    });
    it("keeps every level inside its schema range and reads the kind off the levels", () => {
        for (const dyad of FOUNDING_DYADS.filter((entry) => entry.levels)) {
            const key = dyad.pair.join("-");
            const { trust, tension, threat } = dyad.levels;
            for (const value of trust)
                expect(Math.abs(value), key).toBeLessThanOrEqual(1);
            for (const value of threat)
                expect(value >= 0 && value <= 1, key).toBe(true);
            expect(tension >= 0 && tension <= 1, key).toBe(true);
            const low = Math.min(...trust);
            const kind = low <= -0.5 || tension >= 0.8 ? "hostile" : low < -0.1 ? "rivalrous" : low < 0.3 ? "cool" : "close";
            expect(dyad.kind, key).toBe(kind);
        }
    });
    it("reaches at least the floor the research table could seed", () => {
        expect(FOUNDING_DYADS.length).toBeGreaterThanOrEqual(16);
    });
});
