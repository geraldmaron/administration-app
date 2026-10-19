import { compareDates, selectDateOfTurn, type Campaign, type FeedItem, type GameDate } from "@admin/engine";
import { buildCalendar } from "../calendar/build";
import type { CalendarEvent, CalendarUrgency, EntityRef } from "../calendar/types";
import { dateKey } from "../calendar/window";
import type { AttentionPolicySettings } from "../desk/attention";
import { waitingOnYou, type BriefMatter } from "../desk/brief-matters";
import { PLACES, place } from "../navigation/places";
import { rankedFeed } from "../world/feed-rank";
import { refsFromHref } from "./refs";

/**
 * The notification center: what is waiting at the desk, what the world did
 * that the President should know, and what is coming up on the calendar.
 *
 * Derived on read. Read state is the caller's (`seen`), kept in preferences by
 * the app, so opening the inbox never writes to the campaign. A desk row is
 * never read: it is listed only while it is still owed, and opening it does
 * not answer it, so it counts until it leaves the desk.
 */

export type InboxSource = "desk" | "news" | "calendar";

export type InboxItem = {
  /** Stable across reads of the same campaign, so seen state keyed on it persists. */
  readonly id: string;
  readonly source: InboxSource;
  readonly title: string;
  readonly summary: string;
  readonly urgency: CalendarUrgency;
  readonly date: GameDate;
  readonly href?: string;
  /** Seen, for news and calendar rows; always false for a desk row, which counts until it is answered. */
  readonly read: boolean;
  /** Whether it waits on the President's answer, as against telling them something. */
  readonly actionable: boolean;
  readonly entityRefs: readonly EntityRef[];
};

export type Inbox = {
  readonly items: readonly InboxItem[];
  readonly unread: number;
  /** Unread items at each urgency. */
  readonly byUrgency: Readonly<Record<CalendarUrgency, number>>;
};

export type InboxSettings = {
  /** The player's desk settings, so the inbox and the desk agree on what is owed. */
  readonly attention?: AttentionPolicySettings;
  /** How many days ahead the calendar reaches into the inbox. */
  readonly calendarDays?: number;
  /** How many weeks of the wire are read for stories worth a notification. */
  readonly feedWeeks?: number;
  /** At most this many stories. */
  readonly feedLimit?: number;
};

export const INBOX_DEFAULTS = { calendarDays: 7, feedWeeks: 1, feedLimit: 5 } as const;

/** The kinds of story that change the world rather than describe it: wars, crises, moves against a government. */
const SALIENT_FEED: ReadonlySet<FeedItem["kind"]> = new Set(["conflict", "pursuit", "condition", "operator"]);

type Unread = Omit<InboxItem, "read">;

function deskItem(campaign: Campaign, matter: BriefMatter): Unread {
  // A dated matter that comes due again on a new date is a new notice, not one already read.
  const dated = matter.due ? `:${dateKey(matter.due)}` : "";
  return {
    id: `desk:${matter.id}${dated}`,
    source: "desk",
    title: matter.title,
    summary: matter.reason,
    urgency: matter.urgency,
    date: matter.due ?? campaign.calendar,
    ...(matter.href ? { href: matter.href } : {}),
    actionable: true,
    entityRefs: refsFromHref(matter.href),
  };
}

/** FNV-1a: a feed item carries no id, so its identity is a hash of what it says and when. */
function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function newsItem(campaign: Campaign, item: FeedItem): Unread {
  const home = campaign.founding.nation;
  const abroad = [item.target, item.actor].find((nation) => nation !== undefined && nation !== home);
  const refs: readonly EntityRef[] = [item.actor, item.target]
    .filter((nation, index, all): nation is NonNullable<typeof nation> => nation !== undefined && all.indexOf(nation) === index)
    .map((nation) => ({ kind: "nation", id: nation }));
  return {
    id: `news:${item.turn}:${hashText(`${item.kind}|${item.headline}|${item.actor ?? ""}|${item.target ?? ""}`)}`,
    source: "news",
    title: item.headline,
    summary: item.facts?.stake ?? item.headline,
    urgency: "ambient",
    date: item.date ?? selectDateOfTurn(campaign, item.turn),
    href: abroad ? place.country(abroad) : place.press(),
    actionable: false,
    entityRefs: refs,
  };
}

function newsItems(campaign: Campaign, weeks: number, limit: number): readonly Unread[] {
  const recent = campaign.feed.filter((item) => item.turn >= campaign.turn - weeks && SALIENT_FEED.has(item.kind));
  return rankedFeed(campaign, recent).slice(0, limit).map((item) => newsItem(campaign, item));
}

function calendarItem(event: CalendarEvent): Unread {
  return {
    id: `calendar:${event.id}`,
    source: "calendar",
    title: event.title,
    summary: event.lapse ?? event.detail ?? event.title,
    urgency: event.urgency,
    date: event.date,
    ...(event.href ? { href: event.href } : {}),
    actionable: event.urgency !== "ambient",
    entityRefs: event.entityRefs,
  };
}

/** A screen's own root is shared by many rows; only a door to one particular thing identifies a matter. */
const ROOT_HREFS: ReadonlySet<string> = new Set(Object.values(PLACES).map((entry) => entry.href));

/**
 * Whether the desk already raises this date.
 *
 * Three ways one obligation shows up on both: the desk's clock row for the same
 * instance (same summons kind, same title — the summons names one instance), a
 * case the desk seated over the same subject, or a door to the same particular
 * thing.
 */
function raisedAtDesk(event: CalendarEvent, matters: readonly BriefMatter[]): boolean {
  return matters.some(
    (matter) =>
      (event.summons !== undefined && matter.id === `summons:${event.summons}` && matter.title === event.title) ||
      event.entityRefs.some((ref) => matter.id === `case:${ref.id}`) ||
      (event.href !== undefined && !ROOT_HREFS.has(event.href) && matter.href === event.href),
  );
}

/** The calendar's near dates, less the ones the desk already raises. */
function calendarItems(campaign: Campaign, days: number, matters: readonly BriefMatter[]): readonly Unread[] {
  return buildCalendar(campaign, { horizonDays: days })
    .filter((event) => !raisedAtDesk(event, matters))
    .map(calendarItem);
}

const URGENCY_RANK: Readonly<Record<CalendarUrgency, number>> = { hard: 0, soft: 1, ambient: 2 };

function compareItems(a: InboxItem, b: InboxItem): number {
  return (
    URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
    Number(b.actionable) - Number(a.actionable) ||
    compareDates(a.date, b.date) ||
    a.id.localeCompare(b.id)
  );
}

function countUnread(items: readonly InboxItem[]): Inbox["byUrgency"] {
  const unread = items.filter((item) => !item.read);
  return {
    hard: unread.filter((item) => item.urgency === "hard").length,
    soft: unread.filter((item) => item.urgency === "soft").length,
    ambient: unread.filter((item) => item.urgency === "ambient").length,
  };
}

/** Everything the notification center holds, worst first, with read state applied from `seen`. */
export function buildInbox(campaign: Campaign, seen: ReadonlySet<string>, settings: InboxSettings = {}): Inbox {
  const { matters } = waitingOnYou(campaign, settings.attention);
  const unique = new Map<string, Unread>();
  const all = [
    ...matters.map((matter) => deskItem(campaign, matter)),
    ...newsItems(campaign, settings.feedWeeks ?? INBOX_DEFAULTS.feedWeeks, settings.feedLimit ?? INBOX_DEFAULTS.feedLimit),
    ...calendarItems(campaign, settings.calendarDays ?? INBOX_DEFAULTS.calendarDays, matters),
  ];
  for (const item of all) if (!unique.has(item.id)) unique.set(item.id, item);
  const items = [...unique.values()].map((item) => ({ ...item, read: item.source !== "desk" && seen.has(item.id) })).sort(compareItems);
  const byUrgency = countUnread(items);
  return { items, unread: byUrgency.hard + byUrgency.soft + byUrgency.ambient, byUrgency };
}

/** The seen set with `ids` added. A new set: the caller's is never touched. */
export function markSeen(seen: ReadonlySet<string>, ids: Iterable<string>): ReadonlySet<string> {
  return new Set([...seen, ...ids]);
}

/**
 * The seen set kept to ids the inbox still holds, so the stored preference
 * does not grow for the length of a presidency.
 */
export function pruneSeen(seen: ReadonlySet<string>, inbox: Inbox): ReadonlySet<string> {
  const live = new Set(inbox.items.map((item) => item.id));
  return new Set([...seen].filter((id) => live.has(id)));
}

