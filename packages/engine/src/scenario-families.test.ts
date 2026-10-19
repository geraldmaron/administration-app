import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { createSave, loadSave } from "./save.js";
import {
  familyAge,
  familyCounterpart,
  familyPlace,
  flagPlace,
  selectClosedFamilies,
  selectFamilyRun,
  selectOpenFamilies,
} from "./scenario-families.js";
import type { Campaign } from "./state.js";
import type { CityId, NationId } from "@admin/world";

const ALP = "ALP" as NationId;
const USA = "USA" as NationId;

function deal(campaign: Campaign, effects: Parameters<typeof apply>[1]["effects"]): Campaign {
  return apply(campaign, {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    narration: { summary: "The arc moves." },
    effects,
  });
}

describe("an arc the campaign remembers", () => {
  it("pins the country at the opener and hands it to every later beat", () => {
    const campaign = buildCampaign();
    expect(familyCounterpart(campaign, "strait")).toBeUndefined();

    const opened = deal(campaign, [
      { kind: "scenarioFamily", open: { family: "strait", counterpart: ALP, scenario: "strait-1", turn: 1 } },
    ]);
    expect(familyCounterpart(opened, "strait")).toBe(ALP);
    expect(selectFamilyRun(opened, "strait")?.beats).toEqual(["strait-1"]);

    const later = deal({ ...opened, turn: 9 }, [
      { kind: "scenarioFamily", beat: { family: "strait", scenario: "strait-2", turn: 9 } },
    ]);
    // The ranking that chose ALP in week one is not consulted again: the arc is
    // about the country the president actually dealt with.
    expect(familyCounterpart(later, "strait")).toBe(ALP);
    expect(selectFamilyRun(later, "strait")?.beats).toEqual(["strait-1", "strait-2"]);
    expect(selectFamilyRun(later, "strait")?.lastTurn).toBe(9);
    expect(familyAge(later, "strait")).toBe(8);
  });

  it("will not re-pin a family already running, whatever a second opener says", () => {
    const campaign = buildCampaign();
    const opened = deal(campaign, [
      { kind: "scenarioFamily", open: { family: "strait", counterpart: ALP, scenario: "strait-1", turn: 1 } },
    ]);
    const again = deal(opened, [
      { kind: "scenarioFamily", open: { family: "strait", counterpart: USA, scenario: "strait-1b", turn: 4 } },
    ]);
    expect(familyCounterpart(again, "strait")).toBe(ALP);
    expect(selectFamilyRun(again, "strait")?.beats).toEqual(["strait-1", "strait-1b"]);
  });

  it("closes a family for good, and keeps the record of it", () => {
    const campaign = buildCampaign();
    const opened = deal(campaign, [
      { kind: "scenarioFamily", open: { family: "strait", counterpart: ALP, scenario: "strait-1", turn: 1 } },
    ]);
    expect(selectOpenFamilies(opened)).toHaveLength(1);

    const closed = deal(opened, [
      { kind: "scenarioFamily", beat: { family: "strait", scenario: "strait-3", turn: 12 } },
      { kind: "scenarioFamily", close: { family: "strait", turn: 12, disposition: "lost" } },
    ]);
    expect(selectOpenFamilies(closed)).toHaveLength(0);
    expect(selectFamilyRun(closed, "strait")?.disposition).toBe("lost");
    expect(selectClosedFamilies(closed).map((run) => run.family)).toEqual(["strait"]);
    // Closed, not deleted: what the administration lived through stays on the
    // campaign the way a settled war and a dead bill do.
    expect(selectFamilyRun(closed, "strait")?.beats).toEqual(["strait-1", "strait-3"]);
    expect(selectFamilyRun(closed, "strait")?.closedTurn).toBe(12);
    // And a closed family hands out no counterpart, so nothing more is dealt in it.
    expect(familyCounterpart(closed, "strait")).toBeUndefined();
  });

  it("ignores a beat or a close for a family that never opened", () => {
    const campaign = buildCampaign();
    const stray = deal(campaign, [
      { kind: "scenarioFamily", beat: { family: "nothing", scenario: "x", turn: 3 } },
      { kind: "scenarioFamily", close: { family: "nothing", turn: 3, disposition: "held" } },
    ]);
    expect(selectFamilyRun(stray, "nothing")).toBeUndefined();
  });

  it("keeps the opener's title, and never rewrites how an arc ended", () => {
    const campaign = buildCampaign();
    const opened = deal(campaign, [
      { kind: "scenarioFamily", open: { family: "strait", counterpart: ALP, scenario: "strait-1", turn: 1, title: "The strait closes at dawn" } },
    ]);
    const closed = deal(opened, [{ kind: "scenarioFamily", close: { family: "strait", turn: 6, disposition: "held" } }]);
    const again = deal(closed, [{ kind: "scenarioFamily", close: { family: "strait", turn: 9, disposition: "lapsed" } }]);
    expect(selectFamilyRun(again, "strait")).toMatchObject({ title: "The strait closes at dawn", closedTurn: 6, disposition: "held" });
  });

  it("lists what finished most recent first", () => {
    const campaign = buildCampaign();
    const two = deal(campaign, [
      { kind: "scenarioFamily", open: { family: "a", counterpart: ALP, scenario: "a-1", turn: 1 } },
      { kind: "scenarioFamily", open: { family: "b", counterpart: ALP, scenario: "b-1", turn: 1 } },
    ]);
    const closed = deal(two, [
      { kind: "scenarioFamily", close: { family: "a", turn: 4, disposition: "held" } },
      { kind: "scenarioFamily", close: { family: "b", turn: 8, disposition: "lost" } },
    ]);
    expect(selectClosedFamilies(closed).map((run) => run.family)).toEqual(["b", "a"]);
    expect(selectOpenFamilies(closed)).toEqual([]);
  });
});

describe("where at home a story happened", () => {
  const MOBILE = { state: "AL" as const, city: "CITY-USA-mobile" as CityId };

  it("keeps the opener's place for the family's later members while it runs, and drops it at the close", () => {
    const opened = deal(buildCampaign(), [
      { kind: "scenarioFamily", open: { family: "yard", counterpart: USA, scenario: "yard-1", turn: 1, place: MOBILE } },
    ]);
    expect(familyPlace(opened, "yard")).toEqual(MOBILE);
    const again = deal(opened, [
      { kind: "scenarioFamily", open: { family: "yard", counterpart: USA, scenario: "yard-1", turn: 2, place: { state: "TX" } } },
    ]);
    expect(familyPlace(again, "yard")).toEqual(MOBILE);
    const closed = deal(again, [{ kind: "scenarioFamily", close: { family: "yard", turn: 5, disposition: "held" } }]);
    expect(familyPlace(closed, "yard")).toBeUndefined();
    expect(selectFamilyRun(closed, "yard")?.place).toBeUndefined();
  });

  it("keeps one place per flag, the latest answer's, and forgets it when the flag is set again from no place", () => {
    const placed = deal(buildCampaign(), [{ kind: "scenarioFamily", callback: { flags: ["paid-the-yard"], place: MOBILE } }]);
    expect(flagPlace(placed, "paid-the-yard")).toEqual(MOBILE);
    const moved = deal(placed, [{ kind: "scenarioFamily", callback: { flags: ["paid-the-yard"], place: { state: "TX" } } }]);
    expect(flagPlace(moved, "paid-the-yard")).toEqual({ state: "TX" });
    const dropped = deal(moved, [{ kind: "scenarioFamily", callback: { flags: ["paid-the-yard"] } }]);
    expect(flagPlace(dropped, "paid-the-yard")).toBeUndefined();
    expect(dropped.flagPlaces).toEqual({});
  });

  it("round-trips both through a save", () => {
    const placed = deal(buildCampaign(), [
      { kind: "scenarioFamily", open: { family: "yard", counterpart: USA, scenario: "yard-1", turn: 1, place: MOBILE } },
      { kind: "scenarioFamily", callback: { flags: ["paid-the-yard"], place: MOBILE } },
    ]);
    const loaded = loadSave(JSON.parse(JSON.stringify(createSave(placed))));
    expect(familyPlace(loaded, "yard")).toEqual(MOBILE);
    expect(flagPlace(loaded, "paid-the-yard")).toEqual(MOBILE);
  });

  it("opens a v64 save with a family running and no places kept, as a family with no place", () => {
    const opened = deal(buildCampaign(), [
      { kind: "scenarioFamily", open: { family: "yard", counterpart: USA, scenario: "yard-1", turn: 1 } },
    ]);
    const older = JSON.parse(JSON.stringify({ schemaVersion: 64, campaign: opened }));
    const loaded = loadSave(older);
    expect(familyCounterpart(loaded, "yard")).toBe(USA);
    expect(familyPlace(loaded, "yard")).toBeUndefined();
    expect(loaded.flagPlaces).toBeUndefined();
  });
});

describe("a save written before the pin moved to the raise", () => {
  const roundTrip = (campaign: Campaign): Campaign => loadSave(JSON.parse(JSON.stringify(createSave(campaign))));
  const run = { family: "mill", counterpart: ALP, openedTurn: 0, lastTurn: 0, beats: ["mill-1"] };

  it("loads an open family as a running, answered arc with its follow-ups live", () => {
    const loaded = roundTrip({ ...buildCampaign(), scenarioFamilies: { mill: run } });
    expect(selectOpenFamilies(loaded).map((entry) => entry.family)).toEqual(["mill"]);
    expect(familyCounterpart(loaded, "mill")).toBe(ALP);
  });

  it("keeps an unanswered pin through a save and load", () => {
    const loaded = roundTrip({ ...buildCampaign(), scenarioFamilies: { mill: { ...run, unanswered: true, place: { state: "OH" as never } } } });
    expect(selectFamilyRun(loaded, "mill")).toMatchObject({ unanswered: true, place: { state: "OH" } });
    expect(selectOpenFamilies(loaded)).toEqual([]);
  });
});
