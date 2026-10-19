import { describe, expect, it } from "vitest";
import type { Campaign, FeedItem } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { dispatchReading, pressLandscape, wireRows } from "./landscape";

const opening = openingCampaign();
const foreign = Object.keys(opening.nations).find((id) => id !== opening.founding.nation)!;

function item(over: Partial<FeedItem>): FeedItem {
  return { turn: 1, kind: "npc-action", visibility: "public", headline: "A rival moved.", ...over } as FeedItem;
}

const campaign: Campaign = {
  ...opening,
  feed: [
    item({ headline: "A quiet first week." }),
    item({ turn: 3, headline: "Secret item.", visibility: "intelligence", actor: foreign as never }),
    item({ turn: 2, headline: "A neighbor moved.", actor: foreign as never }),
    item({ turn: 4, headline: "The order took effect.", kind: "player-action" }),
  ],
};

describe("the press landscape", () => {
  it("places every desk by reach and warmth, widest first, both inside 0..1", () => {
    const desks = pressLandscape(campaign);
    expect(desks.length).toBeGreaterThan(5);
    expect(desks[0]!.reach).toBe(1);
    for (const desk of desks) {
      expect(desk.reach).toBeGreaterThan(0);
      expect(desk.reach).toBeLessThanOrEqual(1);
      expect(desk.warmth).toBeGreaterThanOrEqual(0);
      expect(desk.warmth).toBeLessThanOrEqual(1);
    }
    expect(desks.map((desk) => desk.reach)).toEqual([...desks.map((desk) => desk.reach)].sort((a, b) => b - a));
  });
});

describe("the wire", () => {
  it("lists every item newest first at its feed address, each with its genre and source", () => {
    const rows = wireRows(campaign);
    expect(rows.map((row) => row.headline)).toEqual(["The order took effect.", "Secret item.", "A neighbor moved.", "A quiet first week."]);
    expect(rows.map((row) => row.index)).toEqual([3, 1, 2, 0]);
    expect(rows.map((row) => row.genre)).toEqual(["official", "intelligence", "journalism", "journalism"]);
    expect(rows[1]!.source).toBe("Intelligence community");
  });
});

describe("a dispatch", () => {
  it("writes a news report in the desk's voice and names the other government as a related file", () => {
    const reading = dispatchReading(campaign, 2)!;
    expect(reading.article.headline).toBe("A neighbor moved.");
    // An item with nothing but a headline and an actor reads as a short plain
    // piece naming the event, not one padded out to a set length.
    expect(reading.article.paragraphs.length).toBeGreaterThanOrEqual(1);
    expect(reading.article.paragraphs.join(" ")).toContain("a neighbor moved");
    expect(reading.genre).toBe("journalism");
    expect(reading.related.map((link) => link.href)).toEqual([`/world/nation/${foreign}`]);
    expect(reading.earlier.map((story) => story.index)).toEqual([]);
    expect(dispatchReading(campaign, 0)!.related).toEqual([]);
  });

  it("opens an intelligence summary under its own genre, with no masthead stance", () => {
    const reading = dispatchReading(campaign, 1)!;
    expect(reading.genre).toBe("intelligence");
    expect(reading.source).toBe("Intelligence community");
    expect(reading.stanceWord).toBeUndefined();
  });

  it("opens nothing for an address the feed does not hold", () => {
    expect(dispatchReading(campaign, 99)).toBeUndefined();
    expect(dispatchReading(campaign, -1)).toBeUndefined();
    expect(dispatchReading(campaign, Number.NaN)).toBeUndefined();
  });
});
