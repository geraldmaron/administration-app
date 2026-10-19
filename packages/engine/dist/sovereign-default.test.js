/**
 * A default abroad: nobody opens under stress, a government whose real
 * interest bill climbs past its line is weighed and can default, the default
 * carries its weighed terms, and the United States is never weighed.
 */
import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { DEFAULT_HAIRCUT, DEFAULT_RERATE_WEEKS, RERATED_AFTER_DEFAULT, debtStress, defaultPhase, weighDefault } from "./sovereign-default.js";
const ARG = "ARG";
const { campaign: FOUNDED } = foundedForBalance("sovereign-default", "democrat", {}, { carriedWorld: false });
/** A government carrying three times its debt and a collapsing regime: the bill is well past its line. */
function stressed(campaign, nation) {
    const runtime = campaign.nations[nation];
    const economy = { ...runtime.stats.economy, debt: runtime.stats.economy.debt * 3, inflation: 0 };
    const politics = { ...runtime.stats.politics, regimeStability: 0.1, legitimacy: 0.1 };
    const macro = { ...campaign.macro, [nation]: { ...(campaign.macro?.[nation] ?? { potential: runtime.stats.economy.gdp, policyRate: 0.1 }), expectedInflation: 0 } };
    return { ...campaign, macro, nations: { ...campaign.nations, [nation]: { ...runtime, stats: { ...runtime.stats, economy, politics } } } };
}
describe("a default abroad", () => {
    it("opens with no government under stress, so the founding week weighs nobody", () => {
        for (const runtime of Object.values(FOUNDED.nations)) {
            expect(debtStress(FOUNDED, runtime)).toBeLessThanOrEqual(0);
            expect(weighDefault(FOUNDED, runtime)).toBeUndefined();
        }
        expect(defaultPhase(FOUNDED)).toEqual([]);
    });
    it("weighs a government past its line on the debt-burden, destabilized and regime-survival terms", () => {
        const campaign = stressed(FOUNDED, ARG);
        const weighed = weighDefault(campaign, campaign.nations[ARG]);
        expect(weighed?.question).toBe("default-hazard");
        expect(weighed?.terms.map((term) => term.key)).toEqual(["debt-burden", "destabilized", "regime-survival"]);
    });
    it("stamps the weighing on the default, writes the haircut and the letter, and records it", () => {
        const campaign = stressed(FOUNDED, ARG);
        const packet = defaultPhase(campaign).find((entry) => entry.provenance?.entities?.includes(ARG));
        expect(packet).toBeDefined();
        expect(packet.provenance?.decision?.question).toBe("default-hazard");
        expect(packet.provenance?.decision?.acts).toBe(true);
        expect(packet.provenance?.decision?.actor).toBe(ARG);
        const stat = packet.effects.find((effect) => effect.kind === "nationStat");
        expect(stat).toMatchObject({ setStats: { economy: { sovereignRating: "D", debt: Math.round(campaign.nations[ARG].stats.economy.debt * (1 - DEFAULT_HAIRCUT)) } } });
        expect(packet.effects.some((effect) => effect.kind === "externalShock")).toBe(true);
        const markets = packet.effects.find((effect) => effect.kind === "markets");
        expect(markets && markets.kind === "markets" ? markets.set.defaults?.at(-1)?.nation : undefined).toBe(ARG);
    });
    it("reads inflation eroding a government's debt as relief, not stress", () => {
        // Argentina opens at 200% inflation on a nominal rate near 2%: its real rate is far below
        // zero, so a week of prices taking a slice off its ratio must not read as a heavier bill.
        const runtime = FOUNDED.nations[ARG];
        expect(runtime.stats.economy.inflation).toBeGreaterThan(1);
        const economy = { ...runtime.stats.economy, debt: runtime.stats.economy.debt * 0.9 };
        const eroded = { ...FOUNDED, nations: { ...FOUNDED.nations, [ARG]: { ...runtime, stats: { ...runtime.stats, economy } } } };
        expect(debtStress(eroded, eroded.nations[ARG])).toBeLessThanOrEqual(0);
        expect(weighDefault(eroded, eroded.nations[ARG])).toBeUndefined();
    });
    it("never weighs the United States", () => {
        const us = FOUNDED.founding.nation;
        const campaign = stressed(FOUNDED, us);
        expect(weighDefault(campaign, campaign.nations[us])).toBeUndefined();
    });
    it("re-rates a restructured government out of default a year on, and leaves one the dataset opened in default alone", () => {
        const runtime = FOUNDED.nations[ARG];
        const inDefault = { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, sovereignRating: "D" } } };
        const base = { ...FOUNDED, nations: { ...FOUNDED.nations, [ARG]: inDefault } };
        const rerate = (campaign) => defaultPhase(campaign).find((packet) => packet.narration.summary.includes("re-rated"));
        expect(rerate(base)).toBeUndefined();
        const markets = { ...(FOUNDED.markets ?? {}), defaults: [{ nation: ARG, turn: FOUNDED.turn, haircut: DEFAULT_HAIRCUT }] };
        const recorded = { ...base, markets };
        expect(rerate({ ...recorded, turn: FOUNDED.turn + DEFAULT_RERATE_WEEKS - 1 })).toBeUndefined();
        const packet = rerate({ ...recorded, turn: FOUNDED.turn + DEFAULT_RERATE_WEEKS });
        expect(packet?.effects[0]).toMatchObject({ kind: "nationStat", setStats: { economy: { sovereignRating: RERATED_AFTER_DEFAULT } } });
    });
});
