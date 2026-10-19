import { addDays } from "./clock.js";
import { apply } from "./effects.js";
import { temporaryImportSuspension, expireTradeMeasures } from "./trade-effects.js";
import { describe, expect, it } from "vitest";
import { US_GOODS_TRADE } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { bilateralGoods, volumeFall } from "./trade-volume.js";
import { suppliersOf, tradeEdge, tradeEdgesWith } from "./trade.js";
import { tradeSector, TRADE_SECTOR_IDS } from "./trade-sectors.js";
const { campaign } = foundedForBalance("trade-volume");
const total = (record) => Object.values(record).reduce((sum, value) => sum + value, 0);
const id = (value) => value;
function growth(state, partner) {
    const them = state.nations[id(partner)];
    const us = state.nations[state.founding.nation];
    return (them.stats.economy.gdp / them.base.stats.economy.gdp) * (us.stats.economy.gdp / us.base.stats.economy.gdp);
}
function withMeasure(state, measure) {
    const full = { ...measure, imposedTurn: state.turn, imposedDate: state.calendar, authority: "INST-USTR" };
    return { ...state, trade: { ...state.trade, measures: { ...state.trade.measures, [full.id]: full } } };
}
function withGdp(state, partner, factor) {
    const runtime = state.nations[id(partner)];
    const economy = { ...runtime.stats.economy, gdp: runtime.stats.economy.gdp * factor };
    return { ...state, nations: { ...state.nations, [partner]: { ...runtime, stats: { ...runtime.stats, economy } } } };
}
describe("a campaign opens on the trade the Census recorded", () => {
    it("opens each partner's goods book at the recorded figure, carried by the two economies", () => {
        for (const partner of ["CAN", "CHN", "MEX", "KEN", "FIN"]) {
            const goods = bilateralGoods(campaign, id(partner));
            const recorded = US_GOODS_TRADE[partner];
            expect(Math.abs(goods.imports - total(recorded.imports) * growth(campaign, partner))).toBeLessThan(1);
            expect(Math.abs(goods.exports - total(recorded.exports) * growth(campaign, partner))).toBeLessThan(1);
        }
    });
    // The old shape read Canada at $20 billion and Finland at nothing at all.
    it("reads the neighbors as the largest partners and a small economy as small, not as nothing", () => {
        const canada = bilateralGoods(campaign, id("CAN"));
        const finland = bilateralGoods(campaign, id("FIN"));
        expect(canada.imports + canada.exports).toBeGreaterThan(500_000);
        expect(finland.imports + finland.exports).toBeGreaterThan(5_000);
        expect(tradeEdgesWith(campaign, id("FIN")).length).toBeGreaterThan(5);
    });
    it("names the suppliers a president would, with each one's share of what the country buys", () => {
        const suppliers = suppliersOf(campaign, "consumer-electronics").filter((edge) => edge.dependence >= 0.05);
        const partners = suppliers.map((edge) => edge.partner);
        for (const expected of ["TWN", "MEX", "CHN", "VNM"])
            expect(partners).toContain(expected);
        const shares = suppliersOf(campaign, "consumer-electronics").reduce((sum, edge) => sum + edge.dependence, 0);
        expect(shares).toBeGreaterThan(0.97);
        expect(shares).toBeLessThan(1.03);
    });
});
describe("the book moves after the opening", () => {
    it("grows with the partner's economy", () => {
        const before = bilateralGoods(campaign, id("CAN")).imports;
        const after = bilateralGoods(withGdp(campaign, "CAN", 1.1), id("CAN")).imports;
        expect(after / before).toBeCloseTo(1.1, 2);
    });
    it("loses to a tariff the share of its own sector's volume the rate destroys, and nothing else", () => {
        const sector = "consumer-electronics";
        const tariffed = withMeasure(campaign, { id: "tariff:test", kind: "tariff", sector, target: id("CHN"), rate: 0.25, origin: "us" });
        const before = tradeEdge(campaign, id("CHN"), sector).imports;
        const after = tradeEdge(tariffed, id("CHN"), sector).imports;
        expect(after / before).toBeCloseTo(1 - volumeFall(tradeSector(sector), 0.25), 2);
        expect(tradeEdge(tariffed, id("CHN"), "machine-tools")).toEqual(tradeEdge(campaign, id("CHN"), "machine-tools"));
    });
    it("loses what we sell them to their answer", () => {
        const sector = "agriculture-row-crops";
        const answered = withMeasure(campaign, { id: "retaliation:test", kind: "tariff", sector, target: id("CHN"), rate: 0.25, origin: "retaliation" });
        const before = tradeEdge(campaign, id("CHN"), sector);
        const after = tradeEdge(answered, id("CHN"), sector);
        expect(after.exports / before.exports).toBeCloseTo(1 - volumeFall(tradeSector(sector), 0.25), 2);
        expect(after.imports).toBe(before.imports);
    });
    it("ends for an embargo, the goods no sector covers included", () => {
        const embargoed = withMeasure(campaign, {
            id: "embargo:test",
            kind: "embargo",
            sector: TRADE_SECTOR_IDS[0],
            target: id("CUB"),
            rate: 0,
            origin: "us",
        });
        expect(bilateralGoods(campaign, id("CUB")).exports).toBeGreaterThan(0);
        expect(bilateralGoods(embargoed, id("CUB"))).toEqual({ imports: 0, exports: 0 });
    });
});
it("a timed import suspension closes imports, leaves exports, and expires once", () => {
    const before = bilateralGoods(campaign, id("MEX"));
    const signed = apply(campaign, { source: "action", actor: "player", turn: campaign.turn, narration: { summary: "Suspend incoming cargo" }, effects: temporaryImportSuspension(campaign, id("MEX"), 60) });
    expect(bilateralGoods(signed, id("MEX"))).toEqual({ imports: 0, exports: before.exports });
    expect(bilateralGoods(expireTradeMeasures({ ...signed, calendar: addDays(signed.calendar, 59) }), id("MEX")).imports).toBe(0);
    const expired = expireTradeMeasures({ ...signed, calendar: addDays(signed.calendar, 60) });
    expect(bilateralGoods(expired, id("MEX"))).toEqual(before);
    expect(expireTradeMeasures(expired)).toBe(expired);
});
