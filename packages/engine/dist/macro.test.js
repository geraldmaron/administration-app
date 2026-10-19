import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { COST_REVERSION_RATE, macroBaseline, macroDriftPhase, macroEffectsFor, NO_CYCLE, POLITICAL_REVERSION_RATE, REVERSION_RATE, } from "./macro.js";
import { costBaseline, crimeBaseline, normalPriceLevel } from "./macro-baseline.js";
import { foundedForBalance } from "./balance-harness.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { advanceTurn } from "./turn-loop.js";
import { makeCampaignSeed } from "./rng.js";
import { conditionMacroPressure } from "./conditions.js";
import { atWarAsParty } from "./war-party.js";
import { programRestingOffset } from "./governance.js";
import { policyStance } from "./policy.js";
import { CHARTER_USA_CONSTITUTION } from "@admin/world";
import { apply } from "./effects.js";
import { advanceCalendar } from "./calendar.js";
import { DAYS_PER_TURN } from "./turn-clock.js";
import { fiscalPhase } from "./fiscal.js";
import { MACRO_BOUNDS } from "./macro.js";
const USA = "USA";
const runPhase = (campaign) => macroDriftPhase(campaign).reduce((acc, packet) => apply(acc, packet), campaign);
/**
 * A week of the law and of the output it moves. The gap is output against
 * potential, and output is `fiscalPhase`'s to compound, so a run of the law
 * alone would watch potential grow away from an output that never moved.
 */
const weekOfLaw = (campaign) => {
    const moved = runPhase(campaign);
    const grown = fiscalPhase(moved).reduce((acc, packet) => apply(acc, packet), moved);
    return { ...grown, turn: grown.turn + 1, calendar: advanceCalendar(grown.calendar, DAYS_PER_TURN) };
};
/** Every cycle held at rest, for a test about where a law settles rather than how the cycle swings it. */
const atRest = (campaign) => ({
    ...campaign,
    cycles: Object.fromEntries(Object.keys(campaign.cycles).map((id) => [id, NO_CYCLE])),
});
const withStats = (campaign, economy) => {
    const runtime = campaign.nations[USA];
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [USA]: { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, ...economy } } },
        },
    };
};
const withSecurity = (campaign, security) => {
    const runtime = campaign.nations[USA];
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [USA]: { ...runtime, stats: { ...runtime.stats, security: { ...runtime.stats.security, ...security } } },
        },
    };
};
const recession = (severity) => ({
    id: `condition:recession:USA:1`,
    nation: USA,
    kind: "recession",
    scope: "nation",
    severity,
    startedTurn: 1,
    status: "active",
    beats: [],
});
describe("macroBaseline", () => {
    it("rests a rich stable economy at low growth and low unemployment", () => {
        const baseline = macroBaseline(buildCampaign().nations[USA], NO_CYCLE);
        expect(baseline.growth).toBeGreaterThan(0);
        expect(baseline.growth).toBeLessThan(0.05);
        expect(baseline.unemployment).toBeGreaterThan(0);
        expect(baseline.unemployment).toBeLessThan(0.2);
    });
});
describe("crimeBaseline — direction and bound", () => {
    it("rises with unemployment above the 5% floor, not below it", () => {
        const runtime = buildCampaign().nations[USA];
        const low = crimeBaseline({ ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, unemployment: 0.04 } } });
        const high = crimeBaseline({ ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, unemployment: 0.2 } } });
        const belowFloor = crimeBaseline({ ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, unemployment: 0.02 } } });
        expect(high).toBeGreaterThan(low);
        // Below the 5% floor, unemployment contributes nothing — the term is
        // max(0, unemployment - 0.05), so 2% and 4% read identically.
        expect(low).toBe(belowFloor);
    });
    it("rises with cost of living above parity, not below it", () => {
        const runtime = buildCampaign().nations[USA];
        const cheap = crimeBaseline({ ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, costOfLiving: 0.9 } } });
        const dear = crimeBaseline({ ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, costOfLiving: 1.5 } } });
        const atParity = crimeBaseline({ ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, costOfLiving: 1.0 } } });
        expect(dear).toBeGreaterThan(cheap);
        expect(cheap).toBe(atParity);
    });
    it("is always inside 0..1, even at the schema's extremes", () => {
        const runtime = buildCampaign().nations[USA];
        const worst = crimeBaseline({
            ...runtime,
            stats: { ...runtime.stats, economy: { ...runtime.stats.economy, unemployment: 1, costOfLiving: 5 }, security: { ...runtime.stats.security, corruptionIndex: 1, borderControl: 0 } },
        });
        expect(worst).toBeGreaterThanOrEqual(0);
        expect(worst).toBeLessThanOrEqual(1);
    });
});
describe("costBaseline — direction and lag", () => {
    it("compounds upward under positive inflation, downward under deflation", () => {
        expect(costBaseline(1.0, 0.03, 1 / 52)).toBeGreaterThan(1.0);
        expect(costBaseline(1.0, -0.01, 1 / 52)).toBeLessThan(1.0);
    });
    it("is exactly stationary at zero inflation", () => {
        expect(costBaseline(1.2, 0, 1 / 52)).toBe(1.2);
    });
    it("scales with yearFraction — a finer turn moves less per turn", () => {
        const week = costBaseline(1.0, 0.05, 1 / 52) - 1.0;
        const year = costBaseline(1.0, 0.05, 1) - 1.0;
        expect(week).toBeGreaterThan(0);
        expect(week).toBeLessThan(year);
    });
});
describe("macroDriftPhase — the coupling edges", () => {
    it("moves costOfLiving off this week's own inflation, at COST_REVERSION_RATE (full adoption)", () => {
        const inflated = withStats(buildCampaign(), { inflation: 0.5, costOfLiving: 1.0 });
        const after = runPhase(inflated).nations[USA].stats.economy;
        expect(after.costOfLiving).toBeGreaterThan(1.0);
        expect(COST_REVERSION_RATE).toBe(1);
    });
    it("moves crimeIndex toward crimeBaseline, reading the STARTING unemployment and cost of living — the one-turn lag", () => {
        const restive = withSecurity(withStats(buildCampaign(), { unemployment: 0.35, costOfLiving: 2.0 }), { crimeIndex: 0.1 });
        const baselineNow = crimeBaseline(restive.nations[USA]);
        const after = runPhase(restive).nations[USA].stats.security.crimeIndex;
        // Reverts toward this turn's baseline (computed off the pre-turn economy),
        // not toward the authored resting figure.
        expect(after).toBeGreaterThan(0.1);
        expect(after).toBeLessThanOrEqual(baselineNow);
    });
    it("keeps crimeIndex inside 0..1 under two hundred turns of the worst case", () => {
        let campaign = withStats(withSecurity(buildCampaign(), { corruptionIndex: 1, borderControl: 0 }), {
            unemployment: 1,
            costOfLiving: 5,
        });
        for (let turn = 0; turn < 200; turn++) {
            campaign = { ...runPhase(campaign), turn: campaign.turn + 1 };
        }
        const crimeIndex = campaign.nations[USA].stats.security.crimeIndex;
        expect(crimeIndex).toBeGreaterThanOrEqual(0);
        expect(crimeIndex).toBeLessThanOrEqual(1);
    });
    it("keeps costOfLiving inside its schema bound under two hundred turns of high inflation", () => {
        let campaign = withStats(buildCampaign(), { inflation: 2 });
        for (let turn = 0; turn < 200; turn++) {
            campaign = { ...runPhase(campaign), turn: campaign.turn + 1 };
        }
        expect(campaign.nations[USA].stats.economy.costOfLiving).toBeLessThanOrEqual(MACRO_BOUNDS.costOfLiving.max);
        expect(campaign.nations[USA].stats.economy.costOfLiving).toBeGreaterThan(2);
    });
    it("replays identically from the same seed, crime and cost of living included", () => {
        const campaign = buildCampaign();
        expect(macroEffectsFor(campaign, USA)).toEqual(macroEffectsFor(campaign, USA));
    });
    it("stamps cohort strain through the real apply() path when a vital edge crosses", () => {
        const before = withStats(buildCampaign(), { costOfLiving: 1.049, inflation: 1.0 });
        const cohortsBefore = before.cohorts["income-struggling"] ?? [];
        const after = runPhase(before);
        const cohortsAfter = after.cohorts["income-struggling"] ?? [];
        expect(cohortsAfter.length).toBeGreaterThan(cohortsBefore.length);
    });
    it("a vital edge never writes a state GrievanceMark, so cohort strain never sums with state grievance", () => {
        const before = withStats(buildCampaign(), { costOfLiving: 1.049, inflation: 1.0 });
        const marksBefore = Object.values(before.states).reduce((sum, s) => sum + s.marks.length, 0);
        const after = runPhase(before);
        const marksAfter = Object.values(after.states).reduce((sum, s) => sum + s.marks.length, 0);
        expect(marksAfter).toBe(marksBefore);
    });
    it("does not restamp cohort strain on a second turn the edge merely holds above threshold", () => {
        let campaign = withStats(buildCampaign(), { costOfLiving: 1.049, inflation: 1.0 });
        campaign = { ...runPhase(campaign), turn: campaign.turn + 1 };
        const afterFirstCross = (campaign.cohorts["income-struggling"] ?? []).length;
        // Hold inflation low so costOfLiving stays above 1.05 without crossing 1.12.
        campaign = withStats(campaign, { inflation: 0.01 });
        campaign = { ...runPhase(campaign), turn: campaign.turn + 1 };
        const afterSecondTurn = (campaign.cohorts["income-struggling"] ?? []).length;
        expect(afterSecondTurn).toBe(afterFirstCross);
    });
});
describe("macroDriftPhase — the restoring force", () => {
    it("pulls a slumped economy back toward its baseline", () => {
        const slumped = withStats(buildCampaign(), { growth: -0.2 });
        const after = runPhase(slumped);
        expect(after.nations[USA].stats.economy.growth).toBeGreaterThan(-0.2);
    });
    it("pulls an overheated economy back down", () => {
        const hot = withStats(buildCampaign(), { growth: 0.29 });
        const after = runPhase(hot);
        expect(after.nations[USA].stats.economy.growth).toBeLessThan(0.29);
    });
    it("Okun's rule: unemployment rests higher while output runs below its potential, not lower", () => {
        // The sign this catches: a gap below potential is negative, so the Okun
        // term has to subtract it to raise the target. Unnegated, a country running
        // deep below its potential rested unemployment lower.
        const campaign = buildCampaign();
        const potential = campaign.macro[USA].potential;
        const slumped = { ...campaign, macro: { ...campaign.macro, [USA]: { ...campaign.macro[USA], potential: potential * 1.05 } } };
        const clean = runPhase(campaign).nations[USA].stats.economy.unemployment;
        expect(runPhase(slumped).nations[USA].stats.economy.unemployment).toBeGreaterThan(clean);
    });
    it("is the phase that applies a condition's macro pressure", () => {
        const base = buildCampaign();
        const under = { ...base, conditions: { ...base.conditions, [recession(1).id]: recession(1) } };
        expect(conditionMacroPressure(under, USA)).toEqual({ growth: 0, inflation: 0, unemployment: 0 });
        // A recession is a label: what it costs the economy is the rates it names.
        // An acute condition is the one that drags growth here.
        const flood = { ...recession(1), id: "condition:flood:USA:1", kind: "flood" };
        const flooded = { ...base, conditions: { ...base.conditions, [flood.id]: flood } };
        expect(conditionMacroPressure(flooded, USA).growth).toBeGreaterThan(0);
        const before = base.nations[USA].stats.economy.growth;
        const after = runPhase(flooded).nations[USA].stats.economy.growth;
        const clean = runPhase(base).nations[USA].stats.economy.growth;
        expect(after).toBeLessThan(clean);
        void before;
    });
    it("never lets a campaign ratchet to the clamp under a standing condition", () => {
        // The failure mode this whole design exists to prevent: a recession whose
        // own cost feeds its own onset, driving growth to the schema floor and
        // holding it there. Two hundred turns of a maximum-severity recession must
        // still leave an economy above the clamp, because the recession does not
        // write the figure it is gated on and reversion keeps pulling.
        let campaign = withStats(buildCampaign(), { growth: -0.05 });
        campaign = { ...campaign, conditions: { ...campaign.conditions, [recession(1).id]: recession(1) } };
        for (let turn = 0; turn < 200; turn++) {
            campaign = { ...runPhase(campaign), turn: campaign.turn + 1 };
        }
        expect(campaign.nations[USA].stats.economy.growth).toBeGreaterThan(-0.3);
        expect(campaign.nations[USA].stats.economy.growth).toBeGreaterThan(-0.05);
    });
    it("makes a price shock dearer and a slump cheaper", () => {
        // The sign of the inflation channel, pinned because it is invisible at
        // every call site and reads as correct either way. A condition's macro
        // pressure is authored as harm, and harm is a HIGHER inflation number, so
        // it enters the target on its own sign; a slump reaches prices through the
        // gap, and output below potential takes the edge off them.
        const base = buildCampaign();
        const shortage = { ...recession(1), id: "condition:energy-shortage:USA:1", kind: "energy-shortage" };
        const shocked = { ...base, conditions: { ...base.conditions, [shortage.id]: shortage } };
        expect(conditionMacroPressure(shocked, USA).inflation).toBeGreaterThan(0);
        const clean = runPhase(base).nations[USA].stats.economy.inflation;
        expect(runPhase(shocked).nations[USA].stats.economy.inflation).toBeGreaterThan(clean);
        const potential = base.macro[USA].potential;
        const slumped = { ...base, macro: { ...base.macro, [USA]: { ...base.macro[USA], potential: potential * 1.05 } } };
        expect(runPhase(slumped).nations[USA].stats.economy.inflation).toBeLessThan(clean);
    });
    it("lets the conditions that are causes drag output, and the three that are labels drag nothing", () => {
        const base = buildCampaign();
        const clean = runPhase(base).nations[USA].stats.economy.growth;
        for (const kind of ["fiscal-crisis", "energy-shortage", "housing-crunch"]) {
            const condition = { ...recession(1), id: `condition:${kind}:USA:1`, kind };
            const under = { ...base, conditions: { ...base.conditions, [condition.id]: condition } };
            expect(conditionMacroPressure(under, USA).growth, kind).toBeGreaterThan(0);
            expect(runPhase(under).nations[USA].stats.economy.growth, kind).toBeLessThan(clean);
        }
        for (const kind of ["recession", "inflation-shock", "unemployment-shock"]) {
            const condition = { ...recession(1), id: `condition:${kind}:USA:1`, kind };
            const under = { ...base, conditions: { ...base.conditions, [condition.id]: condition } };
            expect(conditionMacroPressure(under, USA), kind).toEqual({ growth: 0, inflation: 0, unemployment: 0 });
            expect(runPhase(under).nations[USA].stats.economy, kind).toEqual(runPhase(base).nations[USA].stats.economy);
        }
    });
    it("keeps mass unemployment from feeding itself through the output channel", () => {
        // The one indirect path back to a standing kind's own reading: the drag
        // lowers growth, and the drift phase rests unemployment higher when growth
        // runs under baseline, which is the figure this kind opens on. Two hundred
        // weeks of it at full severity must still leave unemployment short of the
        // clamp, or the recovery it closes on can never arrive.
        const shock = { ...recession(1), id: "condition:unemployment-shock:USA:1", kind: "unemployment-shock" };
        let campaign = { ...buildCampaign(), conditions: {} };
        campaign = { ...campaign, conditions: { [shock.id]: shock } };
        for (let turn = 0; turn < 200; turn++) {
            campaign = { ...runPhase(campaign), turn: campaign.turn + 1 };
        }
        expect(campaign.nations[USA].stats.economy.unemployment).toBeLessThan(0.5);
        expect(campaign.nations[USA].stats.economy.growth).toBeGreaterThan(-0.3);
    });
    it("replays identically from the same seed", () => {
        const campaign = buildCampaign();
        expect(macroEffectsFor(campaign, USA)).toEqual(macroEffectsFor(campaign, USA));
    });
    it("marks its one packet as the world's background, so the Record of decisions can leave it out", () => {
        const packets = macroDriftPhase(buildCampaign());
        expect(packets).toHaveLength(1);
        expect(packets[0].background).toBe(true);
    });
    it("keeps every nation's macro record, a week on", () => {
        const campaign = buildCampaign();
        const kept = macroDriftPhase(campaign).flatMap((packet) => packet.effects).filter((effect) => effect.kind === "macroState");
        expect(kept.map((effect) => (effect.kind === "macroState" ? effect.nation : undefined)).sort()).toEqual(Object.keys(campaign.nations).sort());
    });
    it("moves every nation, not only the played one", () => {
        const campaign = withStats(buildCampaign(), { growth: -0.2 });
        const packets = macroDriftPhase(campaign);
        const nations = new Set(packets.flatMap((packet) => packet.effects.map((effect) => ("nation" in effect ? effect.nation : undefined))));
        expect(nations.size).toBeGreaterThan(1);
    });
    it("keeps a reversion step proportional to the gap", () => {
        const runtime = buildCampaign().nations[USA];
        const baseline = macroBaseline(runtime, NO_CYCLE);
        const far = withStats(buildCampaign(), { growth: baseline.growth - 0.2 });
        const near = withStats(buildCampaign(), { growth: baseline.growth - 0.02 });
        const farStep = runPhase(far).nations[USA].stats.economy.growth - (baseline.growth - 0.2);
        const nearStep = runPhase(near).nations[USA].stats.economy.growth - (baseline.growth - 0.02);
        expect(farStep).toBeGreaterThan(nearStep);
        expect(REVERSION_RATE).toBeGreaterThan(0);
    });
});
// The fixture charter seats one chair, and a domain with no minister is not
// legislable — so a test about what a program does to a rate has to seat the
// chair that carries it first.
function underProgram(campaign, stanceIds) {
    const holder = Object.keys(campaign.people)[0];
    const chairs = Object.fromEntries(
    // Every chair the playable constitution seats, so every domain resolves a
    // minister. Seating them per-domain would be circular now that a domain's
    // chair is resolved against the seats that exist.
    CHARTER_USA_CONSTITUTION.cabinetRoles.map((role) => [role, holder]));
    const policies = { ...campaign.player.policies };
    for (const id of stanceIds)
        policies[policyStance(id).domain] = id;
    return {
        ...campaign,
        founding: { ...campaign.founding, cabinet: { ...campaign.founding.cabinet, ...chairs } },
        player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, ...chairs }, policies },
    };
}
// Isolates the program's resting-point law from the business cycle, which
// these tests do not exercise (it is covered separately) and which would
// otherwise reach its own dwell window well inside 400-900 turns and start
// moving the very target these tests check against. Reset every turn, not
// just once at the top, because a live cycle can transition on any turn once
// its dwell is served.
const settle = (campaign, turns) => {
    let working = campaign;
    for (let i = 0; i < turns; i++) {
        working = weekOfLaw({ ...working, cycles: { ...working.cycles, [USA]: NO_CYCLE } });
    }
    return working;
};
/**
 * Where a rate sits on average once settled. Each week draws its own shock, so
 * a single week lands anywhere inside the shock's spread; the mean of a long
 * run is where the law actually rests it.
 */
function settledMean(campaign, turns, read) {
    let working = settle(campaign, turns);
    let sum = 0;
    const window = 200;
    for (let i = 0; i < window; i++) {
        working = settle(working, 1);
        sum += read(working.nations[USA]);
    }
    return sum / window;
}
describe("macroDriftPhase — where a standing program leaves a rate", () => {
    it("rests growth at the authored figure, not at the authored figure over the reversion rate", () => {
        const campaign = underProgram(buildCampaign(), ["fiscal-investment"]);
        const offset = programRestingOffset(campaign, USA)["economy.growth"];
        expect(offset).toBeGreaterThan(0);
        const settled = settle(campaign, 400).nations[USA];
        const target = macroBaseline(settled, NO_CYCLE).growth + offset;
        const growth = settledMean(campaign, 400, (runtime) => runtime.stats.economy.growth);
        expect(Math.abs(growth - target)).toBeLessThan(0.002);
        // The defect this replaced: a weekly level write settles twenty-five times
        // higher, which is a different number by orders of magnitude rather than by
        // a tolerance.
        expect(growth).toBeLessThan(target + offset / REVERSION_RATE / 2);
    });
    it("rests the street where the program puts it, at a hundredth of the old resting point", () => {
        const campaign = underProgram(buildCampaign(), ["civil-emergency-powers"]);
        const offset = programRestingOffset(campaign, USA)["politics.protestPressure"];
        expect(offset).toBeLessThan(0);
        const settled = settle(campaign, 900).nations[USA];
        const authored = settled.base.stats.politics.protestPressure;
        expect(settled.stats.politics.protestPressure).toBeCloseTo(authored + offset, 3);
        // At a quarter of the economic rate the level write was worth a hundred
        // times its figure, which emptied the street outright.
        expect(offset / POLITICAL_REVERSION_RATE).toBeLessThan(-authored);
    });
    it("measures the unemployment rule against the trend the program set, not the one it left", () => {
        const campaign = underProgram(buildCampaign(), ["fiscal-investment"]);
        const settled = settle(campaign, 400).nations[USA];
        const offset = programRestingOffset(campaign, USA);
        const target = macroBaseline(settled, NO_CYCLE).unemployment + offset["economy.unemployment"];
        // A growth program that raised the target but not potential would read
        // permanently above potential and rest below this figure forever: the
        // program's supply moves potential with it, so the gap holds.
        const unemployment = settledMean(campaign, 400, (runtime) => runtime.stats.economy.unemployment);
        expect(Math.abs(unemployment - target)).toBeLessThan(0.002);
    });
});
describe("macroDriftPhase — the economy rests where the country was found", () => {
    const { campaign: FOUNDED, charter: CHARTER } = foundedForBalance("macro-anchors");
    const RATES = ["growth", "inflation", "unemployment"];
    /** Four standing deviations of the weekly shock's settled spread: past this, it is drift. */
    const SPREAD = { growth: 0.016, inflation: 0.013, unemployment: 0.0065 };
    const lawAlone = (campaign, weeks) => {
        let working = campaign;
        for (let week = 0; week < weeks; week += 1)
            working = weekOfLaw(working);
        return working;
    };
    /** The law with every cycle held at rest each week, not only at the start: a dwell served would turn it. */
    const restingLaw = (campaign, weeks) => {
        let working = campaign;
        for (let week = 0; week < weeks; week += 1)
            working = weekOfLaw(atRest(working));
        return working;
    };
    it("opens every economy at its own rest, so thirteen idle weeks with the cycle held move none beyond its own noise", () => {
        const after = restingLaw(FOUNDED, 13);
        // A country the transition found at war is being pressed by that war, so
        // it is not resting and its drift is not noise. The claim is about the
        // rest of the world, and the pressed set has to be exactly the belligerents
        // — otherwise this bound is being escaped by something unnamed.
        const pressed = Object.keys(after.nations).filter((id) => atWarAsParty(after, id));
        expect(pressed.length).toBeGreaterThan(0);
        for (const [id, runtime] of Object.entries(after.nations)) {
            if (pressed.includes(id))
                continue;
            for (const rate of RATES) {
                const moved = Math.abs(runtime.stats.economy[rate] - runtime.base.stats.economy[rate]);
                expect(moved, `${id} ${rate}`).toBeLessThan(SPREAD[rate]);
            }
        }
    });
    it("draws the world desynchronized in its first week, each economy part way through its own cycle", () => {
        expect(Object.values(FOUNDED.cycles).every((cycle) => cycle.amplitude === 0)).toBe(true);
        const drawn = runPhase(FOUNDED).cycles;
        expect(new Set(Object.values(drawn).map((cycle) => cycle.phase)).size).toBe(4);
        expect(Object.values(drawn).every((cycle) => cycle.amplitude > 0)).toBe(true);
        expect(drawn[USA].phase).toBe("expansion");
        expect(drawn[USA].enteredTurn).toBeLessThanOrEqual(FOUNDED.turn);
        // Drawn once: the second week leaves every cycle that did not turn as it was.
        const second = runPhase({ ...runPhase(FOUNDED), turn: FOUNDED.turn + 1 }).cycles;
        const unturned = Object.keys(drawn).filter((id) => second[id].phase === drawn[id].phase);
        for (const id of unturned)
            expect(second[id]).toEqual(drawn[id]);
    });
    it("keeps the United States where it was found through a season of the whole turn", () => {
        const phases = campaignTurnPhases(CHARTER);
        let state = FOUNDED;
        for (let week = 0; week < 13; week += 1)
            state = advanceTurn(state, phases);
        const us = state.nations[USA];
        for (const rate of RATES) {
            expect(Math.abs(us.stats.economy[rate] - us.base.stats.economy[rate]), rate).toBeLessThan(SPREAD[rate]);
        }
    });
    it("keeps the economies the formula used to erase for a whole year", () => {
        const after = restingLaw(FOUNDED, 52);
        expect(after.nations["ARG"].stats.economy.inflation).toBeGreaterThan(1.5);
        expect(after.nations["TUR"].stats.economy.inflation).toBeGreaterThan(0.45);
        expect(after.nations["ZAF"].stats.economy.unemployment).toBeGreaterThan(0.28);
        expect(after.nations["CHN"].stats.economy.inflation).toBeLessThan(0.03);
    });
    it("never lets a settled economy stop moving, and no two seeds settle alike", () => {
        let state = lawAlone(FOUNDED, 26);
        const growth = [];
        for (let week = 0; week < 20; week += 1) {
            state = lawAlone(state, 1);
            growth.push(state.nations[USA].stats.economy.growth);
        }
        expect(new Set(growth).size).toBeGreaterThan(15);
        const other = lawAlone({ ...FOUNDED, seed: makeCampaignSeed("macro-anchors-other") }, 46);
        expect(other.nations[USA].stats.economy.growth).not.toBe(state.nations[USA].stats.economy.growth);
    });
    it("reads Argentina's price hardship against its own inflation, not against the raw index", () => {
        const after = restingLaw(FOUNDED, 52);
        const argentina = after.nations["ARG"];
        expect(argentina.stats.economy.costOfLiving).toBeGreaterThan(2);
        expect(crimeBaseline(argentina, normalPriceLevel(argentina, 52))).toBeLessThan(crimeBaseline(argentina) - 0.1);
    });
});
