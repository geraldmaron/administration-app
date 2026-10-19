import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { LEADER_OFFSET_BOUND, incumbentResidual, leaderRapportBetween } from "./foreign-leader.js";
import { withoutLeaderPersonality } from "./leader-index.js";
import { initiativeRate, npcActorsThisTurn } from "./npc-turn.js";
import { createRngStreams } from "./rng.js";
import { selectConflicts } from "./state.js";
import { leaderLean } from "./temperament.js";
import { advanceTurn } from "./turn-loop.js";
import { campaignTurnPhases } from "./turn-phases.js";
// What foreign leaders' own character does to the world nobody at the desk is
// running: the lean the leader in office at the start puts on their government,
// the two temperament axes their traits now fill, and how well two capitals'
// leaders get on.
//
// Two halves. The spread reads every one of the 195 leaders a founding seats,
// to show the lean is centered on the government's typical leader and stays
// inside its bound. The world half runs the NPC world from source twice from
// one copy of the code, once with the character switched off and once with it
// on, and holds the change to the rejection rule set before it was built:
// actions within 15%, the share aimed at the President within 0.04, the
// median number of wars between other countries up by less than two, and the
// median length of a war within two weeks either way.
//
// Five seeds by a hundred and four weeks, the run `scripts/measure-npc-world.mjs`
// reports, twice: a few minutes.
const AXES = [
    "aggression",
    "riskTolerance",
    "legalism",
    "reliability",
    "isolationism",
    "opportunism",
    "vengefulness",
    "transparency",
];
const SPREAD_SEEDS = ["npc-world-1", "npc-world-2", "npc-world-3"];
const WORLD_SEEDS = ["npc-world-1", "npc-world-2", "npc-world-3", "npc-world-4", "npc-world-5"];
const TURNS = 104;
const STARVED_RATE = 0.15;
function quantile(values, q) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
}
const round3 = (value) => Math.round(value * 1000) / 1000;
const governments = (campaign) => Object.keys(campaign.nations).filter((id) => id !== campaign.founding.nation);
describe("the lean of the 195 leaders a founding seats", () => {
    const foundings = SPREAD_SEEDS.map((seed) => foundedForBalance(seed).campaign);
    it("is centered on each government's typical leader, spread on the axes a leader's disposition moves, and inside the bound", () => {
        const report = {};
        for (const axis of AXES) {
            const residuals = foundings.flatMap((campaign) => governments(campaign).map((id) => incumbentResidual(campaign, id)[axis] ?? 0));
            const live = foundings.flatMap((campaign) => governments(campaign).map((id) => leaderLean(campaign, id)[axis] ?? 0));
            const mean = residuals.reduce((sum, value) => sum + value, 0) / residuals.length;
            report[axis] =
                `residual p10 ${quantile(residuals, 0.1)} median ${quantile(residuals, 0.5)} p90 ${quantile(residuals, 0.9)} mean ${round3(mean)}; ` +
                    `whole lean p10 ${quantile(live, 0.1)} p90 ${quantile(live, 0.9)}`;
            expect(Math.abs(quantile(residuals, 0.5)), axis).toBeLessThanOrEqual(0.015);
            expect(Math.abs(mean), axis).toBeLessThanOrEqual(0.015);
            for (const value of [...residuals, ...live])
                expect(Math.abs(value), axis).toBeLessThanOrEqual(LEADER_OFFSET_BOUND);
        }
        console.log("[ws-e spread]", governments(foundings[0]).length, "governments a seed", JSON.stringify(report, null, 1));
        const aggression = foundings.flatMap((campaign) => governments(campaign).map((id) => incumbentResidual(campaign, id).aggression ?? 0));
        expect(quantile(aggression, 0.9) - quantile(aggression, 0.1)).toBeGreaterThanOrEqual(0.06);
        for (const axis of ["opportunism", "vengefulness"]) {
            const filled = foundings.flatMap((campaign) => governments(campaign).filter((id) => (leaderLean(campaign, id)[axis] ?? 0) !== 0));
            expect(filled.length, axis).toBeGreaterThan(0);
        }
    });
    it("reads rapport inside -1..1, centered toward the President's chair, and reports the pairs between capitals", () => {
        const towardUs = foundings.flatMap((campaign) => governments(campaign).map((id) => leaderRapportBetween(campaign, id, campaign.founding.nation)));
        const pairs = foundings.flatMap((campaign) => {
            const ids = governments(campaign);
            return ids.flatMap((from, i) => ids.filter((_, j) => j > i && (i + j) % 7 === 0).map((to) => leaderRapportBetween(campaign, from, to)));
        });
        const line = (values) => `p10 ${quantile(values, 0.1)} median ${quantile(values, 0.5)} p90 ${quantile(values, 0.9)} at -1 ${round3(values.filter((v) => v <= -1).length / values.length)}`;
        console.log("[ws-e rapport] toward the President:", line(towardUs), "| between capitals:", line(pairs), `(${pairs.length} pairs)`);
        for (const value of [...towardUs, ...pairs])
            expect(Math.abs(value)).toBeLessThanOrEqual(1);
        expect(Math.abs(quantile(towardUs, 0.5))).toBeLessThanOrEqual(0.15);
    });
    it("is the same on a second founding of the same seed and on a copy of the campaign", () => {
        const again = foundedForBalance(SPREAD_SEEDS[0]).campaign;
        const copy = structuredClone(foundings[0]);
        for (const id of governments(again)) {
            expect(leaderLean(again, id), id).toEqual(leaderLean(foundings[0], id));
            expect(leaderLean(copy, id), id).toEqual(leaderLean(foundings[0], id));
            expect(leaderRapportBetween(copy, id, copy.founding.nation)).toBe(leaderRapportBetween(foundings[0], id, foundings[0].founding.nation));
        }
    });
});
function runWorld(seed) {
    const { campaign, charter } = foundedForBalance(seed);
    const phases = campaignTurnPhases(charter);
    const player = campaign.founding.nation;
    const rates = governments(campaign).map((id) => [id, initiativeRate(campaign, id)]);
    const selected = new Set();
    let working = campaign;
    for (let turn = 0; turn < TURNS; turn += 1) {
        for (const id of npcActorsThisTurn(working, createRngStreams(working.seed)))
            selected.add(id);
        working = advanceTurn(working, phases);
    }
    const moves = working.ledger.filter((entry) => entry.actor === "world" && entry.commitment);
    const conflicts = selectConflicts(working);
    const weeks = (conflict) => (conflict.endedTurn ?? working.turn) - conflict.startedTurn;
    return {
        actions: moves.length,
        atPlayer: moves.filter((entry) => entry.commitment.target === player).length,
        npcConflicts: conflicts.filter((c) => c.aggressor !== player && c.defender !== player).length,
        warWeeks: conflicts.filter((c) => !c.inherited).map(weeks),
        carriedWeeks: conflicts.filter((c) => c.inherited).map(weeks),
        rates,
        selected,
        ledgerHash: JSON.stringify(moves.map((entry) => [entry.turn, entry.actor, entry.commitment.target, entry.commitment.instrument, entry.commitment.rung])),
    };
}
function figures(runs) {
    const actions = runs.reduce((sum, run) => sum + run.actions, 0);
    const atPlayer = runs.reduce((sum, run) => sum + run.atPlayer, 0);
    const wars = runs.flatMap((run) => run.warWeeks);
    return {
        actions,
        atPlayerShare: round3(atPlayer / Math.max(1, actions)),
        medianNpcConflicts: quantile(runs.map((run) => run.npcConflicts), 0.5),
        npcConflicts: runs.map((run) => run.npcConflicts),
        warMedianWeeks: quantile(wars, 0.5),
        wars: wars.length,
        carriedMedianWeeks: quantile(runs.flatMap((run) => run.carriedWeeks), 0.5),
        // The measurement script's reading: the first seed's rates against every seed's weeks.
        starved: runs[0].rates.filter(([id, rate]) => rate > STARVED_RATE && !runs.some((run) => run.selected.has(id))).map(([id]) => id),
    };
}
describe("the NPC world with foreign leaders' character on, against the same world with it off", () => {
    let measured;
    const world = () => {
        if (measured)
            return measured;
        const before = withoutLeaderPersonality(() => WORLD_SEEDS.map(runWorld));
        const after = WORLD_SEEDS.map(runWorld);
        measured = { before, after, was: figures(before), is: figures(after) };
        console.log("[ws-e npc-world] before", JSON.stringify(measured.was), "\n[ws-e npc-world] after ", JSON.stringify(measured.is));
        return measured;
    };
    it("keeps the world's volume of action within 15%", () => {
        const { was, is } = world();
        expect(Math.abs(is.actions - was.actions) / was.actions).toBeLessThanOrEqual(0.15);
    });
    it("keeps the share aimed at the President within 0.04", () => {
        const { was, is } = world();
        expect(Math.abs(is.atPlayerShare - was.atPlayerShare)).toBeLessThanOrEqual(0.04);
    });
    it("does not add two wars between other countries at the median", () => {
        const { was, is } = world();
        expect(is.medianNpcConflicts - was.medianNpcConflicts).toBeLessThan(2);
    });
    it("keeps the median war within two weeks, for wars the run started and wars the board carried in", () => {
        const { was, is } = world();
        // A handful of wars start in five idle runs, so their median is read only
        // where both runs have one; how many there are is held by the test above.
        if (is.wars > 0 && was.wars > 0)
            expect(Math.abs(is.warMedianWeeks - was.warMedianWeeks)).toBeLessThanOrEqual(2);
        expect(Math.abs(is.carriedMedianWeeks - was.carriedMedianWeeks)).toBeLessThanOrEqual(2);
    });
    it("starves no government that rolls initiative often", () => {
        expect(world().is.starved).toEqual([]);
    });
    it("moves the world: the character is on, not a no-op", () => {
        const { before, after } = world();
        expect(after.map((run) => run.ledgerHash)).not.toEqual(before.map((run) => run.ledgerHash));
    });
    it("runs the same world twice", () => {
        expect(runWorld(WORLD_SEEDS[0]).ledgerHash).toBe(world().after[0].ledgerHash);
    });
});
