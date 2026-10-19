import { describe, expect, it } from "vitest";
import { openConflict, type Campaign, type Conflict } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { nationFile } from "./nation-file";

const nation = (id: string) => id as NationId;
const opening = openingCampaign({ seedText: "country-opposing-sides" });
const war = openConflict(nation("RUS"), nation("UKR"), opening.turn, "Fighting is recorded.");
const withWars = (...conflicts: readonly Conflict[]): Campaign => ({ ...opening, conflicts: Object.fromEntries(conflicts.map((conflict) => [conflict.id, conflict])) });
const warsOn = (campaign: Campaign, id: string) => nationFile(campaign, nation(id))!.atWarWith;

describe("a country's actual opposing wars", () => {
  it("does not mark a coalition partner or principal ally as an enemy", () => {
    const conflict: Conflict = { ...war, joined: { aggressor: [nation("CHN")], defender: [nation("USA"), nation("CAN")] } };
    const campaign = withWars(conflict);
    expect(warsOn(campaign, "RUS")).toEqual([war.id]);
    expect(warsOn(campaign, "CHN")).toEqual([war.id]);
    expect(warsOn(campaign, "UKR")).toEqual([]);
    expect(warsOn(campaign, "CAN")).toEqual([]);
  });

  it("reads the opposite side when the United States joins the aggressor", () => {
    const conflict: Conflict = { ...war, joined: { aggressor: [nation("USA"), nation("CHN")], defender: [nation("CAN")] } };
    const campaign = withWars(conflict);
    expect(warsOn(campaign, "RUS")).toEqual([]);
    expect(warsOn(campaign, "CHN")).toEqual([]);
    expect(warsOn(campaign, "UKR")).toEqual([war.id]);
    expect(warsOn(campaign, "CAN")).toEqual([war.id]);
  });

  it.each(["aggressor", "defender"] as const)("reads principal US participation on the %s side", (side) => {
    const opened = openConflict(side === "aggressor" ? nation("USA") : nation("RUS"), side === "defender" ? nation("USA") : nation("RUS"), opening.turn, "Fighting is recorded.");
    const other = side === "aggressor" ? "defender" : "aggressor";
    const conflict: Conflict = { ...opened, joined: { ...opened.joined, [side]: [nation("CAN")], [other]: [nation("CHN")] } };
    const campaign = withWars(conflict);
    expect(warsOn(campaign, "RUS")).toEqual([conflict.id]);
    expect(warsOn(campaign, "CHN")).toEqual([conflict.id]);
    expect(warsOn(campaign, "CAN")).toEqual([]);
  });

  it("omits fronts without US participation and countries outside a front", () => {
    const campaign = withWars(war);
    for (const id of ["RUS", "UKR", "CAN"]) expect(warsOn(campaign, id)).toEqual([]);
  });

  it("omits ended fighting", () => {
    const conflict: Conflict = { ...war, status: "settled", endedTurn: opening.turn, joined: { ...war.joined, defender: [nation("USA")] } };
    expect(warsOn(withWars(conflict), "RUS")).toEqual([]);
  });
});
