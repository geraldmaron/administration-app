import { describe, expect, it } from "vitest";
import { openConflict, selectDateOfTurn, type Campaign, type Conflict } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { warAgeLine, warBeatDate } from "./war-age";

const at = (campaign: Campaign, turn: number): Campaign => ({ ...campaign, turn });

function war(aggressor: string, defender: string, startedTurn: number, inherited?: Conflict["inherited"]): Conflict {
  const opened = openConflict(aggressor as NationId, defender as NationId, startedTurn, "Fighting.");
  return inherited ? { ...opened, inherited } : opened;
}

describe("a war's age on its file", () => {
  const campaign = at(openingCampaign({ seedText: "war-age" }), 10);
  const oath = selectDateOfTurn(campaign, 1);

  it("counts the weeks of a war this term started", () => {
    expect(warAgeLine(campaign, war("RUS", "UKR", 7))).toBe("Going on for 3 weeks.");
    expect(warAgeLine(campaign, war("RUS", "UKR", 10))).toBe("Going on for 1 week.");
  });

  it("dates a carried war the table records from when its fighting began, not from the oath", () => {
    const carried = war("RUS", "UKR", 0, { asOf: { year: 2026, month: 9, day: 24 }, source: "table" });
    expect(warAgeLine(campaign, carried)).toBe("Under way since February 2022.");
    const dayPrecise = war("ISR", "IRN", 0, { asOf: { year: 2026, month: 9, day: 24 }, source: "table" });
    expect(warAgeLine(campaign, dayPrecise)).toBe("Under way since February 28, 2026.");
  });

  it("gives no age for a carried war nothing dates, rather than counting it from the oath", () => {
    const drawn = war("ARM", "AZE", 0, { asOf: oath, source: "catalog" });
    expect(warAgeLine(campaign, drawn)).toBe("");
  });

  it("dates a carried war from the table's reading where it predates the oath and no start is on record", () => {
    const read = war("ARM", "AZE", 0, { asOf: { year: 2026, month: 9, day: 24 }, source: "table" });
    expect(warAgeLine(campaign, read)).toBe("Under way since at least September 24, 2026.");
  });

  it("gives a carried war that ended the weeks it ran into this term", () => {
    const drawn: Conflict = { ...war("ARM", "AZE", 0, { asOf: oath, source: "catalog" }), status: "settled", endedTurn: 6 };
    expect(warAgeLine(campaign, drawn)).toBe("It ended 6 weeks into this term.");
  });
});

describe("a war beat's date", () => {
  const campaign = at(openingCampaign({ seedText: "war-age-beats" }), 10);

  it("dates a beat filed before the first week to the oath", () => {
    expect(warBeatDate(campaign, 0)).toEqual(selectDateOfTurn(campaign, 1));
  });

  it("dates every later beat by its own turn", () => {
    expect(warBeatDate(campaign, 5)).toEqual(selectDateOfTurn(campaign, 5));
  });
});
