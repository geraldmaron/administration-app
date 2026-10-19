import { describe, expect, it } from "vitest";
import { parsePortraitRef, US_BENCH_ROWS, usBenchGroupFor, worldDataset, } from "@admin/world";
import { usPartyOfPerson } from "./cast-fit.js";
import { generateFoundingPool } from "./founding.js";
import { makeCampaignSeed } from "./rng.js";
// The American bench, measured against the record it is drawn from.
//
// Every generated American draws their presentation and their face from the
// row for their office and their party (women-in-cabinet.ts). A draw is a draw,
// so no single bench matches the table; what this holds is that, pooled over
// enough seeds, each office and party lands where the record says, within
// three standard errors of a sample that size. A share that ran outside that
// would be a draw reading the wrong row, not bad luck.
const SEEDS = Array.from({ length: 16 }, (_, i) => makeCampaignSeed(`bench-shares-${i}`));
function tallies() {
    const out = new Map();
    for (const seed of SEEDS) {
        for (const person of generateFoundingPool(seed, worldDataset)) {
            if (person.nationality !== "USA")
                continue;
            const party = usPartyOfPerson(person);
            if (party !== "democrat" && party !== "republican")
                continue;
            const group = usBenchGroupFor(person.eligibleRoles[0]);
            const key = `${group}:${party}`;
            const face = parsePortraitRef(person.portraitRef);
            const tally = out.get(key) ?? { n: 0, women: 0, white: 0, black: 0, hispanic: 0 };
            out.set(key, {
                n: tally.n + 1,
                women: tally.women + (face.gender === "feminine" ? 1 : 0),
                white: tally.white + (face.heritage === "europe-north" ? 1 : 0),
                black: tally.black + (face.heritage === "africa-west" ? 1 : 0),
                hispanic: tally.hispanic + (face.heritage === "latin-america" ? 1 : 0),
            });
        }
    }
    return out;
}
function withinSampling(observed, n, expected) {
    const tolerance = Math.max(0.03, 3 * Math.sqrt((expected * (1 - expected)) / n));
    return Math.abs(observed / n - expected) <= tolerance;
}
describe("the American bench against the record", () => {
    const measured = tallies();
    for (const group of ["cabinet", "house", "senate", "governor"]) {
        for (const party of ["democrat", "republican"]) {
            it(`draws ${group} ${party}s at the record's share of women and of each heritage`, () => {
                const row = US_BENCH_ROWS[group][party];
                const tally = measured.get(`${group}:${party}`);
                expect(tally.n, `${group} ${party} sample`).toBeGreaterThan(40);
                expect(withinSampling(tally.women, tally.n, row.women), `women ${tally.women}/${tally.n} vs ${row.women}`).toBe(true);
                expect(withinSampling(tally.white, tally.n, row.white), `white ${tally.white}/${tally.n} vs ${row.white}`).toBe(true);
                expect(withinSampling(tally.black, tally.n, row.black), `black ${tally.black}/${tally.n} vs ${row.black}`).toBe(true);
                expect(withinSampling(tally.hispanic, tally.n, row.hispanic), `hispanic ${tally.hispanic}/${tally.n} vs ${row.hispanic}`).toBe(true);
            });
        }
    }
    it("is no longer nearly all Anglo surnames", () => {
        const pool = generateFoundingPool(SEEDS[0], worldDataset).filter((person) => person.nationality === "USA");
        const nonWhite = pool.filter((person) => parsePortraitRef(person.portraitRef).heritage !== "europe-north").length;
        expect(nonWhite / pool.length).toBeGreaterThan(0.15);
    });
});
