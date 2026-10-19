/**
 * The other three chains: a harvest failure moves the crop it strikes and not
 * the rest; a gas shock reaches fertilizer only after its lag; a supplier's
 * export restriction moves the mineral it controls. Each is a mechanism, never
 * a written price.
 */
import { describe, expect, it } from "vitest";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { commodityPhase } from "./commodity-phase.js";
import { referenceIndex } from "./commodity-registry.js";
import { apply } from "./effects.js";
import { selectGroceryBill } from "./household-prices.js";
const RUS = "RUS";
const { campaign: BARE } = foundedForBalance("commodity-chains", "democrat", {}, { carriedWorld: false });
function marketWeeks(campaign, weeks) {
    let working = campaign;
    for (let week = 0; week < weeks; week += 1) {
        for (const packet of commodityPhase(working))
            working = apply(working, packet);
        working = withWeeksElapsed(working, 1);
    }
    return working;
}
const index = (campaign, id) => campaign.markets?.commodities[id]?.index ?? referenceIndex(id);
describe("a harvest failure", () => {
    const drought = {
        id: `condition:drought:${RUS}:0`,
        nation: RUS,
        kind: "drought",
        scope: "nation",
        severity: 0.9,
        startedTurn: BARE.turn,
        status: "active",
        beats: [],
    };
    const dry = { ...BARE, conditions: { ...BARE.conditions, [drought.id]: drought } };
    it("lifts wheat, which Russia exports, and leaves copper and crude to their own weeks", () => {
        const later = marketWeeks(dry, 12);
        const calm = marketWeeks(BARE, 12);
        expect(index(later, "wheat")).toBeGreaterThan(index(calm, "wheat"));
        expect(index(later, "copper")).toBeCloseTo(index(calm, "copper"), 9);
        expect(index(later, "crude")).toBeCloseTo(index(calm, "crude"), 9);
    });
    it("reaches the grocery bill more slowly than the market it follows", () => {
        const four = marketWeeks(dry, 4);
        expect(selectGroceryBill(four)).toBeCloseTo(selectGroceryBill(marketWeeks(BARE, 4)), 9);
        const sixteen = marketWeeks(dry, 16);
        expect(selectGroceryBill(sixteen)).toBeGreaterThan(selectGroceryBill(marketWeeks(BARE, 16)));
    });
});
describe("gas into fertilizer", () => {
    it("moves nitrogen only once the gas price has had its lag", () => {
        const gasHigh = { index: 1.8, anchorUsd: 0, series: Array.from({ length: 12 }, () => 1.8), norm: 1, inventory: 1 };
        const seeded = { ...BARE, markets: { commodities: { "natural-gas": gasHigh }, equity: { level: 1, series: [] } } };
        const early = marketWeeks({ ...seeded, markets: { ...seeded.markets, commodities: { "natural-gas": { ...gasHigh, series: [1.8] } } } }, 1);
        const late = marketWeeks(seeded, 1);
        expect(index(early, "nitrogen")).toBeCloseTo(index(marketWeeks(BARE, 1), "nitrogen"), 9);
        expect(index(late, "nitrogen")).toBeGreaterThan(index(early, "nitrogen"));
    });
});
describe("a critical mineral export restriction", () => {
    it("lifts rare earths when their largest producer embargoes a buyer, and not wheat", () => {
        const restricted = { ...BARE, player: { ...BARE.player, flags: { ...BARE.player.flags, [`embargo:CHN:${BARE.founding.nation}`]: true } } };
        const later = marketWeeks(restricted, 12);
        const calm = marketWeeks(BARE, 12);
        expect(index(later, "rare-earths")).toBeGreaterThan(index(calm, "rare-earths"));
        expect(later.markets?.commodities["rare-earths"]?.cause).toContain("export restrictions");
    });
});
