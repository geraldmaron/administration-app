import { imposeTestTariff } from "./__fixtures__/tariff.js";
/**
 * A tariff moves the consumer price level once, over half a year, and then stops.
 */
import { describe, expect, it } from "vitest";
import { US_GOODS_TRADE } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { externalMacroPressure } from "./external-pressure.js";
import { liftMeasure } from "./trade.js";
import { householdShare, TRADE_SECTORS, tradeSector } from "./trade-sectors.js";
import { projectTariffPrices, tariffPriceStep, TARIFF_PHASE_WEEKS } from "./tariff-prices.js";
const USA = "USA";
const CHINA = "CHN";
const SECTOR = "consumer-electronics";
const { campaign: FOUNDED } = foundedForBalance("tariff-prices");
function signed(rate) {
    const imposed = imposeTestTariff(FOUNDED, CHINA, SECTOR, rate);
    if (!imposed.ok)
        throw new Error(imposed.reason);
    return apply(FOUNDED, imposed.packet);
}
describe("a tariff's price step", () => {
    it("previews exactly the step the room reads once the tariff is signed", () => {
        const preview = tariffPriceStep(CHINA, SECTOR, 0.25);
        const after = signed(0.25);
        const applied = projectTariffPrices(after);
        expect(applied.measures).toEqual([{ measure: Object.keys(after.trade.measures).find((id) => !(id in FOUNDED.trade.measures)), step: preview, weeksIn: 0 }]);
        expect(applied.step).toBe(preview);
        expect(projectTariffPrices(after)).toEqual(applied);
    });
    it("weights the shelf rise by the partner's share of the sector's imports and the sector's household share", () => {
        const def = tradeSector(SECTOR);
        const everyone = Object.values(US_GOODS_TRADE).reduce((sum, partner) => sum + (partner.imports[SECTOR] ?? 0), 0);
        const share = US_GOODS_TRADE.CHN.imports[SECTOR] / everyone;
        const shelf = Math.round(0.25 * def.borderPassThrough * def.shelfPassThrough * 1000) / 1000;
        expect(tariffPriceStep(CHINA, SECTOR, 0.25)).toBeCloseTo(shelf * share * householdShare(SECTOR), 6);
        expect(tariffPriceStep(CHINA, "steel", 0.25)).toBe(0);
    });
    it("is bounded: a total ban moves the price level by less than the sector's own weight in the basket, and never two points", () => {
        for (const def of TRADE_SECTORS.filter((sector) => sector.instrument === "tariff")) {
            for (const partner of Object.keys(US_GOODS_TRADE)) {
                const step = tariffPriceStep(partner, def.id, 1);
                expect(step, `${def.id} from ${partner}`).toBeLessThanOrEqual(householdShare(def.id));
                expect(step, `${def.id} from ${partner}`).toBeLessThan(0.02);
            }
        }
    });
    it("adds up over the phase-in to the step, then stops while the tariff still stands, and never writes the level", () => {
        const after = signed(0.25);
        const step = projectTariffPrices(after).step;
        expect(step).toBeGreaterThan(0);
        const weekly = Array.from({ length: TARIFF_PHASE_WEEKS + 4 }, (_, week) => projectTariffPrices({ ...after, turn: after.turn + week }).thisWeek);
        const onTheLevel = weekly.reduce((sum, annual) => sum + annual / 52, 0);
        expect(onTheLevel).toBeCloseTo(step, 5);
        expect(weekly.slice(TARIFF_PHASE_WEEKS)).toEqual([0, 0, 0, 0]);
        const before = externalMacroPressure(FOUNDED, USA).inflation;
        expect(externalMacroPressure(after, USA).inflation - before).toBeCloseTo(weekly[0], 6);
        const done = { ...after, turn: after.turn + TARIFF_PHASE_WEEKS };
        expect(externalMacroPressure(done, USA).inflation).toBeCloseTo(before, 6);
        expect(after.nations[USA].stats.economy.inflation).toBe(FOUNDED.nations[USA].stats.economy.inflation);
        expect(after.nations[USA].stats.economy.costOfLiving).toBe(FOUNDED.nations[USA].stats.economy.costOfLiving);
    });
    it("stops phasing in the week the tariff is lifted", () => {
        const after = signed(0.25);
        const lifted = liftMeasure(after, Object.keys(after.trade.measures).find((id) => !(id in FOUNDED.trade.measures)));
        expect(lifted.ok).toBe(true);
        if (!lifted.ok)
            return;
        const gone = apply(after, lifted.packet);
        // Lifted the week it was signed, it had passed nothing through, so nothing comes back out.
        expect(projectTariffPrices(gone)).toEqual({ step: 0, thisWeek: 0, measures: [], unwinding: 0 });
    });
});
describe("a lifted tariff's wedge comes back out", () => {
    const measureId = (campaign) => Object.keys(campaign.trade.measures).find((id) => !(id in FOUNDED.trade.measures));
    /** The price level the projection's weekly shift adds up to, from the turn the tariff is signed. */
    const levelAfter = (weeks, liftAt) => {
        const after = signed(0.25);
        const id = measureId(after);
        let level = 0;
        for (let week = 0; week < weeks; week += 1) {
            const turn = after.turn + week;
            const measure = after.trade.measures[id];
            const state = { ...after, turn, trade: { ...after.trade, measures: { ...after.trade.measures, [id]: liftAt !== undefined && week >= liftAt ? { ...measure, liftedTurn: after.turn + liftAt } : measure } } };
            level += projectTariffPrices(state).thisWeek / 52;
        }
        return level;
    };
    it("phases back out, over the same half year, the share that had passed through", () => {
        const step = tariffPriceStep(CHINA, SECTOR, 0.25);
        expect(levelAfter(TARIFF_PHASE_WEEKS)).toBeCloseTo(step, 9);
        expect(levelAfter(2 * TARIFF_PHASE_WEEKS, TARIFF_PHASE_WEEKS)).toBeCloseTo(0, 9);
        expect(levelAfter(TARIFF_PHASE_WEEKS + 13, 13)).toBeCloseTo(0, 9);
        expect(levelAfter(13 + 6, 13)).toBeGreaterThan(0);
    });
    it("leaves a held tariff its wedge, so held and lifted do not end level", () => {
        expect(levelAfter(3 * TARIFF_PHASE_WEEKS)).toBeGreaterThan(levelAfter(3 * TARIFF_PHASE_WEEKS, TARIFF_PHASE_WEEKS) + 1e-6);
    });
    it("gains nothing on the price level by imposing, lifting and imposing again", () => {
        const after = signed(0.25);
        const base = Object.values(after.trade.measures).find((m) => !(m.id in FOUNDED.trade.measures));
        const cycles = [0, 1, 2, 3].map((k) => ({ ...base, id: `cycle:${k}`, imposedTurn: after.turn + k * 26, liftedTurn: after.turn + k * 26 + 26 }));
        let level = 0;
        let peak = 0;
        for (let week = 0; week < 156; week += 1) {
            const turn = after.turn + week;
            const standing = cycles.filter((m) => m.imposedTurn <= turn).map((m) => (turn >= m.liftedTurn ? m : { ...m, liftedTurn: undefined }));
            const state = { ...after, turn, trade: { ...after.trade, measures: Object.fromEntries(standing.map((m) => [m.id, m])) } };
            level += projectTariffPrices(state).thisWeek / 52;
            peak = Math.max(peak, level);
        }
        expect(level).toBeCloseTo(0, 9);
        expect(peak).toBeLessThanOrEqual(tariffPriceStep(CHINA, SECTOR, 0.25) + 1e-9);
    });
});
