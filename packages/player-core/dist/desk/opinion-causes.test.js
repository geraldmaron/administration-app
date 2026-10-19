import { describe, expect, it } from "vitest";
import { OPINION_DRIVERS, advanceTurn, apply, campaignTurnPhases, selectOpinionCauses, } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { OPINION_DRIVER_LABELS } from "../format/figures";
import { approvalDrag, approvalDrivers } from "./opinion-causes";
const base = openingCampaign();
const US = base.founding.nation;
/** A price shock, arriving the way the engine lets one arrive: a condition opens and prices jump with it. */
function shocked(points, from = base) {
    const inflation = from.nations[US].stats.economy.inflation + points;
    return apply(from, {
        source: "simulate",
        actor: "world",
        turn: from.turn,
        narration: { summary: "Prices jump." },
        effects: [
            {
                kind: "condition",
                set: {
                    id: `condition:inflation-shock:${US}:${from.turn}`,
                    nation: US,
                    kind: "inflation-shock",
                    scope: "nation",
                    severity: 0.6,
                    startedTurn: from.turn,
                    status: "active",
                    beats: [{ turn: from.turn, description: "Prices jump." }],
                },
            },
            { kind: "nationStat", nation: US, setStats: { economy: { inflation } } },
        ],
    });
}
describe("the six judgments behind approval", () => {
    it("draws all six, in the engine's order, each with its level, heading and share", () => {
        const bars = approvalDrivers(base);
        expect(bars.map((bar) => bar.driver)).toEqual([...OPINION_DRIVERS]);
        expect(bars.reduce((sum, bar) => sum + bar.weight, 0)).toBeCloseTo(1, 6);
        for (const bar of bars) {
            expect(bar.value).toBe(base.player.opinion[bar.driver]);
            expect(bar.word.length, bar.driver).toBeGreaterThan(0);
            expect(bar.leadingCause, bar.driver).not.toBe("Where it sits when nothing is happening");
        }
    });
    it("names prices on prosperity and says why the week made it louder when prices bite", () => {
        const calm = approvalDrivers(base).find((bar) => bar.driver === "prosperity");
        const prosperity = approvalDrivers(shocked(0.04)).find((bar) => bar.driver === "prosperity");
        expect(prosperity.leadingCause).toBe("Prices");
        expect(prosperity.leadingDetail).toMatch(/Prices are rising/);
        expect(prosperity.louder).toContain("prices or joblessness are biting");
        expect(prosperity.target).toBeLessThan(calm.target - 0.05);
        // A price shock is judged on prosperity; it is not a disaster the state answers with relief.
        expect(approvalDrivers(shocked(0.04)).find((bar) => bar.driver === "services").louder).toEqual([]);
    });
});
/**
 * The same week with the pump held where it stands. Whether gasoline climbed in
 * the window is the world's weather on this save, and a climb is named before
 * the economy's pain, so the price shock under test is read with it held still.
 */
function withSteadyPump(campaign) {
    const markets = campaign.markets;
    const crude = markets?.commodities.crude;
    if (!markets || !crude)
        return campaign;
    const series = crude.series ?? [];
    const level = series.at(-1) ?? crude.index;
    const steady = { ...crude, series: series.map(() => level) };
    return { ...campaign, markets: { ...markets, commodities: { ...markets.commodities, crude: steady } } };
}
function weeksOn(campaign, weeks) {
    const phases = campaignTurnPhases(charterOf(campaign));
    let working = campaign;
    for (let week = 0; week < weeks; week += 1)
        working = advanceTurn(working, phases);
    return working;
}
/** The window `approvalDrag` looks back over, and the window these tests measure in. */
const RECENT_WEEKS = 4;
/** The Desk's own floor: a tenth of a point over the window is not a fall anyone would notice. */
const MATERIAL_FALL = 0.001;
/**
 * A fall in one judgment, over the same four closed weeks `approvalDrag` reads.
 *
 * Summed unweighted, because what is being asked here is whether the shock moved
 * a judgment at all — not which judgment the week happens to price highest.
 */
function fellOver(campaign) {
    const since = campaign.turn - RECENT_WEEKS;
    const fell = Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, 0]));
    for (const entry of campaign.ledger) {
        if (entry.turn <= since || !entry.mood)
            continue;
        for (const driver of OPINION_DRIVERS)
            fell[driver] += entry.mood[driver] ?? 0;
    }
    return fell;
}
describe("the Desk's approval tile under a mid-term price shock", () => {
    // A year and a half in, once the opening moods have settled toward what the
    // country can see, so the settling itself is not what is being measured.
    //
    // What this block used to assert, and no longer can: that a price shock is the
    // single heaviest cause behind approval's worst recent fall. That is a claim
    // about everything the country is carrying rather than about the price path,
    // and the board it was written on was one where nothing else was happening.
    // The United States now opens four to eight significant conditions a year, so
    // on this very save the country is living through two floods and a wildfire at
    // week 82 — `services` falls 0.050 over the window against prosperity's 0.011,
    // and it falls by exactly as much with the shock as without it. Ranking the six
    // judgments therefore measures the weather.
    //
    // So the promise these tests hold the tile to is the one a player can actually
    // be made: a price shock is legible AS a price shock. It turns the prosperity
    // judgment from rising to falling, it names prices on that judgment's own bar,
    // and it moves nothing else. Which of the six then leads the one-line drag is a
    // fact about the week, and the last test says so rather than pinning it.
    const midterm = weeksOn(base, 78);
    const shockRun = weeksOn(shocked(0.045, midterm), RECENT_WEEKS);
    const calmRun = weeksOn(midterm, RECENT_WEEKS);
    it("turns the prosperity judgment from flat to falling", () => {
        // Measured: -0.0010 calm (the week's own drift, under the Desk's material
        // fall), -0.0129 shocked.
        expect(fellOver(calmRun).prosperity).toBeGreaterThan(-MATERIAL_FALL);
        expect(fellOver(shockRun).prosperity).toBeLessThan(-0.005);
    });
    it("moves prosperity and nothing else, so what it is is legible in the fall itself", () => {
        const withShock = fellOver(shockRun);
        const withoutShock = fellOver(calmRun);
        // Every other judgment lands within a rounding of where it lands anyway;
        // measured, prosperity's gap is about twenty times the next largest.
        for (const driver of OPINION_DRIVERS) {
            const gap = withShock[driver] - withoutShock[driver];
            if (driver === "prosperity")
                expect(gap).toBeLessThan(-0.005);
            else
                expect(Math.abs(gap), driver).toBeLessThan(0.005);
        }
    });
    it("names prices on the prosperity bar, and says the week made them louder", () => {
        const shockedBar = approvalDrivers(withSteadyPump(shockRun)).find((bar) => bar.driver === "prosperity");
        const calmBar = approvalDrivers(withSteadyPump(calmRun)).find((bar) => bar.driver === "prosperity");
        expect(shockedBar.leadingCause).toBe("Prices");
        expect(shockedBar.louder).toContain("prices or joblessness are biting");
        expect(shockedBar.target).toBeLessThan(calmBar.target - 0.05);
        // Not a sentence the tile prints whatever is going on: on the same save with
        // no shock, prosperity is named on joblessness and prices are not said to
        // bite. The pump may still be climbing on that board, and the bar says so.
        expect(calmBar.leadingCause).not.toBe("Prices");
        expect(calmBar.louder).not.toContain("prices or joblessness are biting");
    });
    it("blames the term that moved, prices, and not joblessness that held where it was", () => {
        // The week's other falls are taken off the record so prosperity is the
        // judgment the tile reads, and joblessness is held at 7% in every kept week
        // and today, heavier than prices but not moving. What is under test is
        // which of prosperity's terms the tile names.
        const nation = shockRun.founding.nation;
        const runtime = shockRun.nations[nation];
        const steadyJobless = {
            ...shockRun,
            ledger: shockRun.ledger.map((entry) => (entry.mood ? { ...entry, mood: { prosperity: entry.mood.prosperity ?? 0 } } : entry)),
            economyHistory: (shockRun.economyHistory ?? []).map((sample) => ({ ...sample, unemployment: 0.07 })),
            nations: { ...shockRun.nations, [nation]: { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, unemployment: 0.07 } } } },
        };
        const causes = selectOpinionCauses(steadyJobless).find((reading) => reading.driver === "prosperity").causes;
        const weight = (key) => Math.abs(causes.find((cause) => cause.key === key).contribution);
        expect(weight("unemployment")).toBeGreaterThan(weight("inflation"));
        expect(approvalDrag(steadyJobless)).toEqual({ cause: "Prices", driver: OPINION_DRIVER_LABELS.prosperity });
    });
    it("still names something as the one thing pulling approval down", () => {
        // Which judgment that is depends on what else the country is carrying, and
        // pinning it here would be pinning the weather. What the tile owes the player
        // is a line, and a line about a judgment that really fell.
        const drag = approvalDrag(shockRun);
        expect(drag.cause.length).toBeGreaterThan(0);
        const named = OPINION_DRIVERS.find((driver) => OPINION_DRIVER_LABELS[driver] === drag.driver);
        expect(fellOver(shockRun)[named]).toBeLessThan(0);
    });
});
describe("the Desk's approval tile", () => {
    it("names nothing on the morning of the oath, when no judgment has fallen yet", () => {
        expect(approvalDrag(base)).toBeUndefined();
    });
});
