import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ASIAN_AMERICAN_ORIGIN, US_ANDROGYNOUS_SHARE, US_BENCH_ROWS, usBenchGenderWeights, usBenchGroupFor, usBenchHeritageMix, usBenchRow, } from "./women-in-cabinet.js";
import { genderWeightsFor, seatHeritageMixFor } from "./portraits.js";
import { NATION_LEADER_CONSTRAINTS } from "./nation-leaders.generated.js";
const SEED = fileURLToPath(new URL("./seed/women-in-cabinet.tsv", import.meta.url));
function vendoredRows() {
    const [header, ...lines] = readFileSync(SEED, "utf8").trim().split("\n");
    const columns = header.split("\t");
    return lines.map((line) => Object.fromEntries(line.split("\t").map((value, i) => [columns[i], value])));
}
describe("the American bench table", () => {
    it("is the vendored table, row for row", () => {
        const rows = vendoredRows();
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(row.nation).toBe("USA");
            const table = US_BENCH_ROWS[row.role_group][row.party];
            expect(table, `${row.role_group} ${row.party}`).toEqual({
                women: Number(row.share_women),
                white: Number(row.share_white_non_hispanic),
                hispanic: Number(row.share_hispanic),
                black: Number(row.share_black),
                asian: Number(row.share_asian_american),
                other: Number(row.share_other),
            });
        }
        const vendored = rows.length;
        const held = Object.values(US_BENCH_ROWS).reduce((sum, parties) => sum + Object.keys(parties).length, 0);
        expect(held).toBe(vendored);
    });
    it("carries shares that each account for the whole of their bench", () => {
        for (const parties of Object.values(US_BENCH_ROWS)) {
            for (const row of Object.values(parties)) {
                const total = row.white + row.hispanic + row.black + row.asian + row.other;
                expect(total).toBeGreaterThan(0.995);
                expect(total).toBeLessThan(1.005);
            }
        }
    });
    it("reads every seat against the office the record measures it by", () => {
        expect(usBenchGroupFor("role-governor")).toBe("governor");
        expect(usBenchGroupFor("role-committee-chair")).toBe("senate");
        expect(usBenchGroupFor("role-congressional-leader")).toBe("house");
        expect(usBenchGroupFor("role-journalist")).toBe("population");
        expect(usBenchGroupFor("role-treasury-minister")).toBe("cabinet");
        expect(usBenchGroupFor("role-agency-head")).toBe("cabinet");
    });
    it("gives a person of neither party the office's pooled row, weighting governors by the seats each party holds", () => {
        expect(usBenchRow("role-treasury-minister", "independent")).toEqual(US_BENCH_ROWS.cabinet.all);
        const pooled = usBenchRow("role-governor", undefined);
        expect(pooled.women).toBeCloseTo((0.417 * 24 + 0.154 * 26) / 50, 3);
    });
});
describe("the weights a seat draws with", () => {
    it("draws an American's presentation from their seat and party, with the women's share exactly the record's", () => {
        for (const [role, party, group] of [
            ["role-treasury-minister", "democrat", "cabinet"],
            ["role-treasury-minister", "republican", "cabinet"],
            ["role-congressional-leader", "democrat", "house"],
            ["role-committee-chair", "republican", "senate"],
            ["role-governor", "democrat", "governor"],
        ]) {
            const weights = genderWeightsFor("USA", role, party);
            const feminine = weights.find((entry) => entry.value === "feminine").weight;
            expect(feminine).toBe(US_BENCH_ROWS[group][party].women);
            expect(weights.reduce((sum, entry) => sum + entry.weight, 0)).toBeCloseTo(1, 6);
            expect(weights.find((entry) => entry.value === "androgynous").weight).toBe(US_ANDROGYNOUS_SHARE);
        }
    });
    it("takes the androgynous share from the men's, so the women's share is untouched", () => {
        const row = US_BENCH_ROWS.senate.republican;
        const weights = usBenchGenderWeights(row);
        expect(weights.feminine).toBe(row.women);
        expect(weights.masculine).toBeCloseTo(1 - row.women - US_ANDROGYNOUS_SHARE, 6);
    });
    it("reads every other nation's cabinet off its row in the leader table, with no androgynous weight", () => {
        const weights = genderWeightsFor("FRA", "role-foreign-minister", undefined);
        expect(weights.find((entry) => entry.value === "feminine").weight).toBe(NATION_LEADER_CONSTRAINTS.FRA.womenCabinetShare);
        expect(weights.find((entry) => entry.value === "androgynous").weight).toBe(0);
    });
    it("splits the Asian American share by where America's Asian population traces its origin", () => {
        const total = ASIAN_AMERICAN_ORIGIN.east + ASIAN_AMERICAN_ORIGIN.south + ASIAN_AMERICAN_ORIGIN.southeast;
        expect(total).toBe(19_004_144);
        const mix = usBenchHeritageMix(US_BENCH_ROWS.cabinet.democrat);
        const asian = mix.filter((entry) => ["east-asia", "south-asia", "southeast-asia"].includes(entry.heritage));
        expect(asian.reduce((sum, entry) => sum + entry.weight, 0)).toBeCloseTo(US_BENCH_ROWS.cabinet.democrat.asian, 6);
        expect(seatHeritageMixFor("USA", "role-governor", "republican").map((entry) => entry.heritage)).toEqual([
            "europe-north",
            "mixed",
        ]);
    });
    it("gives white Americans the face the national mix always did, and a census 'other' person a mixed one", () => {
        const mix = usBenchHeritageMix(US_BENCH_ROWS.population.all);
        expect(mix.find((entry) => entry.heritage === "europe-north").weight).toBe(0.608);
        expect(mix.find((entry) => entry.heritage === "mixed").weight).toBe(0.046);
    });
});
