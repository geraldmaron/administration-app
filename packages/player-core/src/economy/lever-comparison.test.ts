import { describe, expect, it } from "vitest";
import { addDays, apply, commodityPhase, DAYS_PER_TURN, openConflict, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { costLines, leverComparison } from "./lever-comparison";
import { marketLeverAct } from "./market-levers";

// Each lever's column against waiting, read off the packet its commit applies.

const base = openingCampaign();
const calm: Campaign = { ...base, conflicts: {}, conditions: {}, trade: { ...base.trade, measures: {} } };

function marketWeeks(campaign: Campaign, weeks: number): Campaign {
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) {
    for (const packet of commodityPhase(working)) working = apply(working, packet);
    working = { ...working, turn: working.turn + 1, calendar: addDays(working.calendar, DAYS_PER_TURN) };
  }
  return working;
}

const gulfWar = (): Campaign => {
  const war = { ...openConflict("IRN" as NationId, "SAU" as NationId, base.turn, "A test war."), intensity: 0.8 };
  return marketWeeks({ ...base, conflicts: { [war.id]: war } }, 8);
};

describe("the market levers against the markets left alone", () => {
  it("carries every lever and no column for waiting, with the Fed's own date said beside them", () => {
    const comparison = leverComparison(calm);
    expect(comparison.columns.map((column) => column.id)).toEqual(["fed-ease", "fed-tighten", "reserve", "reserve-limited", "fuel-waiver"]);
    expect(comparison.waiting).toMatch(/the Fed decides on its own on/);
    expect(comparison.untouched.crude).toBeGreaterThan(0);
  });

  it("refuses the reserve in a calm market and draws no outlook for it", () => {
    const reserve = leverComparison(calm).columns.find((column) => column.id === "reserve")!;
    expect(reserve.refusal).toMatch(/severe energy supply interruption/);
    expect(reserve.outlook).toBeUndefined();
  });

  it("prices pressing the Fed in standing and leaves crude where the markets alone leave it", () => {
    const comparison = leverComparison(calm);
    const ease = comparison.columns.find((column) => column.id === "fed-ease")!;
    expect(ease.cost.join(" ")).toMatch(/^International standing −/);
    expect(ease.outlook?.crude).toBe(comparison.untouched.crude);
  });

  it("projects crude lower under a reserve drawdown than with no lever, in a Gulf war", () => {
    const comparison = leverComparison(gulfWar());
    const reserve = comparison.columns.find((column) => column.id === "reserve")!;
    expect(reserve.refusal).toBeUndefined();
    expect(reserve.outlook!.crude).toBeLessThan(comparison.untouched.crude);
  });

  it("offers a limited drawdown against a shortage, once for that shortage, and refuses it in a calm market", () => {
    expect(leverComparison(calm).columns.find((column) => column.id === "reserve-limited")!.refusal).toMatch(/no supply is being lost/);
    const war = gulfWar();
    const comparison = leverComparison(war);
    const limited = comparison.columns.find((column) => column.id === "reserve-limited")!;
    expect(limited.refusal).toBeUndefined();
    expect(limited.outlook!.crude).toBeLessThan(comparison.untouched.crude);
    const ordered = marketLeverAct(war, "reserve-limited");
    if (!ordered.ok) throw new Error(ordered.reason);
    const after = apply(war, ordered.packet);
    expect(marketLeverAct(after, "reserve-limited").ok).toBe(false);
  });

  it("projects the gallon cheaper under a fuel waiver, from the packet the commit applies", () => {
    const war = gulfWar();
    const comparison = leverComparison(war);
    const waiver = comparison.columns.find((column) => column.id === "fuel-waiver")!;
    expect(waiver.outlook!.pump).toBeLessThan(comparison.untouched.pump);
    expect(marketLeverAct(war, "fuel-waiver").ok).toBe(true);
  });

  it("says a treasury cost in money and a reading's in points", () => {
    expect(costLines({ standing: -0.005, treasury: -1200 })).toEqual(["International standing −0.5 pts", expect.stringMatching(/^Budget authority /)]);
  });
});
