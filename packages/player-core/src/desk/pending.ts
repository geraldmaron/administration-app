import { daysBetween, type AttentionUrgency, type Campaign, type GameDate } from "@admin/engine";
import { anchored, place } from "../navigation/places";
import { runningClocks } from "../summons/running-index";
import { warPowersHome } from "../world/war-powers-home";
import type { MetricStance } from "../format/figures";
import { attentionRows } from "./attention";
import type { AttentionItem } from "./attention-row";

// What the game is waiting on, each with the time it has left.
//
// Read off the same producers that raise the Desk's rows, not a second list:
// a row that names the day it is due is a wait, and anything waiting that a
// producer does not raise is a producer to write, not a case to add here.
// The constitutional calendar is left out on purpose: an election is a date,
// not something anyone is working on.

export type PendingItem = {
  readonly id: string;
  readonly title: string;
  /** What is happening and when it ends, in one plain sentence. */
  readonly line: string;
  /** Who the President is waiting on, where the row says. */
  readonly waitingOn?: string;
  /** Every page the wait belongs on (`nation:CN`, `person:…`, `treaty:…`, `sector:steel`). */
  readonly about: readonly string[];
  readonly href: string;
  readonly icon?: string;
  readonly stance: MetricStance;
  readonly urgency: AttentionUrgency;
  readonly dueDate: GameDate;
  readonly opened?: GameDate;
  /** Game days until it is due, from today's date. Zero or below means due now. */
  readonly daysLeft: number;
  /** How long the whole wait is, in days, where its start is known. */
  readonly windowDays?: number;
  /** How much of the wait is gone, 0 to 1, where the start or a statutory window is known. */
  readonly progress?: number;
  /** Whether its arrival or its deadline stops Continue. */
  readonly stops: boolean;
};

/**
 * The answers the advance stops for the week they come back: a finding, a
 * Senate or congressional vote, an operation's first report. Their rows stay
 * ambient so the stop happens once rather than holding Continue on news.
 */
const STOPS_ON_ARRIVAL = ["finding:", "issued-treaty:", "issued-aumf:", "instrument:"] as const;

function stopsOnArrival(id: string): boolean {
  return STOPS_ON_ARRIVAL.some((prefix) => id.startsWith(prefix));
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

type Window = { readonly days?: number; readonly progress?: number };

function windowOf(row: AttentionItem, today: GameDate, statutory: ReadonlyMap<string, { readonly length: number; readonly consumed: number }>): Window {
  if (row.opened !== undefined && row.dueDate !== undefined) {
    const days = daysBetween(row.opened, row.dueDate);
    if (days > 0) return { days, progress: clamp01(daysBetween(row.opened, today) / days) };
  }
  if (row.clock?.kind === "statutory" && row.clock.window > 0) return { progress: clamp01(row.clock.consumed / row.clock.window) };
  const clock = row.summons ? statutory.get(row.summons) : undefined;
  if (clock && clock.length > 0) return { progress: clamp01(clock.consumed / clock.length) };
  return {};
}

function pendingOf(row: AttentionItem, today: GameDate, statutory: ReadonlyMap<string, { readonly length: number; readonly consumed: number }>): PendingItem {
  const window = windowOf(row, today, statutory);
  return {
    id: row.id,
    title: row.title,
    line: row.reason,
    ...(row.waitingOn ? { waitingOn: row.waitingOn } : {}),
    about: row.about ?? [row.subject],
    href: row.href,
    ...(row.icon ? { icon: row.icon } : {}),
    stance: row.stance,
    urgency: row.urgency,
    dueDate: row.dueDate!,
    ...(row.opened ? { opened: row.opened } : {}),
    daysLeft: daysBetween(today, row.dueDate!),
    ...(window.days !== undefined ? { windowDays: window.days } : {}),
    ...(window.progress !== undefined ? { progress: window.progress } : {}),
    stops: row.urgency !== "ambient" || stopsOnArrival(row.id),
  };
}

const HELD = new WeakMap<Campaign, readonly PendingItem[]>();

/** Everything the game is waiting on, soonest first. */
export function selectPending(campaign: Campaign): readonly PendingItem[] {
  const held = HELD.get(campaign);
  if (held !== undefined) return held;
  const statutory = new Map(runningClocks(campaign).flatMap((clock) => (clock.window ? [[clock.id, clock.window] as const] : [])));
  const seen = new Set<string>();
  const items = attentionRows(campaign)
    .filter((row) => row.dueDate !== undefined && row.source !== "constitutional-deadline")
    .filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)))
    .map((row) => pendingOf(row, campaign.calendar, statutory))
    .sort((a, b) => a.daysLeft - b.daysLeft || a.title.localeCompare(b.title));
  HELD.set(campaign, items);
  return items;
}

/** What is pending on one subject's page: `pendingAbout(campaign, "nation:CN")`. */
export function pendingAbout(campaign: Campaign, key: string): readonly PendingItem[] {
  return selectPending(campaign).filter((item) => item.about.includes(key));
}

/** Where a vote that came back is read: the treaty's own page, or the war powers page for the country. */
function answeredVoteHref(campaign: Campaign, id: string): string | undefined {
  const [kind, ...rest] = id.split(":");
  const act = campaign.issuedActs?.[rest.join(":")];
  if (kind === "issued-treaty" && act?.kind === "treaty") return anchored(place.treaty(act.treatyId), "treaty-odds");
  if (kind === "issued-aumf" && act?.kind === "authorization") return warPowersHome(campaign, act.target);
  return undefined;
}

/** A row's door, by id, for a surface that only holds the id (a stop's matter). */
export function pendingHref(campaign: Campaign, id: string): string | undefined {
  return selectPending(campaign).find((item) => item.id === id)?.href ?? attentionRows(campaign).find((row) => row.id === id)?.href ?? answeredVoteHref(campaign, id);
}

/** The countdown in words, for a screen reader and for the line under a ring. */
export function pendingSpoken(item: Pick<PendingItem, "daysLeft" | "windowDays">): string {
  if (item.daysLeft <= 0) return "Due now";
  const left = `${item.daysLeft} ${item.daysLeft === 1 ? "day" : "days"} left`;
  return item.windowDays ? `${left} of ${item.windowDays}` : left;
}
