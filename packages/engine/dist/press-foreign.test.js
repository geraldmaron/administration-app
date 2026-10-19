import { describe, expect, it } from "vitest";
import { worldDataset } from "@admin/world";
import { FOREIGN_ARTICLE_BANK, STATE_MEDIA_ECHO, foreignPiece, foreignPressWeek } from "./article-foreign.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { AFFINITY_CAP, AFFINITY_STEP, FOREIGN_OUTLETS, STATE_PRESS_CEILING, coverageBand, coverageScore, coverageWeek, foreignCoverage, politicalCloseness, } from "./press-foreign.js";
import { selectRelationship } from "./state.js";
// The foreign press: eight fictional outlets, state media that repeat their
// government, and coverage that moves a government's trust in the President
// by no more than the cap, however long the term runs.
const democrat = foundedForBalance("foreign-press", "democrat").campaign;
const republican = foundedForBalance("foreign-press", "republican").campaign;
function pressWeeks(state, weeks) {
    let working = state;
    for (let week = 0; week < weeks; week += 1) {
        working = apply(working, { source: "simulate", actor: "world", turn: working.turn, narration: { summary: "The press abroad files." }, effects: coverageWeek(working), background: true });
    }
    return working;
}
const pressFreedomOf = (nation) => worldDataset.nations.find((entry) => entry.id === nation).stats.politics.pressFreedom;
describe("the foreign outlets", () => {
    it("are eight: two wire agencies, national papers, and state media only where the press is in the lowest band", () => {
        expect(FOREIGN_OUTLETS).toHaveLength(8);
        expect(FOREIGN_OUTLETS.filter((outlet) => outlet.kind === "wire")).toHaveLength(2);
        for (const outlet of FOREIGN_OUTLETS) {
            const lowest = pressFreedomOf(outlet.nation) < STATE_PRESS_CEILING;
            expect(outlet.kind === "state-media", outlet.id).toBe(lowest);
        }
        expect(FOREIGN_OUTLETS.some((outlet) => outlet.kind === "state-media")).toBe(true);
        expect(FOREIGN_OUTLETS.some((outlet) => outlet.kind === "national")).toBe(true);
    });
    it("each carry a name, a beat and a sign-off of their own", () => {
        for (const field of ["id", "name", "beat", "signature"]) {
            expect(new Set(FOREIGN_OUTLETS.map((outlet) => outlet[field])).size, field).toBe(FOREIGN_OUTLETS.length);
        }
    });
});
describe("how a country's press covers the President", () => {
    it("is nothing until the press abroad has first filed", () => {
        expect(foreignCoverage(democrat, "DEU")).toBeUndefined();
        expect(foreignPressWeek(democrat, FOREIGN_OUTLETS)).toEqual([]);
    });
    it("repeats the government's standing with Washington where the press is the state's", () => {
        const filed = pressWeeks(democrat, 1);
        const china = "CHN";
        const trust = selectRelationship(filed, china, filed.founding.nation)?.trust ?? 0;
        expect(coverageScore(filed, china)).toBeCloseTo(trust, 4);
        expect(foreignCoverage(filed, china)?.echo).toBe(true);
        expect(foreignCoverage(filed, "DEU")?.echo).toBe(false);
    });
    it("is a band a screen may print, and the outlet's piece reads in its own format's voice", () => {
        expect(coverageBand(0.5)).toBe("warm");
        expect(coverageBand(0)).toBe("neutral");
        expect(coverageBand(-0.2)).toBe("cool");
        expect(coverageBand(-0.9)).toBe("hostile");
        const filed = pressWeeks(democrat, 1);
        for (const outlet of FOREIGN_OUTLETS) {
            const piece = foreignPiece(filed, outlet);
            expect(piece.voice, outlet.id).toBe(FOREIGN_ARTICLE_BANK[outlet.kind].voice[piece.band]);
            expect(piece.signature).toBe(outlet.signature);
            expect(Boolean(piece.echo), outlet.id).toBe(outlet.kind === "state-media");
            if (piece.echo)
                expect(STATE_MEDIA_ECHO).toContain(piece.echo);
        }
    });
});
describe("what coverage does to a government's trust in the President", () => {
    it("moves trust one capped step a week, and never past the cap over a whole term", () => {
        const term = pressWeeks(democrat, 60);
        for (const [nation, entry] of Object.entries(term.foreignCoverage ?? {})) {
            expect(Math.abs(entry.affinity), nation).toBeLessThanOrEqual(AFFINITY_CAP + 1e-9);
            const before = selectRelationship(democrat, nation, democrat.founding.nation)?.trust;
            const after = selectRelationship(term, nation, term.founding.nation)?.trust;
            if (before === undefined || after === undefined)
                continue;
            expect(Math.abs(after - before), nation).toBeLessThanOrEqual(AFFINITY_CAP + 1e-9);
        }
        const one = pressWeeks(democrat, 1);
        for (const entry of Object.values(one.foreignCoverage ?? {}))
            expect(Math.abs(entry.affinity)).toBeLessThanOrEqual(AFFINITY_STEP + 1e-9);
    });
    // Per-party deltas: the same world read under either party's President. The
    // figures are for the owner's report; the claims here are that the two
    // differ and both hold the cap.
    it("reads differently under a Democratic and a Republican President, and holds the cap under both", () => {
        const d = pressWeeks(democrat, 26);
        const r = pressWeeks(republican, 26);
        const differs = Object.keys(d.foreignCoverage ?? {}).some((nation) => d.foreignCoverage[nation].affinity !== r.foreignCoverage?.[nation]?.affinity);
        expect(differs).toBe(true);
        for (const state of [d, r]) {
            for (const entry of Object.values(state.foreignCoverage ?? {}))
                expect(Math.abs(entry.affinity)).toBeLessThanOrEqual(AFFINITY_CAP + 1e-9);
        }
        expect(politicalCloseness(democrat, "DEU")).toBeGreaterThanOrEqual(-1);
        expect(politicalCloseness(democrat, "DEU")).toBeLessThanOrEqual(1);
    });
});
