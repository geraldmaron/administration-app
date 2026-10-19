// The week's wire, bounded: the cap, the regional fold, and the two classes of
// item that may never be folded.
//
// Counted by date over the seven days from the week's open, not per call and not
// per day, because the wire is spread across the week: a per-call cap would let
// each of forty producers file twelve, and a per-day cap would cut the one busy
// day that was the whole week's news.
import { describe, expect, it } from "vitest";
import { addDays } from "./clock.js";
import { WEEKLY_FEED_CAP, appendWithinCap, weekOpenDate, weeklyVisibleCount } from "./feed-cap.js";
import { apply } from "./effects.js";
import { buildCampaign, nationA } from "./__fixtures__/campaign.js";
import type { NationId } from "@admin/world";
import type { Campaign, FeedItem } from "./state.js";

const HOME = nationA.id;
const ABROAD = "ALP" as NationId;

/** A foreign story that is not the world's background, so it competes on the total alone. */
function item(over: Partial<FeedItem> = {}): FeedItem {
  return { turn: 2, kind: "governance", visibility: "public", headline: "Something happened.", target: ABROAD, ...over };
}

/** The world going about its business, which has a tighter share of the week. */
function background(over: Partial<FeedItem> = {}): FeedItem {
  return item({ kind: "npc-action", ...over });
}

/** A home onset, which the fold may never refuse. */
function homeOnset(headline: string): FeedItem {
  return item({ kind: "condition", target: HOME, headline, facts: { phase: "onset" } });
}

function fresh(): Campaign {
  return { ...buildCampaign(), feed: [], feedDigest: [] };
}

/** The shared fixture's region is a numbered placeholder; the fold names a dataset region slug. */
function inNamedRegion(campaign: Campaign): Campaign {
  const abroad = campaign.nations[ABROAD]!;
  const geo = { ...abroad.base.geo, region: "region-southern-africa" as typeof abroad.base.geo.region };
  return { ...campaign, nations: { ...campaign.nations, [ABROAD]: { ...abroad, base: { ...abroad.base, geo } } } };
}

/** Files items straight through the cap, dated today, the way `applyFeed` does. */
function file(campaign: Campaign, items: readonly FeedItem[]): Campaign {
  return appendWithinCap(
    campaign,
    items.map((entry) => ({ ...entry, turn: campaign.turn, date: campaign.calendar })),
  );
}

describe("the week's cap", () => {
  it("carries the cap and digests the rest", () => {
    const filled = file(
      fresh(),
      Array.from({ length: WEEKLY_FEED_CAP + 5 }, (_, at) => item({ headline: `Story ${at}` })),
    );
    expect(filled.feed).toHaveLength(WEEKLY_FEED_CAP);
    expect(weeklyVisibleCount(filled)).toBe(WEEKLY_FEED_CAP);
    const digested = (filled.feedDigest ?? []).reduce((sum, week) => sum + week.count, 0);
    expect(digested).toBe(5);
  });

  it("counts the week rather than the call, so forty producers cannot each file twelve", () => {
    let working = fresh();
    for (let call = 0; call < 5; call += 1) {
      working = file(working, Array.from({ length: 5 }, (_, at) => item({ headline: `Call ${call} story ${at}` })));
    }
    expect(weeklyVisibleCount(working)).toBe(WEEKLY_FEED_CAP);
  });

  it("counts the week rather than the day, so a busy Thursday is not cut for being one day", () => {
    let working = fresh();
    // Four days of two items each, inside the same week. Eight is under the cap
    // and every one of them is carried.
    for (let day = 0; day < 4; day += 1) {
      working = { ...working, calendar: addDays(working.calendar, 1) };
      working = file(working, [item(), item()]);
    }
    expect(weeklyVisibleCount(working)).toBe(8);
  });

  it("starts the count again when the week does", () => {
    const first = file(
      fresh(),
      Array.from({ length: WEEKLY_FEED_CAP }, () => item()),
    );
    expect(weeklyVisibleCount(first)).toBe(WEEKLY_FEED_CAP);
    const nextWeek = { ...first, turn: first.turn + 1, calendar: addDays(first.calendar, 7) };
    const second = file(nextWeek, [item({ headline: "A new week." })]);
    expect(weeklyVisibleCount(second)).toBe(1);
    expect(second.feed).toHaveLength(WEEKLY_FEED_CAP + 1);
  });

  it("leaves an intelligence read out of the count entirely", () => {
    const filled = file(
      fresh(),
      Array.from({ length: 30 }, () => item({ visibility: "intelligence" })),
    );
    expect(filled.feed).toHaveLength(30);
    expect(weeklyVisibleCount(filled)).toBe(0);
  });
});

describe("what the fold may never touch", () => {
  it("carries a home onset past the cap", () => {
    const filled = file(fresh(), [
      ...Array.from({ length: WEEKLY_FEED_CAP }, () => item()),
      homeOnset("A wildfire at home."),
    ]);
    expect(filled.feed.some((entry) => entry.headline === "A wildfire at home.")).toBe(true);
  });

  it("does not protect a home condition's later weeks, which are ordinary wire volume", () => {
    const filled = file(fresh(), [
      ...Array.from({ length: WEEKLY_FEED_CAP }, () => item()),
      item({ kind: "condition", target: HOME, headline: "Still burning.", facts: { phase: "easing" } }),
    ]);
    expect(filled.feed.some((entry) => entry.headline === "Still burning.")).toBe(false);
  });

  it("carries everything the player did, past the cap", () => {
    const filled = file(
      fresh(),
      [
        ...Array.from({ length: WEEKLY_FEED_CAP }, () => item()),
        item({ kind: "player-action", target: undefined, headline: "The President signed an order." }),
      ],
    );
    expect(filled.feed.some((entry) => entry.headline === "The President signed an order.")).toBe(true);
  });
});

describe("foreign weather folds by region", () => {
  it("keeps the first one as its own story and rolls the rest into one line", () => {
    const filled = file(
      inNamedRegion(fresh()),
      Array.from({ length: 4 }, (_, at) => item({ kind: "condition", headline: `Disaster ${at}.` })),
    );
    const conditions = filled.feed.filter((entry) => entry.kind === "condition");
    expect(conditions).toHaveLength(1);
    expect(conditions[0]!.headline).toMatch(/Four countries in Southern Africa are facing a disaster or a crisis/);
    expect(conditions[0]!.headline).toMatch(/in Southern Africa are facing/);
    const digested = (filled.feedDigest ?? []).reduce((sum, week) => sum + week.count, 0);
    expect(digested).toBe(3);
  });

  it("does not fold a home condition into the regional line", () => {
    const filled = file(fresh(), [
      item({ kind: "condition", headline: "A flood abroad." }),
      homeOnset("A flood at home."),
      item({ kind: "condition", headline: "Another flood abroad." }),
    ]);
    const headlines = filled.feed.map((entry) => entry.headline);
    expect(headlines).toContain("A flood at home.");
    expect(headlines.filter((line) => /flood abroad/.test(line))).toHaveLength(0);
    expect(filled.feed.filter((entry) => entry.kind === "condition")).toHaveLength(2);
  });

  it("names the region and the kinds in the digest, and nothing more", () => {
    const filled = file(
      fresh(),
      Array.from({ length: 3 }, () => item({ kind: "condition" })),
    );
    const week = (filled.feedDigest ?? [])[0]!;
    expect(week.turn).toBe(filled.turn);
    expect(week.region).toBeTruthy();
    expect(week.kinds).toEqual(["condition"]);
    expect(Object.keys(week).sort()).toEqual(["count", "kinds", "region", "turn"]);
  });
});

describe("the week's own open", () => {
  // Day 1 of the presidency is the day after the oath, so the first office week
  // runs from there; the oath morning itself has no week behind it and reads as
  // the founding day, which is the floor.
  const firstDay = { ...fresh(), calendar: addDays(fresh().calendar, 1) };

  it("is the same day for every day of one office week", () => {
    const open = weekOpenDate(firstDay);
    for (const day of [1, 2, 3, 4, 5, 6]) {
      expect(weekOpenDate({ ...firstDay, calendar: addDays(firstDay.calendar, day) })).toEqual(open);
    }
  });

  it("moves when the week does", () => {
    const next = { ...firstDay, calendar: addDays(firstDay.calendar, 7) };
    expect(weekOpenDate(next)).not.toEqual(weekOpenDate(firstDay));
  });

  it("never reads earlier than the oath", () => {
    const base = fresh();
    expect(weekOpenDate(base)).toEqual(base.calendar);
  });
});

describe("the cap reaches the feed through apply(), so no producer has to know it", () => {
  it("bounds a week filed as effects", () => {
    const working = Array.from({ length: 20 }, (_, at) => at).reduce(
      (state, at) =>
        apply(state, {
          source: "simulate",
          actor: "world",
          turn: state.turn,
          narration: { summary: `Filed ${at}.` },
          effects: [{ kind: "feed", items: [item({ headline: `Filed ${at}.` })] }],
        }),
      fresh(),
    );
    expect(weeklyVisibleCount(working)).toBe(WEEKLY_FEED_CAP);
    expect((working.feedDigest ?? []).reduce((sum, week) => sum + week.count, 0)).toBe(8);
  });
});

describe("the world's background has a tighter share than the week", () => {
  it("stops the world's own moves at half the week, so a rare story always has room", () => {
    const filled = file(fresh(), Array.from({ length: 20 }, (_, at) => background({ headline: `Move ${at}.` })));
    expect(weeklyVisibleCount(filled)).toBe(6);
  });

  it("lets a coalition forming and a war opening through a week that is already full", () => {
    const filled = file(fresh(), [
      ...Array.from({ length: 20 }, (_, at) => item({ headline: `Story ${at}.` })),
      item({ kind: "bloc", headline: "Fifty-nine capitals are talking to each other about China." }),
      item({ kind: "conflict", headline: "A war opens." }),
    ]);
    expect(filled.feed.some((entry) => entry.kind === "bloc")).toBe(true);
    expect(filled.feed.some((entry) => entry.kind === "conflict")).toBe(true);
  });

  it("still holds the total, whatever the mix", () => {
    const filled = file(fresh(), [
      ...Array.from({ length: 10 }, (_, at) => background({ headline: `Move ${at}.` })),
      ...Array.from({ length: 10 }, (_, at) => item({ headline: `Story ${at}.` })),
    ]);
    expect(weeklyVisibleCount(filled)).toBe(WEEKLY_FEED_CAP);
  });
});
