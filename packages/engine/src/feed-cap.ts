import { addDays, campaignFoundingDate, compareDates, dayOfWeekInOffice } from "./clock.js";
import type { Campaign, FeedDigestWeek, FeedItem, GameDate } from "./state.js";

// What the player is told, bounded.
//
// The feed was append-only and unbounded, and disasters were 71% of it. A
// player opening the wire in week forty read a hundred and ten lines, most of
// them a flood in a country they will never visit, and the one line about their
// own administration sat somewhere in the middle of it. Two things were wrong
// and only one of them was volume: the other was that a week of the world's
// weather is one fact and it was being told as thirty.
//
// So the rule here has two halves. Foreign weather is folded by region, which
// is how a newspaper would carry it — "three disasters across Europe" is the
// story, and each one separately is a list. Then whatever is still over the
// week's cap goes into the digest: a count, a region and the kinds, which is
// enough to say later what a week was like and small enough that a campaign's
// whole term fits in a save.
//
// What is never folded is stated once, here, because it is the whole safety
// property: a condition at home, and anything the player did or was asked to
// do. Those are the items the Desk builds its rows from, and a fold that could
// swallow one would be a fold that could lose a matter.

/**
 * The most public items one week of the wire may carry.
 *
 * Twelve, which is about a broadsheet's front and second page. The cap counts a
 * week rather than a day because the wire is spread across the week now: a
 * per-call or per-day cap would let seven quiet days add up to a wall and would
 * cut a busy Thursday that was the whole week's news.
 */
export const WEEKLY_FEED_CAP = 12;

/**
 * The kinds that are the world going about its business, and the most of the
 * week they may take between them.
 *
 * Half, because a cap that was first-come-first-served turned out to be a cap on
 * whichever system ran first in the phase sequence. The world's own moves are
 * filed by the dozen every week and coalitions form nine times in two terms, so
 * the twelve slots went entirely to foreign moves and drift, and a coalition of
 * fifty-nine capitals forming around China reached the player not once. Arrival
 * order is a fact about the phase list; it is not an editorial judgment, and the
 * cap has to make one.
 *
 * The rule cannot be "digest the lowest-priority item already carried" instead:
 * the day loop reads the week's new items as the tail of the feed by its length
 * before the advance, so removing an item the feed already holds would move that
 * window off by one.
 */
const BACKGROUND_KINDS: ReadonlySet<FeedItem["kind"]> = new Set(["npc-action", "drift", "operator"]);
const BACKGROUND_SHARE = 6;

/** The first day of the week the campaign is standing in. */
export function weekOpenDate(campaign: Campaign): GameDate {
  const founding = campaignFoundingDate(campaign);
  const day = dayOfWeekInOffice(campaign);
  const open = addDays(campaign.calendar, -(day - 1));
  // A campaign on its oath morning has no week behind it; the founding day is
  // the earliest an item can be dated.
  return compareDates(open, founding) < 0 ? founding : open;
}

/** Whether an item was filed inside the week that is currently open. */
function inThisWeek(item: FeedItem, open: GameDate, turn: number): boolean {
  // An item written before the day was kept reads by its week, which is the one
  // fact its turn still carries.
  if (!item.date) return item.turn >= turn;
  return compareDates(item.date, open) >= 0;
}

/**
 * The kinds that happen a handful of times in a presidency and change the shape
 * of the world when they do.
 *
 * A war opening and a coalition of capitals forming are single-digit events over
 * two terms, and a cap that could swallow one would be the wire deciding, on
 * arrival order, that the player does not need to know a war started. They are
 * carried whatever the week holds, and they still spend a slot.
 */
const STRUCTURAL_KINDS: ReadonlySet<FeedItem["kind"]> = new Set(["conflict", "bloc"]);

/**
 * Items the fold may never refuse.
 *
 * Anything the player did, a condition ARRIVING in their own country, and the
 * structural kinds above. The first is the record of their own week; the second
 * is how a president finds out they have an emergency; the third is the world
 * changing shape. A fold that could swallow any of them would be a fold that
 * could lose a matter, and the Desk builds its rows from the first two.
 *
 * A home condition's *later* weeks are not here. A wildfire that has been
 * burning for six weeks files a line every week saying so, and those lines are
 * ordinary wire volume — the arrival is the news.
 *
 * Everything at a visibility other than public is out of scope entirely: the cap
 * is a cap on what the player reads on the wire, and an intelligence read is not
 * on the wire.
 */
function isProtected(item: FeedItem, home: string): boolean {
  if (item.kind === "player-action" || STRUCTURAL_KINDS.has(item.kind)) return true;
  return item.kind === "condition" && item.target === home && item.facts?.phase === "onset";
}

/** Which region a foreign item belongs to, for the purpose of folding it. */
function regionOf(campaign: Campaign, item: FeedItem): string {
  const nation = item.target ?? item.actor;
  const runtime = nation ? campaign.nations[nation] : undefined;
  return runtime?.base.geo.region ?? "region-unplaced";
}

/** The digest, with one week-and-region record added to or opened. */
function withDigested(
  digest: readonly FeedDigestWeek[],
  turn: number,
  region: string,
  kind: string,
): readonly FeedDigestWeek[] {
  const index = digest.findIndex((week) => week.turn === turn && week.region === region);
  if (index === -1) return [...digest, { turn, region, count: 1, kinds: [kind] }];
  const week = digest[index]!;
  const kinds = week.kinds.includes(kind) ? week.kinds : [...week.kinds, kind];
  return digest.map((entry, at) => (at === index ? { ...week, count: week.count + 1, kinds } : entry));
}

// The world regions a sentence names with an article: "across the
// Caribbean", never "across Caribbean".
const ARTICLED_REGIONS: ReadonlySet<string> = new Set(["Caribbean", "Middle East", "Caucasus"]);

/** A region slug as a sentence names it: "region-middle-east" is "the Middle East"; an unplaced item has no region to name. */
export function regionPhrase(region: string): string | undefined {
  if (region === "region-unplaced") return undefined;
  const name = region
    .replace(/^region-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return ARTICLED_REGIONS.has(name) ? `the ${name}` : name;
}

const COUNT_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

/**
 * The regional roll-up line a second foreign condition rewrites the first into.
 *
 * The fold takes every foreign condition, so the line cannot call them all
 * disasters: a recession and civil unrest fold beside a flood. It says what the
 * fold knows — how many countries, where — and no more.
 */
function foldedHeadline(count: number, region: string): string {
  const many = COUNT_WORDS[count] ?? String(count);
  const where = regionPhrase(region);
  return where ? `${many} countries in ${where} are facing a disaster or a crisis this week.` : `${many} countries are facing a disaster or a crisis this week.`;
}

type Fold = {
  readonly feed: readonly FeedItem[];
  readonly digest: readonly FeedDigestWeek[];
};

/**
 * Where in the feed the open week starts.
 *
 * Scanned from the end rather than filtered over the whole list: the feed is
 * append-ordered and a campaign's is thousands of items long, and the cap is
 * consulted for every item every phase files. Filtering the whole feed each
 * time made the cost of telling the player something quadratic in how much they
 * had already been told.
 */
function weekStartIndex(feed: readonly FeedItem[], open: GameDate, turn: number): number {
  let index = feed.length;
  while (index > 0 && inThisWeek(feed[index - 1]!, open, turn)) index -= 1;
  return index;
}

/**
 * Fold one foreign condition item into this week's line for its region.
 *
 * The first one of a week keeps its own headline, because one disaster in
 * Europe is a story about a country. The second rewrites that line into the
 * regional roll-up and every later one increments it, so the week carries one
 * line however many countries were struck. The items that did not get a line
 * are not lost: each is counted in the digest.
 */
function foldForeignCondition(state: Fold, item: FeedItem, region: string, turn: number, open: GameDate): Fold {
  const from = weekStartIndex(state.feed, open, turn);
  const found = state.feed
    .slice(from)
    .findIndex(
      (existing) =>
        existing.kind === "condition" &&
        existing.visibility === "public" &&
        existing.facts?.topicTags?.includes(regionTag(region)),
    );
  const index = found === -1 ? -1 : from + found;
  if (index === -1) {
    return { ...state, feed: [...state.feed, taggedForFold(item, region, 1)] };
  }
  const existing = state.feed[index]!;
  const count = Number(existing.facts?.figure ?? "1") + 1;
  return {
    feed: state.feed.map((entry, at) =>
      at === index
        ? { ...taggedForFold(entry, region, count), headline: foldedHeadline(count, region) }
        : entry,
    ),
    digest: withDigested(state.digest, turn, region, item.kind),
  };
}

/** The tag the fold finds its own line by, and the running count it carries. */
function regionTag(region: string): string {
  return `fold:${region}`;
}

function taggedForFold(item: FeedItem, region: string, count: number): FeedItem {
  const facts = item.facts ?? {};
  const tags = facts.topicTags ?? [];
  return {
    ...item,
    facts: {
      ...facts,
      figure: String(count),
      topicTags: tags.includes(regionTag(region)) ? tags : [...tags, regionTag(region)],
    },
  };
}

/**
 * Append a week's items under the cap, folding what does not fit.
 *
 * Applied one item at a time and in order, so the twelfth item of a week is
 * carried and the thirteenth is digested — never the other way round because of
 * how a phase happened to batch its effects.
 */
export function appendWithinCap(campaign: Campaign, items: readonly FeedItem[]): Campaign {
  const open = weekOpenDate(campaign);
  const home = campaign.founding.nation as string;
  let state: Fold = { feed: campaign.feed, digest: campaign.feedDigest ?? [] };
  for (const item of items) {
    // Not on the wire at all: carried whole, counted against nothing.
    if (item.visibility !== "public") {
      state = { ...state, feed: [...state.feed, item] };
      continue;
    }
    const region = regionOf(campaign, item);
    // Foreign weather folds by region before it is ever offered a slot, because
    // a week of it is one story: a line that folded into another line is not a
    // second item and must not spend a second slot.
    if (item.kind === "condition" && item.target !== home) {
      const folded = foldForeignCondition(state, item, region, item.turn, open);
      if (folded.feed.length === state.feed.length) {
        state = folded;
        continue;
      }
      // It is the week's first line for its region, so it competes like anything
      // else — with the line the fold already tagged, not the raw item.
      state = carry(state, folded.feed[folded.feed.length - 1]!, region, open, home);
      continue;
    }
    state = carry(state, item, region, open, home);
  }
  return { ...campaign, feed: state.feed, feedDigest: state.digest };
}

/**
 * One item against the week's room: carried, or counted in the digest.
 *
 * A protected item is carried whatever the count and still SPENDS a slot, which
 * is what keeps the week at the cap without ever refusing the two things that may
 * not be refused. A week can only run over twelve if the President personally did
 * more than twelve things in it, and that is the player's own doing.
 */
function carry(state: Fold, item: FeedItem, region: string, open: GameDate, home: string): Fold {
  if (isProtected(item, home)) return { ...state, feed: [...state.feed, item] };
  const from = weekStartIndex(state.feed, open, item.turn);
  let carried = 0;
  let background = 0;
  for (let at = from; at < state.feed.length; at += 1) {
    const existing = state.feed[at]!;
    if (existing.visibility !== "public") continue;
    carried += 1;
    if (BACKGROUND_KINDS.has(existing.kind)) background += 1;
  }
  const room = carried < WEEKLY_FEED_CAP && (!BACKGROUND_KINDS.has(item.kind) || background < BACKGROUND_SHARE);
  return room
    ? { ...state, feed: [...state.feed, item] }
    : { ...state, digest: withDigested(state.digest, item.turn, region, item.kind) };
}

/**
 * How many public items the week that is open is carrying, which is the figure
 * the cap is about and the one a test asserts.
 */
export function weeklyVisibleCount(campaign: Campaign): number {
  const open = weekOpenDate(campaign);
  const from = weekStartIndex(campaign.feed, open, campaign.turn);
  return campaign.feed.slice(from).filter((item) => item.visibility === "public").length;
}
