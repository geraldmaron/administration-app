import { describe, expect, it } from "vitest";
import { advanceTurn, campaignTurnPhases, hasIntelOnNation, selectFeed } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { recentMoves } from "../reasons/recent-moves";
import { nationProgram } from "./nation-program";
import { nationVitals } from "./nation-vitals";
import { statDefinition } from "./stat-definition";
function weeksOn(campaign, weeks) {
    const phases = campaignTurnPhases(charterOf(campaign));
    let working = campaign;
    for (let week = 0; week < weeks; week += 1)
        working = advanceTurn(working, phases);
    return working;
}
const opening = openingCampaign({ seedText: "foreign-truth-gate" });
const later = weeksOn(opening, 16);
const foreign = Object.keys(opening.nations).filter((id) => id !== opening.founding.nation);
describe("how a foreign country is doing", () => {
    it("bands every vital and prints no figure", () => {
        for (const id of foreign) {
            const vitals = nationVitals(opening, id);
            expect(vitals.map((vital) => vital.key), id).toEqual(["economy", "prices", "jobs", "order", "living"]);
            for (const vital of vitals) {
                expect(vital.word, `${id} ${vital.key}`).not.toMatch(/\d/);
                expect(vital.line ?? "", `${id} ${vital.key}`).not.toMatch(/\d+(\.\d+)?%/);
            }
        }
    });
    it("reads its rulers' hold only where the services read the government", () => {
        for (const id of foreign) {
            const order = nationVitals(opening, id).find((vital) => vital.key === "order");
            expect(order.unread === true, id).toBe(!hasIntelOnNation(opening, id));
        }
    });
    it("says what each reading measures and which systems read it", () => {
        const growth = statDefinition("economy.growth");
        expect(growth.measures).toMatch(/growth/i);
        expect(growth.readBy).toEqual(expect.arrayContaining(["the crises a country can fall into", "how an economy grows or shrinks"]));
        // A government's program writes growth; nothing in it reads growth, so the file does not say it does.
        expect(growth.readBy).not.toContain("the plans a government carries out");
        expect(statDefinition("politics.regimeStability").readBy).toContain("what a government chooses to do abroad");
    });
    it("keeps no vitals for the President's own country", () => {
        expect(nationVitals(opening, opening.founding.nation)).toEqual([]);
    });
});
describe("what a foreign government runs at home", () => {
    it("shows a program in every domain, and when its next review falls", () => {
        for (const id of foreign.slice(0, 20)) {
            const program = nationProgram(opening, id);
            expect(program.rows.length, id).toBe(6);
            expect(program.reviewInWeeks, id).toBeGreaterThanOrEqual(0);
            expect(program.reviewInWeeks, id).toBeLessThan(13);
        }
    });
    it("shows the last change a government made to its program, from the wire", () => {
        const changed = selectFeed(later).filter((item) => item.kind === "governance" && item.actor !== undefined && item.actor in later.nations);
        expect(changed.length).toBeGreaterThan(0);
        const item = changed.at(-1);
        expect(nationProgram(later, item.actor).lastChange?.headline).toBe([...changed].filter((entry) => entry.actor === item.actor).sort((a, b) => b.turn - a.turn)[0].headline);
    });
});
describe("what a foreign government did lately, and why", () => {
    const movers = [...new Set(selectFeed(later).filter((item) => item.kind === "npc-action").map((item) => item.actor))];
    it("lists the moves the wire carried, newest first", () => {
        expect(movers.length).toBeGreaterThan(0);
        for (const id of movers) {
            const moves = recentMoves(later, id);
            expect(moves.length, id).toBeGreaterThan(0);
            expect(moves.map((move) => move.turn), id).toEqual([...moves.map((move) => move.turn)].sort((a, b) => b - a));
        }
    });
    it("gives a read government's move its reasons, and an unread government's none", () => {
        const read = movers.filter((id) => hasIntelOnNation(later, id));
        const unread = movers.filter((id) => !hasIntelOnNation(later, id));
        expect(read.some((id) => recentMoves(later, id).some((move) => move.reasons.length > 0))).toBe(true);
        for (const id of unread)
            for (const move of recentMoves(later, id))
                expect(move.reasons, id).toEqual([]);
    });
});
