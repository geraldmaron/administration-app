/**
 * The 2026 preset and the seeded opening board, against the owner's controls:
 * the United States is never a belligerent at the oath, no drawn pair shares
 * a defense body or has a US treaty ally in it, the draw replays, and every
 * carried war is marked inherited.
 */
import { describe, expect, it } from "vitest";
import { IRAN_ID, ISRAEL_ID, RUSSIA_ID, UKRAINE_ID, US_ID, organizations } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { FLASHPOINT_CATALOG, OPENING_HELD_INTENSITY, OPENING_LINES, WORLD_2026_AS_OF, openingBoard, openingBoardOmissions, openingWorld, presetWorld2026, selectInheritedWorld, } from "./opening-world.js";
import { HELD_FRONT_INTENSITY, OPENING_WAR_SUPPORT, conflictPhase } from "./war-tick.js";
import { liftMeasure } from "./trade.js";
import { bilateralGoods } from "./trade-volume.js";
const PROBE_SEEDS = Array.from({ length: 30 }, (_, index) => `probe-${index}`);
const { campaign: sealed } = foundedForBalance("opening-world", "democrat", {}, { carriedWorld: false });
function parties(war) {
    return [war.aggressor, war.defender, ...war.joined.aggressor, ...war.joined.defender];
}
const DEFENSE = new Set(organizations.filter((org) => org.kind === "defense").map((org) => org.id));
function defenseBodies(nation) {
    const runtime = sealed.nations[nation];
    return (runtime?.memberships ?? runtime?.base.memberships ?? []).filter((org) => DEFENSE.has(org));
}
describe("presetWorld2026", () => {
    const wars = presetWorld2026(sealed.calendar);
    const ukraine = wars.find((war) => war.aggressor === RUSSIA_ID && war.defender === UKRAINE_ID);
    const iran = wars.find((war) => war.aggressor === ISRAEL_ID && war.defender === IRAN_ID);
    it("opens Russia against Ukraine as an active war and Israel against Iran on a held front", () => {
        expect(wars).toHaveLength(2);
        expect(ukraine.status).toBe("active");
        expect(ukraine.intensity).toBeGreaterThanOrEqual(HELD_FRONT_INTENSITY);
        expect(ukraine.warSupport).toEqual(OPENING_WAR_SUPPORT);
        expect(iran.intensity).toBe(OPENING_HELD_INTENSITY);
        expect(iran.intensity).toBeLessThan(HELD_FRONT_INTENSITY);
    });
    it("maps a war's age to exhaustion by one rule, capped at half", () => {
        expect(ukraine.exhaustion).toEqual({ aggressor: 0.5, defender: 0.5 });
        expect(iran.exhaustion.aggressor).toBeGreaterThan(0);
        expect(iran.exhaustion.aggressor).toBeLessThanOrEqual(0.5);
    });
    it("marks both inherited, as of the table's date, with the source they were read from and backdated beats", () => {
        for (const war of wars) {
            expect(war.inherited?.asOf).toEqual(WORLD_2026_AS_OF);
            expect(war.inherited?.source).toMatch(/https:\/\//);
            expect(war.beats.every((beat) => beat.turn < sealed.turn)).toBe(true);
            expect(war.beats.map((beat) => beat.description)).toContain(OPENING_LINES.mapped);
        }
        expect(ukraine.beats.map((beat) => beat.description)).toContain(OPENING_LINES.since({ year: 2022, month: 2, day: 1 }));
    });
    it("leaves the United States out of both wars", () => {
        for (const war of wars)
            expect(parties(war)).not.toContain(US_ID);
    });
});
describe("the seeded board", () => {
    const boards = PROBE_SEEDS.map((seed) => openingBoard(seed, sealed.nations, sealed.calendar));
    it("returns the same board for one seed", () => {
        expect(openingBoard("oath", sealed.nations, sealed.calendar)).toEqual(openingBoard("oath", sealed.nations, sealed.calendar));
    });
    it("draws empty boards and boards with up to two wars, never sharing a belligerent", () => {
        expect(boards.some((board) => board.length === 0)).toBe(true);
        expect(boards.some((board) => board.length > 0)).toBe(true);
        for (const board of boards) {
            expect(board.length).toBeLessThanOrEqual(2);
            const everyone = board.flatMap((war) => [war.aggressor, war.defender]);
            expect(new Set(everyone).size).toBe(everyone.length);
        }
    });
    it("holds the owner's controls: no United States, no treaty ally of it, no pair that shares a defense body", () => {
        const usBodies = new Set(defenseBodies(US_ID));
        for (const war of boards.flat()) {
            expect(parties(war)).not.toContain(US_ID);
            for (const party of [war.aggressor, war.defender])
                expect(defenseBodies(party).some((org) => usBodies.has(org))).toBe(false);
            const theirs = new Set(defenseBodies(war.defender));
            expect(defenseBodies(war.aggressor).some((org) => theirs.has(org))).toBe(false);
        }
    });
    it("marks every drawn war inherited without claiming a real date", () => {
        for (const war of boards.flat()) {
            expect(war.inherited?.asOf).toEqual(sealed.calendar);
            expect(war.inherited?.source).toMatch(/flashpoint catalog/);
        }
    });
    it("draws only from the catalog, and every catalog row cites where its hostility was read", () => {
        const pairs = new Set(FLASHPOINT_CATALOG.map((pair) => `${pair.aggressor}:${pair.defender}`));
        for (const war of boards.flat())
            expect(pairs.has(`${war.aggressor}:${war.defender}`)).toBe(true);
        for (const pair of FLASHPOINT_CATALOG)
            expect(pair.source).not.toBe("");
    });
});
describe("what else the board carries", () => {
    const world = openingWorld(sealed.nations, sealed.calendar, "board", "world-2026");
    it("carries the civil and non-state wars as insurgencies in their hosts, one a host", () => {
        const hosts = world.operators.map((op) => op.nationality);
        expect(new Set(hosts).size).toBe(hosts.length);
        expect(world.operators.every((op) => op.kind === "insurgency")).toBe(true);
        expect(hosts).toEqual(expect.arrayContaining(["SDN", "MMR", "COD", "MLI"]));
    });
    it("carries the sanctions programs as inherited measures under OFAC's authority", () => {
        expect(world.measures.length).toBeGreaterThan(0);
        for (const measure of world.measures) {
            expect(measure.authority).toBe("INST-OFAC");
            expect(measure.origin).toBe("us");
            expect(measure.id).toMatch(/:inherited$/);
            expect(measure.rate).toBe(0);
        }
        expect(world.measures.find((measure) => measure.target === "CUB")?.kind).toBe("embargo");
    });
    it("stops Cuban imports and leaves the licensed exports the record carries, and lifts as an embargo", () => {
        const preset = foundedForBalance("opening-world", "democrat", {}, { openingPreset: "world-2026" }).campaign;
        const cuba = Object.values(preset.trade.measures).find((measure) => measure.target === "CUB");
        expect(cuba?.direction).toBe("imports");
        const goods = bilateralGoods(preset, "CUB");
        expect(goods.imports).toBe(0);
        expect(goods.exports).toBeGreaterThan(0);
        const lifted = liftMeasure(preset, cuba.id);
        if (!lifted.ok)
            throw new Error(lifted.reason);
        expect(lifted.packet.narration.summary).toBe("The embargo on Cuba is lifted.");
        expect(lifted.packet.effects.some((effect) => effect.kind === "relationship")).toBe(true);
    });
    it("reports every carried row it could not seed, and why", () => {
        expect(openingBoardOmissions(sealed.nations).every((line) => line.includes(":"))).toBe(true);
    });
    it("opens the Gulf posture beside the Iran front and not without it", () => {
        expect(world.commitments.some((commitment) => commitment.kind === "deployment")).toBe(true);
        const quiet = openingWorld(sealed.nations, sealed.calendar, PROBE_SEEDS.find((seed) => openingBoard(seed, sealed.nations).length === 0), "seeded");
        expect(quiet.commitments.some((commitment) => commitment.kind === "deployment")).toBe(false);
    });
});
describe("the banner", () => {
    it("names the table's date on the preset, no date on a seeded board, and says the state was mapped", () => {
        const preset = foundedForBalance("opening-world", "democrat", {}, { openingPreset: "world-2026" }).campaign;
        const reading = selectInheritedWorld(preset);
        expect(reading.banner).toBe(OPENING_LINES.bannerAsOf(WORLD_2026_AS_OF));
        expect(reading.mapped).toBe(OPENING_LINES.mapped);
        expect(reading.wars).toHaveLength(2);
        expect(selectInheritedWorld(sealed)).toBeUndefined();
    });
});
// A planning check on the mapping and the war tick's constants, not a timer in
// code: no carried war ends in its first half-year on its own.
describe("the carried wars hold their first 26 weeks", () => {
    it("across 12 seeds on the 2026 preset", () => {
        for (let index = 0; index < 12; index += 1) {
            let state = foundedForBalance(`carried-${index}`, "democrat", {}, { openingPreset: "world-2026" }).campaign;
            const carried = Object.values(state.conflicts).filter((war) => war.inherited).map((war) => war.id);
            for (let week = 0; week < 26; week += 1) {
                state = conflictPhase(state).reduce((next, packet) => apply(next, packet), state);
                state = { ...state, turn: state.turn + 1 };
            }
            for (const id of carried)
                expect(state.conflicts[id].status, `seed carried-${index}, ${id}`).toBe("active");
        }
    }, 120_000);
});
