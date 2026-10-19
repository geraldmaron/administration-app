import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { IMPACTS } from "./condition-impacts.js";
import { apply } from "./effects.js";
import { advanceCalendar } from "./calendar.js";
import { DAYS_PER_TURN } from "./turn-clock.js";
import { fiscalPhase } from "./fiscal.js";
import { MACRO_BOUNDS, MACRO_SHOCK, NO_CYCLE, REVERSION_RATE, macroDriftPhase, macroEffectsFor } from "./macro.js";
import { driversTarget, selectMacroDrivers } from "./macro-drivers.js";
import { createRngStreams } from "./rng.js";
const USA = "USA";
const { campaign: FOUNDED } = foundedForBalance("macro-drivers");
const RATES = ["growth", "inflation", "unemployment"];
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000 + 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const weekOfLaw = (campaign) => {
    const moved = macroDriftPhase(campaign).reduce((acc, packet) => apply(acc, packet), campaign);
    const grown = fiscalPhase(moved).reduce((acc, packet) => apply(acc, packet), moved);
    return { ...grown, turn: grown.turn + 1, calendar: advanceCalendar(grown.calendar, DAYS_PER_TURN) };
};
/** Where the law puts each rate this week if its target is exactly the drivers' sum: the same step, the same draws. */
function expectedRates(campaign, nation) {
    const drivers = selectMacroDrivers(campaign, nation);
    const stream = createRngStreams(campaign.seed).stream("macro", nation, campaign.turn);
    const economy = campaign.nations[nation].stats.economy;
    const out = {};
    for (const rate of RATES) {
        const shock = (stream.next() - 0.5) * 2 * MACRO_SHOCK[rate];
        const step = (driversTarget(drivers[rate]) - economy[rate]) * REVERSION_RATE + shock;
        out[rate] = round6(clamp(economy[rate] + step, MACRO_BOUNDS[rate].min, MACRO_BOUNDS[rate].max));
    }
    return out;
}
function lawRates(campaign, nation) {
    const stat = macroEffectsFor(campaign, nation).find((effect) => effect.kind === "nationStat");
    const economy = stat && stat.kind === "nationStat" ? stat.setStats?.economy : undefined;
    const current = campaign.nations[nation].stats.economy;
    return {
        growth: economy?.growth ?? current.growth,
        inflation: economy?.inflation ?? current.inflation,
        unemployment: economy?.unemployment ?? current.unemployment,
    };
}
describe("selectMacroDrivers — the one target", () => {
    it("sums, rate by rate, to the target the law reverts toward that week, for every nation on a lived-in board", () => {
        let campaign = FOUNDED;
        for (let week = 0; week < 30; week++)
            campaign = weekOfLaw(campaign);
        const shortage = {
            id: "condition:energy-shortage:USA:1",
            nation: USA,
            kind: "energy-shortage",
            scope: "nation",
            severity: 0.6,
            startedTurn: 1,
            status: "active",
            beats: [],
        };
        campaign = { ...campaign, conditions: { ...campaign.conditions, [shortage.id]: shortage } };
        for (const nation of Object.keys(campaign.nations)) {
            expect(lawRates(campaign, nation), nation).toEqual(expectedRates(campaign, nation));
        }
    });
    it("names the cause: a live condition is a conditions driver, the cycle a cycle driver, a gap a gap driver", () => {
        const shortage = {
            id: "condition:energy-shortage:USA:1",
            nation: USA,
            kind: "energy-shortage",
            scope: "nation",
            severity: 1,
            startedTurn: 1,
            status: "active",
            beats: [],
        };
        const campaign = {
            ...FOUNDED,
            conditions: { [shortage.id]: shortage },
            cycles: { ...FOUNDED.cycles, [USA]: { phase: "contraction", enteredTurn: 0, amplitude: 0.02 } },
            macro: { ...FOUNDED.macro, [USA]: { ...FOUNDED.macro[USA], potential: FOUNDED.macro[USA].potential * 1.02 } },
        };
        const drivers = selectMacroDrivers(campaign, USA);
        const amount = (rate, source) => drivers[rate].find((driver) => driver.source === source)?.amount ?? 0;
        expect(amount("growth", "conditions")).toBeLessThan(0);
        expect(amount("growth", "cycle")).toBeCloseTo(-0.1, 9);
        expect(amount("growth", "gap")).toBeGreaterThan(0);
        expect(amount("unemployment", "gap")).toBeGreaterThan(0);
        expect(amount("inflation", "gap")).toBeLessThan(0);
        expect(amount("inflation", "conditions")).toBeGreaterThan(0);
    });
});
describe("rate-kind conditions are labels", () => {
    it("carry no macro pressure on any rate", () => {
        for (const kind of ["recession", "inflation-shock", "unemployment-shock"]) {
            expect(IMPACTS[kind].macroPressure, kind).toEqual({ growth: 0, inflation: 0, unemployment: 0 });
        }
    });
    it("leave the conditions that are causes their pressure", () => {
        for (const kind of ["fiscal-crisis", "energy-shortage", "housing-crunch"]) {
            expect(IMPACTS[kind].macroPressure.growth, kind).toBeGreaterThan(0);
        }
    });
});
describe("crime at rest", () => {
    it("stays within a hundredth of every nation's authored figure for 208 weeks with nothing happening", () => {
        const rest = Object.fromEntries(Object.keys(FOUNDED.cycles).map((id) => [id, NO_CYCLE]));
        // An opening war is something happening. This check is the quiet board.
        let campaign = { ...FOUNDED, conflicts: {} };
        let worst = 0;
        for (let week = 0; week < 208; week++) {
            campaign = weekOfLaw({ ...campaign, cycles: rest });
            for (const runtime of Object.values(campaign.nations)) {
                worst = Math.max(worst, Math.abs(runtime.stats.security.crimeIndex - runtime.base.stats.security.crimeIndex));
            }
        }
        expect(worst).toBeLessThan(0.01);
    }, 60_000);
});
