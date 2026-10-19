import { describe, expect, it } from "vitest";
import { apply, joinConflict, openConflict, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { deferMatterPacket } from "../campaign/stop-brief";
import { presentedItems } from "./attention";
import { briefMatters } from "./brief-matters";

/** A war the United States entered this week: its row is soft only because the beat is new, and only a turn can make it old. */
function warThisWeek(): { readonly campaign: Campaign; readonly id: string } {
  const opening = openingCampaign();
  const conflict = openConflict("RUS" as NationId, "UKR" as NationId, opening.turn, "Russia invades Ukraine.");
  const invaded = { ...opening, conflicts: { ...opening.conflicts, [conflict.id]: conflict } };
  const joined = joinConflict(invaded, invaded.founding.nation, conflict.id, "defender");
  if (!joined.ok) throw new Error(joined.reason);
  return { campaign: apply(invaded, joined.packet), id: `war:${conflict.id}` };
}

/** Puts off every presented row from the Brief's own put-off, until nothing holds Continue or a row offers none. */
function putOffEverything(campaign: Campaign): { readonly campaign: Campaign; readonly stuck: readonly string[] } {
  let state = campaign;
  for (let round = 0; round < 20; round++) {
    const presented = presentedItems(state);
    if (presented.length === 0) return { campaign: state, stuck: [] };
    const matters = new Map(briefMatters(state).map((matter) => [matter.id, matter] as const));
    const stuck = presented.filter((item) => matters.get(item.id)?.putOff === undefined).map((item) => item.id);
    if (stuck.length > 0) return { campaign: state, stuck };
    state = presented.reduce((next, item) => apply(next, deferMatterPacket(next, matters.get(item.id)!.putOff!)), state);
  }
  return { campaign: state, stuck: presentedItems(state).map((item) => item.id) };
}

describe("a matter that holds Continue always has a way off the Brief", () => {
  it("holds Continue on a war beat that only the passing of a turn would quiet", () => {
    const { campaign, id } = warThisWeek();
    const row = presentedItems(campaign).find((item) => item.id === id);
    expect(row?.urgency).toBe("soft");
    // Reading the desk changes nothing: without a disposition the row stands
    // exactly as long as Continue stays held, which is forever.
    expect(presentedItems(campaign).some((item) => item.id === id)).toBe(true);
  });

  it("offers that war beat a put-off on its Brief row, and the put-off releases it", () => {
    const { campaign, id } = warThisWeek();
    const matter = briefMatters(campaign).find((entry) => entry.id === id);
    expect(matter).toMatchObject({ holds: true, urgency: "soft" });
    expect(matter?.putOff?.id).toBe(id);
    const after = apply(campaign, deferMatterPacket(campaign, matter!.putOff!));
    expect(presentedItems(after).some((item) => item.id === id)).toBe(false);
    expect(after.deferrals[id]).toBeDefined();
  });

  it("can clear every presented row from the Brief alone, so a held Continue is never a dead end", () => {
    const { campaign } = warThisWeek();
    const result = putOffEverything(campaign);
    expect(result.stuck).toEqual([]);
    expect(presentedItems(result.campaign)).toEqual([]);
  });
});
