import { describe, expect, it } from "vitest";
import { addDays, apply, commodityPhase, DAYS_PER_TURN, emptyMarkets, openConflict, referenceIndex, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { commodityBoard, commodityDetail, commodityHref, equityReading, fedReading, FED_HREF, householdReadings, isCommodityKey } from "./markets";
import { marketLevers } from "./market-levers";
import { RELEASE_HREF, releaseTimeline } from "./market-releases";

// The markets readings as the economy room draws them: every commodity in its
// family, the household bills with their lag, the Fed and the index, the
// release calendar, and a destination for everything a reader can open.

const base = openingCampaign();
/** A world with nothing moving the markets: no wars, no conditions, no measures, no embargoes. */
const calm: Campaign = {
  ...base,
  conflicts: {},
  conditions: {},
  trade: { ...base.trade, measures: {} },
  player: { ...base.player, flags: Object.fromEntries(Object.entries(base.player.flags).filter(([flag]) => !flag.startsWith("embargo:"))) },
};

function marketWeeks(campaign: Campaign, weeks: number): Campaign {
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) {
    for (const packet of commodityPhase(working)) working = apply(working, packet);
    working = { ...working, turn: working.turn + 1, calendar: addDays(working.calendar, DAYS_PER_TURN) };
  }
  return working;
}

describe("the commodity board", () => {
  it("lists all eleven commodities in their six families, each with a line from the oath", () => {
    const board = commodityBoard(marketWeeks(base, 3));
    expect(board.map((family) => family.family)).toEqual(["crude", "gas", "grains", "fertilizer", "metals", "minerals"]);
    const rows = board.flatMap((family) => family.rows);
    expect(rows).toHaveLength(11);
    for (const row of rows) {
      expect(row.points.length).toBe(4);
      expect(row.points[0]!.value).toBeCloseTo(referenceIndex(row.id), 3);
    }
  });

  it("keeps numeric direction independent from whether dearer supply is adverse", () => {
    const markets = base.markets ?? emptyMarkets();
    for (const [multiple, direction] of [[1.4, "up"], [.8, "down"], [1, "flat"]] as const) {
      const index = referenceIndex("crude") * multiple;
      const campaign: Campaign = { ...base, markets: { ...markets, commodities: { ...markets.commodities, crude: { index, norm: index, inventory: 1, anchorUsd: base.markets?.commodities.crude?.anchorUsd ?? 0, series: [index] } } } };
      const row = commodityDetail(campaign, "crude").row;
      expect(row.changeDirection).toBe(direction);
      expect(row.points.at(-1)?.value).toBe(index);
      expect(row.stance).toBe(multiple > 1 ? "adverse" : multiple < 1 ? "favorable" : "neutral");
    }
  });

  it("prices the anchored commodities in dollars and labels the rest as an index", () => {
    const rows = commodityBoard(base).flatMap((family) => family.rows);
    expect(rows.find((row) => row.id === "crude")!.figure).toMatch(/^\$\d+\.\d\d a barrel$/);
    expect(rows.find((row) => row.id === "copper")!.figure).toMatch(/^Index /);
    expect(rows.find((row) => row.id === "crude")!.provenance).toContain("an estimate from an official forecast");
  });

  it("opens every commodity at its own page, with who supplies it", () => {
    expect(commodityHref("crude")).toBe("/nation/economy?view=markets&measure=crude");
    expect(isCommodityKey("rare-earths")).toBe(true);
    expect(isCommodityKey("approval")).toBe(false);
    const detail = commodityDetail(calm, "crude");
    expect(detail.suppliers[0]?.nation).toBe("USA");
    expect(detail.shocks).toEqual([]);
  });
});

describe("the household bills", () => {
  it("reads the pump, the grocery bill and the power bill, each opening where prices land", () => {
    const readings = householdReadings(base);
    expect(readings.map((reading) => reading.key)).toEqual(["pump", "grocery", "home-energy"]);
    expect(readings[0]!.figure).toMatch(/^\$\d\.\d\d a gallon$/);
    for (const reading of readings) expect(reading.href).toBe("/nation/economy?measure=inflation");
  });

  it("shows the pump rising after a Gulf war, with the week the lag has decided drawn ahead", () => {
    const war = { ...openConflict("IRN" as NationId, "SAU" as NationId, base.turn, "A test war."), intensity: 0.8 };
    const atWar = marketWeeks({ ...base, conflicts: { [war.id]: war } }, 8);
    const pump = householdReadings(atWar)[0]!;
    expect(pump.stance).not.toBe("neutral");
    expect(pump.points.at(-1)?.kind).toBe("projected");
    const crude = commodityDetail(atWar, "crude");
    expect(crude.shocks.length).toBeGreaterThan(0);
  });
});

describe("the Fed, the index and the calendar", () => {
  it("names the chair, the next meeting and opens the Fed's own page", () => {
    const fed = fedReading(base);
    expect(fed.rate).toMatch(/%$/);
    expect(fed.nextMeeting.length).toBeGreaterThan(0);
    expect(FED_HREF).toBe("/nation/economy?view=markets&measure=policy-rate");
  });

  // A campaign at its oath has no markets record yet (its first week writes
  // one), so the fixture starts from the engine's blank record.
  it("draws one step per meeting date, keeping the decision that stood", () => {
    const date = { year: 2029, month: 1, day: 18 };
    const later = { year: 2029, month: 3, day: 15 };
    const markets = base.markets ?? emptyMarkets();
    const twice: Campaign = {
      ...base,
      markets: {
        ...markets,
        fed: { rate: 0.0414, chairTilt: 0, meetings: [{ date, target: 0.0419, rate: 0.0419 }, { date, target: 0.041, rate: 0.0416 }, { date: later, target: 0.0409, rate: 0.0414 }] },
      },
    };
    const steps = fedReading(twice).steps;
    expect(steps.map((step) => step.rate)).toEqual([4.16, 4.14]);
  });

  it("draws the index from 100 at the oath with a crash line under last week", () => {
    const equity = equityReading(marketWeeks(base, 2));
    expect(equity.points[0]!.value).toBe(100);
    expect(equity.crashLine).toBeLessThan(equity.points.at(-2)!.value);
  });

  it("lists the next of every release, each opening the rate it prints", () => {
    const timeline = releaseTimeline(base);
    expect(timeline.next.map((entry) => entry.kind)).toEqual(["jobs", "cpi", "gdp", "fomc"]);
    for (const entry of [...timeline.past, ...timeline.next]) expect(entry.href).toBe(RELEASE_HREF[entry.kind]);
  });
});

describe("the market levers", () => {
  it("prices leaning on the Fed and refuses the reserve with no interruption", () => {
    const levers = marketLevers(calm);
    expect(levers.find((lever) => lever.key === "fed-ease")?.kind).toBe("available");
    expect(levers.find((lever) => lever.key === "reserve")?.kind).toBe("refused");
  });
});
