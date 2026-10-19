/**
 * The worked proof: a war that puts a custodian of the Strait of Hormuz in the
 * fight lifts crude through lost barrels and a contested strait; the pump
 * follows two to five weeks behind; the United States, not a party, feels it
 * through crude alone; importers and exporters part ways; a reserve release
 * moderates it; and reopening the strait brings the price back before the
 * stocks are whole.
 */
import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { foundedForBalance } from "./balance-harness.js";
import { commodityPhase } from "./commodity-phase.js";
import { commodityShocks } from "./commodity-shocks.js";
import { referenceIndex } from "./commodity-registry.js";
import { openConflict } from "./conflicts.js";
import { apply } from "./effects.js";
import { externalMacroPressure } from "./external-pressure.js";
import { oathPumpPrice, pumpPrice, pumpShock, selectPumpPrice } from "./household-prices.js";
import { releaseStrategicReserve } from "./commodity-levers.js";
import { selectSalience } from "./opinion.js";
import type { Campaign, Conflict } from "./state.js";
import type { TradeMeasure } from "./trade.js";

const USA = "USA" as NationId;
const IRN = "IRN" as NationId;
const SAU = "SAU" as NationId;
const JPN = "JPN" as NationId;

const { campaign: BARE } = foundedForBalance("hormuz-proof", "democrat", {}, { carriedWorld: false });

function withWar(campaign: Campaign, war: Conflict): Campaign {
  return { ...campaign, conflicts: { ...campaign.conflicts, [war.id]: war } };
}

function withoutWars(campaign: Campaign): Campaign {
  return { ...campaign, conflicts: {} };
}

/** Only the markets' weeks: the kernel's own path, with nothing else in the world moving. */
function marketWeeks(campaign: Campaign, weeks: number): Campaign {
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) {
    for (const packet of commodityPhase(working)) working = apply(working, packet);
    working = withWeeksElapsed(working, 1);
  }
  return working;
}

const gulfWar = (campaign: Campaign, intensity: number): Conflict => ({ ...openConflict(IRN, SAU, campaign.turn, "A test war in the Gulf."), intensity });
const crude = (campaign: Campaign) => campaign.markets?.commodities.crude?.index ?? referenceIndex("crude");

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
    const filed: { readonly week: number; readonly turn: number }[] = [];
    for (let week = 0; week < 6; week += 1) {
      for (const packet of commodityPhase(working)) {
        for (const effect of packet.effects) if (effect.kind === "feed") filed.push(...effect.items.map((item) => ({ week: working.turn, turn: item.turn })));
        working = apply(working, packet);
      }
      working = withWeeksElapsed(working, 1);
    }
    expect(filed.length).toBeGreaterThan(0);
    for (const item of filed) expect(item.turn).toBe(item.week + 1);
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
    expect(pressure.inflation).toBeCloseTo(pressure.commodities!.inflation, 6);
  });

  it("parts importers from exporters: Japan pays in growth, a Gulf exporter outside the war gains", () => {
    const eight = marketWeeks(atWar, 8);
    expect(externalMacroPressure(eight, JPN).commodities?.growth ?? 0).toBeLessThan(0);
    const kuwait = externalMacroPressure(eight, "KWT" as NationId).commodities?.growth ?? 0;
    expect(kuwait).toBeGreaterThan(0);
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
    if (!released.ok) return;
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
    const embargo: TradeMeasure = {
      id: `embargo:${IRN}:1`,
      kind: "embargo",
      sector: "energy-oil" as TradeMeasure["sector"],
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
