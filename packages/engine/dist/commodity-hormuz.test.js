/**
 * The worked proof: a war that puts a custodian of the Strait of Hormuz in the
 * fight lifts crude through lost barrels and a contested strait; the pump
 * follows two to five weeks behind; the United States, not a party, feels it
 * through crude alone; importers and exporters part ways; a reserve release
 * moderates it; and reopening the strait brings the price back before the
 * stocks are whole.
 */
import { describe, expect, it } from "vitest";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { commodityPhase } from "./commodity-phase.js";
import { commodityShocks, contestedRoutes, warLossFraction } from "./commodity-shocks.js";
import { referenceIndex } from "./commodity-registry.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { externalMacroPressure } from "./external-pressure.js";
import { oathPumpPrice, pumpPrice, pumpShock, selectPumpPrice } from "./household-prices.js";
import { releaseStrategicReserve } from "./commodity-levers.js";
import { selectSalience } from "./opinion.js";
const USA = "USA";
const IRN = "IRN";
const SAU = "SAU";
const JPN = "JPN";
const { campaign: BARE } = foundedForBalance("hormuz-proof", "democrat", {}, { carriedWorld: false });
function withWar(campaign, war) {
    return { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } };
}
function withoutWars(campaign) {
    return { ...campaign, conflicts: {} };
}
/** Only the markets' weeks: the kernel's own path, with nothing else in the world moving. */
function marketWeeks(campaign, weeks) {
    let working = campaign;
    for (let week = 0; week < weeks; week += 1) {
        for (const packet of commodityPhase(working))
            working = apply(working, packet);
        working = withWeeksElapsed(working, 1);
    }
    return working;
}
const gulfWar = (campaign, intensity) => ({ ...openConflict(IRN, SAU, campaign.turn, "A test war in the Gulf."), intensity });
const crude = (campaign) => campaign.markets?.commodities.crude?.index ?? referenceIndex("crude");
describe("the Hormuz worked proof", () => {
    const atWar = withWar(BARE, gulfWar(BARE, 0.8));
    it("names the lost Saudi barrels and the contested strait as the shocks", () => {
        const kinds = commodityShocks(atWar, "crude").map((shock) => shock.kind);
        expect(kinds).toContain("war");
        expect(kinds).toContain("route");
        expect(commodityShocks(BARE, "crude")).toEqual([]);
    });
    it("files its market wire on the turn the week's ledger entry opens", () => {
        let working = atWar;
        const filed = [];
        for (let week = 0; week < 6; week += 1) {
            for (const packet of commodityPhase(working)) {
                for (const effect of packet.effects)
                    if (effect.kind === "feed")
                        filed.push(...effect.items.map((item) => ({ week: working.turn, turn: item.turn })));
                working = apply(working, packet);
            }
            working = withWeeksElapsed(working, 1);
        }
        expect(filed.length).toBeGreaterThan(0);
        for (const item of filed)
            expect(item.turn).toBe(item.week + 1);
    });
    it("lifts crude, and the pump follows it only from the second week", () => {
        const one = marketWeeks(atWar, 1);
        expect(crude(one)).toBeGreaterThan(referenceIndex("crude"));
        expect(selectPumpPrice(one)).toBeCloseTo(oathPumpPrice(), 9);
        const six = marketWeeks(atWar, 6);
        expect(crude(six)).toBeGreaterThan(referenceIndex("crude") * 1.15);
        expect(selectPumpPrice(six)).toBeGreaterThan(oathPumpPrice() * 1.05);
        expect(six.markets?.commodities.crude?.cause).toMatch(/strait|war/);
    });
    it("reaches US prices through crude alone: the war term adds nothing for a country not in it", () => {
        const eight = marketWeeks(atWar, 8);
        const pressure = externalMacroPressure(eight, USA);
        expect(pressure.commodities?.inflation ?? 0).toBeGreaterThan(0);
        expect(pressure.inflation).toBeCloseTo(pressure.commodities.inflation, 6);
    });
    // Receipts are what an exporter delivers times the price. Norway ships
    // nothing through the strait and is paid the higher price on all of it;
    // Kuwait, outside the war but behind the strait, is paid it only on the
    // cargo that still leaves, and loses the stranded rest.
    it("parts importers from exporters: Japan pays in growth, an exporter clear of the strait gains, and one behind it fares worse", () => {
        const eight = marketWeeks(atWar, 8);
        expect(externalMacroPressure(eight, JPN).commodities?.growth ?? 0).toBeLessThan(0);
        const norway = externalMacroPressure(eight, "NOR").commodities?.growth ?? 0;
        const kuwait = externalMacroPressure(eight, "KWT").commodities?.growth ?? 0;
        expect(norway).toBeGreaterThan(0);
        expect(kuwait).toBeLessThan(norway);
    });
    it("makes the public name gasoline once the pump has climbed", () => {
        const ten = marketWeeks(atWar, 10);
        expect(pumpShock(ten)).toBe(true);
        expect(selectSalience(ten)).toContain("pumpShock");
    });
    it("is moderated by a reserve release", () => {
        const four = marketWeeks(atWar, 4);
        const released = releaseStrategicReserve(four);
        expect(released.ok).toBe(true);
        if (!released.ok)
            return;
        const withRelease = marketWeeks(apply(four, released.packet), 8);
        const without = marketWeeks(four, 8);
        expect(crude(withRelease)).toBeLessThan(crude(without));
    });
    it("comes back down once the strait reopens, before the stocks are whole", () => {
        const shocked = marketWeeks(atWar, 12);
        const reopened = marketWeeks(withoutWars(shocked), 8);
        expect(crude(reopened)).toBeLessThan(crude(shocked));
        expect(reopened.markets?.commodities.crude?.inventory ?? 1).toBeLessThan(1);
    });
    it("lands inside a band around August 2026's $91 Brent when the month's conditions are rebuilt", () => {
        // The month the table carries: Iran at war with the United States at a
        // moderate pitch, and an embargo on Iran's oil. $91 is 1.32 on the 2025
        // anchor; the band is wide because every kernel figure is a planning value.
        const embargo = {
            id: `embargo:${IRN}:1`,
            kind: "embargo",
            sector: "energy-oil",
            target: IRN,
            rate: 0,
            imposedTurn: BARE.turn,
            imposedDate: BARE.calendar,
            authority: "INST-OFAC",
            origin: "us",
        };
        const august = withWar({ ...BARE, trade: { ...BARE.trade, measures: { [embargo.id]: embargo } } }, { ...openConflict(USA, IRN, BARE.turn, "A test war."), intensity: 0.4 });
        const index = crude(marketWeeks(august, 26));
        expect(index).toBeGreaterThan(1.15);
        expect(index).toBeLessThan(1.6);
        expect(pumpPrice(index)).toBeGreaterThan(oathPumpPrice());
    });
});
// One quiet week opens the markets at rest, so a war or a measure added after
// it changes what is delivered before it has moved any price.
const QUIET = marketWeeks(BARE, 1);
describe("the flags a closing government stops carry the shortage", () => {
    const war = { ...openConflict(USA, IRN, QUIET.turn, "A test war."), intensity: 1 };
    const stopped = withWar(QUIET, war);
    const iran = QUIET.nations[IRN];
    const passed = {
        ...stopped,
        nations: { ...stopped.nations, [IRN]: { ...iran, base: { ...iran.base, doctrine: { ...iran.base.doctrine, alignmentPull: [...iran.base.doctrine.alignmentPull, JPN] } } } },
    };
    it("leaves Japan shorter of energy when Iran stops its ships than when it lets them through, before any price has moved", () => {
        const hit = (campaign) => externalMacroPressure(campaign, JPN).commodities?.growth ?? 0;
        expect(hit(stopped)).toBeLessThan(0);
        expect(hit(stopped)).toBeLessThan(hit(passed));
    });
    it("charges an exporter clear of the strait nothing for the closure until the price moves", () => {
        expect(externalMacroPressure(stopped, "NOR").commodities?.growth ?? 0).toBeCloseTo(externalMacroPressure(QUIET, "NOR").commodities?.growth ?? 0, 9);
    });
});
describe("a measure and a closed strait on the same barrels", () => {
    // Kuwait under an oil designation and behind a closed strait: the barrels
    // the measure already keeps from its buyers are not stranded a second time,
    // in the world's supply or in Kuwait's own books.
    const KWT = "KWT";
    const sanctions = {
        id: "sanctions:KWT:overlap",
        kind: "sanctions",
        sector: "energy-crude",
        target: KWT,
        rate: 0,
        imposedTurn: QUIET.turn,
        imposedDate: QUIET.calendar,
        authority: "INST-OFAC",
        origin: "us",
    };
    const war = { ...openConflict(USA, IRN, QUIET.turn, "A test war."), intensity: 1 };
    const sanctioned = { ...QUIET, trade: { ...QUIET.trade, measures: { [sanctions.id]: sanctions } } };
    const closed = withWar(QUIET, war);
    const both = withWar(sanctioned, war);
    const growth = (campaign) => externalMacroPressure(campaign, KWT).growth - externalMacroPressure(QUIET, KWT).growth;
    const routeLoss = (campaign) => commodityShocks(campaign, "crude").find((shock) => shock.kind === "route")?.loss ?? 0;
    it("costs Kuwait less than the two separately and no less than either alone", () => {
        const [route, measure, together] = [growth(closed), growth(sanctioned), growth(both)];
        expect(route).toBeLessThan(0);
        expect(measure).toBeLessThan(0);
        expect(together).toBeGreaterThan(route + measure);
        expect(together).toBeLessThanOrEqual(Math.min(route, measure));
    });
    it("stops fewer barrels at the strait once the measure has already kept Kuwait's off the market", () => {
        expect(routeLoss(both)).toBeLessThan(routeLoss(closed));
        expect(routeLoss(both)).toBeGreaterThan(0);
    });
});
describe("the strait's deduction and the market's shocks keep one account", () => {
    const hormuzWar = { ...openConflict(USA, IRN, QUIET.turn, "A test war."), intensity: 1 };
    const contested = withWar(QUIET, hormuzWar);
    const upstream = (campaign) => contestedRoutes(campaign, "crude")[0].upstreamLost;
    it("takes nothing from the strait's flow for a war on an importer's ground", () => {
        const farWar = { ...openConflict("RUS", "CHN", QUIET.turn, "A distant test war."), intensity: 1 };
        expect(upstream(withWar(contested, farWar))).toBeCloseTo(upstream(contested), 12);
    });
    it("charges a measure on a warring supplier only on the output its war left", () => {
        const sanctions = { id: "sanctions:IRN:war", kind: "sanctions", sector: "energy-crude", target: IRN, rate: 0, imposedTurn: QUIET.turn, imposedDate: QUIET.calendar, authority: "INST-OFAC", origin: "us" };
        const sanctioned = { ...QUIET, trade: { ...QUIET.trade, measures: { [sanctions.id]: sanctions } } };
        const onIran = (campaign) => commodityShocks(campaign, "crude").find((s) => s.kind === "sanction" && s.cause.includes("Iran")).loss;
        const atWar = withWar(sanctioned, hormuzWar);
        expect(onIran(atWar)).toBeCloseTo(onIran(sanctioned) * (1 - warLossFraction(IRN, [hormuzWar])), 12);
    });
});
describe("a full-intensity Hormuz war against the 2026 closure", () => {
    // EIA STEO: 10.4 Mb/d shut in in April 2026 of 108.42 world supply; weekly
    // Brent rose from $71.36 to a $124.61 peak. Lost physical flow first, then
    // the weekly price peak, each within a quarter of the sourced change.
    const full = withWar(BARE, { ...openConflict(USA, IRN, BARE.turn, "A test war."), intensity: 1 });
    it("takes about the share of world supply the strait's closure shut in", () => {
        const lost = commodityShocks(full, "crude").reduce((sum, shock) => sum + shock.loss, 0);
        const april = 10.4 / 108.42;
        expect(Math.abs(lost - april)).toBeLessThanOrEqual(0.25 * april);
    });
    it("peaks within a quarter of the weekly peak's rise", () => {
        const causal = 124.61 / 71.36 - 1;
        let working = full;
        let high = 0;
        for (let week = 0; week < 16; week += 1) {
            working = marketWeeks(working, 1);
            high = Math.max(high, crude(working) / referenceIndex("crude"));
        }
        expect(Math.abs(high - 1 - causal)).toBeLessThanOrEqual(0.25 * causal);
    });
});
