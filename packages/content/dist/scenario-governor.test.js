import { describe, expect, it } from "vitest";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { plantHolidayScenario } from "./__fixtures__/plant-holiday.js";
import { castBound } from "./scenario-cast.js";
const board = sealedCampaign("governor-standing-tests");
const home = board.founding.nation;
function withImpact(site, impact) {
    return {
        ...plantHolidayScenario,
        id: `governor-${site}`,
        once: false,
        conditions: [],
        locus: { site, ground: "home", descriptor: "the mill yards along the river where the shift reads the notice" },
        replies: plantHolidayScenario.replies.map((reply) => reply.commitment.kind === "position" ? { ...reply, commitment: { ...reply.commitment, impact } } : reply),
    };
}
function governorShifts(def) {
    const cast = castBound(board, def, home);
    return cast.script.options.flatMap((option) => option.commitment.kind === "position"
        ? (option.commitment.resolved ?? []).flatMap((effect) => (effect.kind === "state" && effect.governorShift !== undefined ? [effect.governorShift] : []))
        : []);
}
describe("an answer moves the governor of the state it happened in", () => {
    const harm = { human: { lives: "dozens", borneBy: "one-region" }, agency: "on-our-watch" };
    it("pulls the governor away from the administration when the answer reads badly", () => {
        const shifts = governorShifts(withImpact("coast", harm));
        expect(shifts.length).toBeGreaterThan(0);
        expect(shifts.every((shift) => shift < 0)).toBe(true);
    });
    it("targets the state the briefing was datelined in", () => {
        const def = withImpact("coast", harm);
        const cast = castBound(board, def, home);
        const states = cast.script.options.flatMap((option) => option.commitment.kind === "position"
            ? (option.commitment.resolved ?? []).flatMap((effect) => (effect.kind === "state" && effect.governorShift !== undefined ? [effect.state] : []))
            : []);
        expect(states.length).toBeGreaterThan(0);
        expect(new Set(states)).toEqual(new Set([cast.locus.state]));
    });
    it("moves no governor for a reply that moves no opinion, or a decision in Washington", () => {
        expect(governorShifts(withImpact("coast", undefined))).toEqual([]);
        expect(governorShifts(withImpact("capital", harm))).toEqual([]);
    });
});
