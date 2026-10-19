import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { BACKSTOP_PREMIUM_RELIEF, BACKSTOP_WEEKS, backstopRelief, latestBackstop } from "./backstop.js";
import { apply } from "./effects.js";
import { fiscalPhase } from "./fiscal.js";
import { rungDefinition } from "./instruments.js";
import { createRngStreams } from "./rng.js";
import { fiscalCrises } from "./sovereign.js";
const USA = "USA";
const ARG = "ARG";
const { campaign: FOUNDED } = foundedForBalance("backstop");
function inCrisis(campaign, nation) {
    const crisis = {
        id: `condition:fiscal-crisis:${nation}:0`,
        nation,
        kind: "fiscal-crisis",
        scope: "nation",
        severity: 0.8,
        startedTurn: campaign.turn,
        status: "active",
        beats: [],
    };
    return { ...campaign, conditions: { ...campaign.conditions, [crisis.id]: crisis } };
}
function stabilize(campaign, actor, target) {
    const rung = rungDefinition("assistance", 3);
    const ctx = { campaign, actor, target, streams: createRngStreams(campaign.seed) };
    expect(rung.gate(ctx).ok).toBe(true);
    const packet = { source: "action", actor: "player", turn: campaign.turn, narration: { summary: "A stabilization package." }, effects: [...rung.resolve(ctx)] };
    return apply(campaign, packet);
}
function marketRate(campaign, nation) {
    const week = fiscalPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
    return week.books[nation].rates.market;
}
describe("a currency backstop", () => {
    const crisis = inCrisis(FOUNDED, ARG);
    const backed = stabilize(crisis, USA, ARG);
    it("is recorded by the stabilization package and read back by backstopRelief", () => {
        expect(backstopRelief(crisis, ARG)).toEqual({ premium: 0, stress: 0 });
        expect(latestBackstop(backed, ARG)).toBe(backed.turn);
        const relief = backstopRelief(backed, ARG);
        expect(relief.premium).toBe(BACKSTOP_PREMIUM_RELIEF);
        expect(relief.stress).toBeGreaterThan(0);
        expect(backstopRelief(backed, "MEX")).toEqual({ premium: 0, stress: 0 });
    });
    it("lowers the crisis premium the next fiscal week charges, through the one books writer", () => {
        const without = fiscalCrises(crisis).get(ARG).premium;
        const withIt = fiscalCrises(backed).get(ARG).premium;
        expect(without).toBeGreaterThan(0);
        expect(withIt).toBeCloseTo(Math.max(0, without - BACKSTOP_PREMIUM_RELIEF), 9);
        expect(marketRate(backed, ARG)).toBeLessThan(marketRate(crisis, ARG));
    });
    it("stands for a year and then lapses, and a second package renews rather than doubles it", () => {
        const aYearOn = { ...backed, turn: backed.turn + BACKSTOP_WEEKS };
        expect(backstopRelief({ ...backed, turn: backed.turn + BACKSTOP_WEEKS - 1 }, ARG).premium).toBe(BACKSTOP_PREMIUM_RELIEF);
        expect(backstopRelief(aYearOn, ARG)).toEqual({ premium: 0, stress: 0 });
        const renewed = stabilize(aYearOn, USA, ARG);
        expect(latestBackstop(renewed, ARG)).toBe(aYearOn.turn);
        expect(backstopRelief(renewed, ARG).premium).toBe(BACKSTOP_PREMIUM_RELIEF);
    });
    it("slows the fiscal stress an open crisis builds", () => {
        const week = (campaign) => fiscalPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
        const without = week(crisis).books[ARG].stress;
        const withIt = week(backed).books[ARG].stress;
        expect(without).toBeGreaterThan(0);
        expect(withIt).toBeLessThan(without);
    });
});
