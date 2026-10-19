import { describe, expect, it } from "vitest";
import { selectDateOfTurn, type Bill, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { caseDetails } from "./case-detail";

const base = openingCampaign();

function withBill(campaign: Campaign, id: string, introducedTurn: number): Campaign {
  const bill: Bill = {
    id,
    act: "act-test",
    title: `Bill ${id}`,
    sponsor: "bipartisan",
    introducedTurn,
    status: "on-the-desk",
    passage: [{ chamber: "house", yeas: 240, nays: 190, required: 218, passed: true }],
    // Presented the day its week opened, so a later introduction is a later clock.
    presentedOn: selectDateOfTurn(campaign, introducedTurn),
  };
  return { ...campaign, bills: { ...campaign.bills, [id]: bill } };
}

describe("caseDetails: one grammar over whatever family raised the case", () => {
  it("reads nothing on a board with no family matter", () => {
    expect(caseDetails(base)).toEqual([]);
  });

  it("names a bill with its statutory clock, who raised it and the door to it", () => {
    const campaign = withBill(base, "bill:act-test:1", base.turn);
    const rows = caseDetails(campaign);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kindLabel: "Bill", subject: "Congress", statusLabel: "New", delegable: false });
    // Presented on Saturday, January 20, 2029: ten days with the Sundays of the
    // 21st and 28th left out end on Thursday, February 1, twelve days out.
    expect(campaign.calendar).toEqual({ year: 2029, month: 1, day: 20 });
    expect(rows[0]!.clock?.daysRemaining).toBe(12);
    // Drawn against the window it was given: raised and due, both known.
    expect(rows[0]!.clock?.windowDays).toBeGreaterThanOrEqual(12);
    expect(rows[0]!.href).toContain("/bill/");
  });

  it("ranks the nearest clock first", () => {
    const later = { ...withBill(base, "bill:act-later:5", 5), turn: 3 };
    const both = withBill(later, "bill:act-soon:1", 1);
    expect(caseDetails(both).map((row) => row.title)).toEqual(["Bill bill:act-soon:1", "Bill bill:act-later:5"]);
  });
});
