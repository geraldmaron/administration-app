import { withStandingFinding } from "./finding-testing.js";
import { describe, expect, it } from "vitest";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { landRung } from "./__fixtures__/ladder.js";
import { apply } from "./effects.js";
import { EXTERNAL_SHOCK_RING, EXTERNAL_SHOCK_WEEKS, shockEffect, shockPressure, withShock } from "./external-shocks.js";
import { externalMacroPressure } from "./external-pressure.js";
import { createRngStreams } from "./rng.js";
import { createSave, loadSave } from "./save.js";
const shock = (nation, fromTurn, growth = 0.01) => ({
    nation: nation,
    kind: "grant",
    growth,
    unemployment: 0,
    fromTurn,
    weeks: EXTERNAL_SHOCK_WEEKS,
});
describe("the dated shocks a campaign keeps", () => {
    it("merges shocks of one kind on one country in one week into one entry", () => {
        const ring = withShock(withShock([], shock("ALP", 5), 5), shock("ALP", 5, 0.02), 5);
        expect(ring).toHaveLength(1);
        expect(ring[0].growth).toBeCloseTo(0.03, 10);
    });
    it("drops a shock once its span has run, and the oldest past the bound", () => {
        expect(withShock([shock("ALP", 0)], shock("BET", EXTERNAL_SHOCK_WEEKS), EXTERNAL_SHOCK_WEEKS)).toEqual([shock("BET", EXTERNAL_SHOCK_WEEKS)]);
        const full = Array.from({ length: EXTERNAL_SHOCK_RING }, (_, i) => shock(`N${i}`, 10));
        const next = withShock(full, shock("NEW", 10), 10);
        expect(next).toHaveLength(EXTERNAL_SHOCK_RING);
        expect(next.at(-1).nation).toBe("NEW");
        expect(next[0].nation).toBe("N1");
    });
    it("shifts a country's growth target while it stands and not after", () => {
        const base = buildCampaign();
        const landed = apply(base, { source: "action", actor: "player", turn: base.turn, narration: { summary: "A grant." }, effects: [shockEffect(base, nationB.id, "grant", { growth: 0.01 })] });
        const without = externalMacroPressure(base, nationB.id).growth;
        expect(externalMacroPressure(landed, nationB.id).growth - without).toBeCloseTo(0.01, 6);
        const over = { ...landed, turn: landed.turn + EXTERNAL_SHOCK_WEEKS };
        expect(shockPressure(over, nationB.id).growth).toBe(0);
    });
    it("survives a save, and a campaign that has none loads with none", () => {
        const base = buildCampaign();
        const landed = apply(base, { source: "action", actor: "player", turn: base.turn, narration: { summary: "A grant." }, effects: [shockEffect(base, nationB.id, "grant", { growth: 0.01 })] });
        expect(loadSave(JSON.parse(JSON.stringify(createSave(landed)))).externalShocks).toEqual(landed.externalShocks);
        expect(loadSave(JSON.parse(JSON.stringify(createSave(base)))).externalShocks).toBeUndefined();
    });
});
describe("the writers that date their shocks", () => {
    const streams = createRngStreams(buildCampaign().seed);
    const rich = (campaign) => {
        const home = campaign.nations[nationA.id];
        const economy = { ...home.stats.economy, reserves: 50_000, gdp: 1_000_000 };
        const security = { ...home.stats.security, intelCapability: 0.9 };
        return { ...campaign, nations: { ...campaign.nations, [nationA.id]: { ...home, stats: { ...home.stats, economy, security } } } };
    };
    for (const [instrument, rung, kind, sign] of [["assistance", 2, "grant", 1], ["covert", 3, "sabotage", -1]]) {
        it(`records a ${kind} as a dated shift in the target's growth, not a level on its rate`, () => {
            const campaign = withStandingFinding(rich(buildCampaign()), nationB.id);
            const result = landRung(campaign, nationA.id, nationB.id, instrument, rung, streams);
            if (!result.ok)
                throw new Error(result.reason);
            const after = apply(campaign, result.packet);
            expect(after.nations[nationB.id].stats.economy.growth).toBe(campaign.nations[nationB.id].stats.economy.growth);
            expect(Math.sign(shockPressure(after, nationB.id).growth)).toBe(sign);
            expect(after.externalShocks?.some((entry) => entry.kind === kind && entry.nation === nationB.id && entry.fromTurn === campaign.turn)).toBe(true);
        });
    }
});
