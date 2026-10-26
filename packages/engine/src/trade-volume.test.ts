import { addDays } from "./clock.js";
import { apply } from "./effects.js";
import { temporaryImportSuspension, expireTradeMeasures } from "./trade-effects.js";
import { describe, expect, it } from "vitest";
import { US_GOODS_TRADE, type NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { bilateralGoods, retaliationFall, sectorFlow, sectorImports, volumeFall } from "./trade-volume.js";
import { suppliersOf, tradeEdge, tradeEdgesWith, type TradeMeasure } from "./trade.js";
import { tradeSector, TRADE_SECTOR_IDS, type TradeSectorId } from "./trade-sectors.js";
import type { Campaign } from "./state.js";

const { campaign } = foundedForBalance("trade-volume");
const total = (record: Readonly<Record<string, number>>) => Object.values(record).reduce((sum, value) => sum + value, 0);
const id = (value: string) => value as NationId;

function growth(state: Campaign, partner: string): number {
  const them = state.nations[id(partner)]!;
  const us = state.nations[state.founding.nation]!;
  return (them.stats.economy.gdp / them.base.stats.economy.gdp) * (us.stats.economy.gdp / us.base.stats.economy.gdp);
}

function withMeasure(state: Campaign, measure: Omit<TradeMeasure, "imposedTurn" | "imposedDate" | "authority">): Campaign {
  const full: TradeMeasure = { ...measure, imposedTurn: state.turn, imposedDate: state.calendar, authority: "INST-USTR" };
  return { ...state, trade: { ...state.trade, measures: { ...state.trade.measures, [full.id]: full } } };
}

function withGdp(state: Campaign, partner: string, factor: number): Campaign {
  const runtime = state.nations[id(partner)]!;
  const economy = { ...runtime.stats.economy, gdp: runtime.stats.economy.gdp * factor };
  return { ...state, nations: { ...state.nations, [partner]: { ...runtime, stats: { ...runtime.stats, economy } } } };
}

describe("a campaign opens on the trade the Census recorded", () => {
  it("opens each partner's goods book at the recorded figure, carried by the two economies", () => {
    for (const partner of ["CAN", "CHN", "MEX", "KEN", "FIN"]) {
      const goods = bilateralGoods(campaign, id(partner));
      const recorded = US_GOODS_TRADE[partner]!;
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
    const partners = suppliers.map((edge) => edge.partner as string);
    for (const expected of ["TWN", "MEX", "CHN", "VNM"]) expect(partners).toContain(expected);
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
    const sector: TradeSectorId = "consumer-electronics";
    const tariffed = withMeasure(campaign, { id: "tariff:test", kind: "tariff", sector, target: id("CHN"), rate: 0.25, origin: "us" });
    const before = tradeEdge(campaign, id("CHN"), sector)!.imports;
    const after = tradeEdge(tariffed, id("CHN"), sector)!.imports;
    expect(after / before).toBeCloseTo(1 - volumeFall(tradeSector(sector)!, 0.25), 2);
    expect(tradeEdge(tariffed, id("CHN"), "machine-tools")).toEqual(tradeEdge(campaign, id("CHN"), "machine-tools"));
  });

  it("loses what we sell them to their answer", () => {
    const sector: TradeSectorId = "agriculture-row-crops";
    const answered = withMeasure(campaign, { id: "retaliation:test", kind: "tariff", sector, target: id("CHN"), rate: 0.25, origin: "retaliation" });
    const before = tradeEdge(campaign, id("CHN"), sector)!;
    const after = tradeEdge(answered, id("CHN"), sector)!;
    // A foreign buyer turns from American goods at the export response, not the import one.
    expect(after.exports / before.exports).toBeCloseTo(1 - retaliationFall(tradeSector(sector)!, 0.25), 2);
    expect(after.imports).toBe(before.imports);
  });

  it("loses about what China's 2018-19 answer took off American farm sales", () => {
    // USDA ERS: China's retaliatory tariffs, 5 to 25 percent, reduced the value
    // of US agricultural exports to China by 76 percent. A band, at the top rate.
    const fall = retaliationFall(tradeSector("agriculture-row-crops")!, 0.25);
    expect(fall).toBeGreaterThan(0.65);
    expect(fall).toBeLessThan(0.85);
  });

  it("ends for an embargo, the goods no sector covers included", () => {
    const embargoed = withMeasure(campaign, {
      id: "embargo:test",
      kind: "embargo",
      sector: TRADE_SECTOR_IDS[0]!,
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

describe("trade a tariff turns away goes to other suppliers", () => {
  const sector: TradeSectorId = "consumer-electronics";
  const tariffed = withMeasure(campaign, { id: "tariff:CHN:divert", kind: "tariff", sector, target: id("CHN"), rate: 0.25, origin: "us" });
  const weeksOn = (state: Campaign, weeks: number): Campaign => ({ ...state, turn: state.turn + weeks, calendar: addDays(state.calendar, weeks * 7) });
  const vietnam = (state: Campaign) => sectorFlow(state, id("VNM"), sector)?.imports ?? 0;
  const imports = (state: Campaign) => sectorImports(state, sector);

  it("leaves Vietnam's sales where they were the day the tariff lands, and raises them over the months after", () => {
    expect(vietnam(tariffed)).toBeCloseTo(vietnam(campaign), 2);
    expect(vietnam(weeksOn(tariffed, 26))).toBeGreaterThan(vietnam(campaign));
    expect(vietnam(weeksOn(tariffed, 104))).toBeGreaterThan(vietnam(weeksOn(tariffed, 26)));
    const share = (state: Campaign) => vietnam(state) / imports(state);
    expect(share(weeksOn(tariffed, 52))).toBeGreaterThan(share(campaign));
  });

  it("never diverts more than buyers can replace, so the country buys less in all", () => {
    expect(imports(weeksOn(tariffed, 520))).toBeLessThan(imports(campaign));
  });

  it("stops diverting the week the tariff is lifted", () => {
    const lifted = withMeasure(weeksOn(tariffed, 52), { id: "tariff:CHN:divert", kind: "tariff", sector, target: id("CHN"), rate: 0.25, origin: "us", liftedTurn: tariffed.turn + 52 });
    expect(vietnam(lifted)).toBeCloseTo(vietnam(weeksOn(campaign, 52)), 2);
  });
});

describe("an old token restriction cannot age a large new one", () => {
  const sector: TradeSectorId = "consumer-electronics";
  const vietnam = (state: Campaign) => sectorFlow(state, id("VNM"), sector)?.imports ?? 0;
  const tariff = (state: Campaign, measureId: string, rate: number, daysAgo: number): Campaign => {
    const measure: TradeMeasure = { id: measureId, kind: "tariff", sector, target: id("CHN"), rate, origin: "us", imposedTurn: state.turn, imposedDate: addDays(state.calendar, -daysAgo), authority: "INST-USTR" };
    return { ...state, trade: { ...state.trade, measures: { ...state.trade.measures, [measure.id]: measure } } };
  };
  const token = tariff(campaign, "tariff:CHN:token", 0.001, 364);
  const both = tariff(token, "tariff:CHN:large", 0.25, 0);
  const freshLarge = tariff(campaign, "tariff:CHN:large", 0.25, 0);

  it("matures only the token's own small cut on the day the large tariff lands", () => {
    const gainedByToken = vietnam(token) - vietnam(campaign);
    expect(vietnam(both) - vietnam(campaign)).toBeCloseTo(gainedByToken, 1);
    // What the old token adds over a fresh large tariff is the token's own matured cut, no more.
    expect(vietnam(both) - vietnam(freshLarge)).toBeLessThanOrEqual(gainedByToken + 0.01);
    expect(vietnam(both) - vietnam(campaign)).toBeLessThan(10);
  });

  it("gives a staged sequence no more diversion than its pieces dated as they were made", () => {
    const later = (state: Campaign) => ({ ...state, turn: state.turn + 26, calendar: addDays(state.calendar, 182) });
    const staged = vietnam(later(both)) - vietnam(later(campaign));
    const pieces = (vietnam(later(token)) - vietnam(later(campaign))) + (vietnam(later(freshLarge)) - vietnam(later(campaign)));
    expect(staged).toBeLessThanOrEqual(pieces + 1);
  });
});

describe("diversion against the 2018-19 record", () => {
  // Census goods trade (opened 2026-10-25): US imports from China fell $89.4
  // billion from 2018 to 2019 while all US imports fell $44.4 billion, so
  // about half the lost Chinese flow was bought elsewhere within the year.
  // All goods, other causes mixed in: a band of a quarter either side.
  it("replaces about half of a tariffed partner's lost sales within the year", () => {
    const sector: TradeSectorId = "consumer-electronics";
    const tariffed = withMeasure(campaign, { id: "tariff:CHN:record", kind: "tariff", sector, target: id("CHN"), rate: 0.25, origin: "us" });
    const year = { ...tariffed, turn: tariffed.turn + 52, calendar: addDays(tariffed.calendar, 364) };
    const lost = (sectorFlow(campaign, id("CHN"), sector)?.imports ?? 0) - (sectorFlow(year, id("CHN"), sector)?.imports ?? 0);
    const replaced = lost - (sectorImports(campaign, sector) - sectorImports(year, sector));
    const record = (89.4 - 44.4) / 89.4;
    expect(Math.abs(replaced / lost - record)).toBeLessThanOrEqual(0.25 * record);
  });
});
