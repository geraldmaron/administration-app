import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { fiscalBalanceSeries, fiscalBooks, fiscalOutlaySeries, fiscalPath, fiscalPreview, fiscalRevenueSeries } from "./fiscal-books";

const base = openingCampaign();

describe("the national books", () => {
  it("carries the oath's opening, and no year's change the books never kept", () => {
    const reading = fiscalBooks(base)!;
    expect(reading.opening?.score).toBe(base.books![base.founding.nation]!.anchor!.score);
    expect(reading.yearChange).toBeUndefined();
  });

  it("composes a reading once the campaign has opened its economy records", () => {
    const reading = fiscalBooks(base);
    expect(reading).toBeDefined();
    expect(reading?.debtToGdp).toBeGreaterThan(0);
    expect(reading?.sovereign.rating).toBeDefined();
    expect(reading?.limit.ceiling).toBeGreaterThan(0);
  });

  it("says how far the ratio moves over the coming year on the path it is on", () => {
    // Left alone, the United States' ratio drifts up a point and a half to two
    // and a half a year; borrowing to build steepens that.
    const change = fiscalBooks(base)!.debtToGdpComingYear;
    expect(change).toBeGreaterThan(0.01);
    expect(change).toBeLessThan(0.03);
    const investing = { ...base, player: { ...base.player, policies: { ...base.player.policies, fiscal: "fiscal-investment" } } };
    expect(fiscalBooks(investing)!.debtToGdpComingYear).toBeGreaterThan(change + 0.005);
  });

  it("prints every series with its unit: dollars for the flows, a share for the ratio", () => {
    for (const point of [...fiscalRevenueSeries(base), ...fiscalOutlaySeries(base), ...fiscalBalanceSeries(base)]) expect(point.figure).toMatch(/^-?\$\d/);
    for (const point of fiscalPath(base)) expect(point.figure).toMatch(/^\d+%$/);
  });

  it("carries a ten-year path with the years in order", () => {
    const path = fiscalPath(base);
    expect(path.map((point) => point.label)).toEqual(Array.from({ length: 10 }, (_, i) => `Year ${i + 1}`));
  });

  it("prices a drafted program's deficit, debt and interest, never a row of zeros", () => {
    // Borrowing to build widens the deficit and cutting to a schedule narrows
    // it; a row that priced only the push on demand printed zero for both.
    const investment = fiscalPreview(base, { fiscal: "fiscal-investment" }, []);
    const austerity = fiscalPreview(base, { fiscal: "fiscal-austerity" }, []);
    expect(investment?.cost.deficit).toBeGreaterThan(0);
    expect(investment?.cost.debt).toBeGreaterThan(0);
    expect(investment?.cost.interest).toBeGreaterThan(0);
    expect(austerity?.cost.deficit).toBeLessThan(0);
  });

  it("states the push each program gives demand at first, a cut as a cut", () => {
    // Consolidation costs half a point to a point and a half of growth in its
    // first year and borrowing to build buys some: the preview's resting bars
    // alone read "little effect" for both. Borrowing to build pushes at first
    // with its tax cut and a week of its building money, which is spent out
    // over years, so its first push is the smaller of the two.
    const investment = fiscalPreview(base, { fiscal: "fiscal-investment" }, [])!;
    const austerity = fiscalPreview(base, { fiscal: "fiscal-austerity" }, [])!;
    expect(investment.impulse).toBeGreaterThan(0.0035);
    expect(austerity.impulse).toBeLessThan(-0.005);
    expect(investment.fadeWeeks).toBeGreaterThan(0);
  });

  it("prices nothing for an empty draft, so the preview row draws nothing", () => {
    expect(fiscalPreview(base, {}, [])).toBeUndefined();
  });

  it("names the years public investment takes to reach demand, only when the draft moves there", () => {
    // The tax cut half of every program still fades over `fadeWeeks`; the
    // building half of investment reaches demand as it is spent, over years,
    // which is a fact `fadeWeeks` (a week count) cannot state.
    const investment = fiscalPreview(base, { fiscal: "fiscal-investment" }, [])!;
    const austerity = fiscalPreview(base, { fiscal: "fiscal-austerity" }, [])!;
    expect(investment.spentOverYears).toBe(3);
    expect(austerity.spentOverYears).toBeUndefined();
  });
});
