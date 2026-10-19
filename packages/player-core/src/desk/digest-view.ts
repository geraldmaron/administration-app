import type { Campaign, FeedItem, GameDate, MetricSet } from "@admin/engine";
import type { NationId } from "@admin/world";
import { METRIC_LABELS, formatRatio, metricFraction } from "../format/figures";
import { formatMoney } from "../format/money";
import { place } from "../navigation/places";
import { metricMoves, type RecordRow } from "../record/record-entry";
import { NOW_KEYS } from "./now-readings";
import { closingRow, digestWeeks, openingRow, stateMoves, weekDigest, type StateMove, type WeekDigest } from "./week-digest";

// The weekly digest composed for drawing: the same readers the Brief and the
// Record use (week-digest, metricMoves, the ledger rows), arranged so a screen
// draws every figure on one scale and links each to the screen that owns it.

/** How many weeks the picker chart draws at once: a quarter, the span a trend is read over. */
export const DIGEST_WINDOW = 13;

/** A bar never scales to less than this, so float noise does not read as a swing. */
const APPROVAL_FLOOR = 0.005;
const READING_FLOOR = 0.01;
const STATE_FLOOR = 0.005;

export type DigestDirection = "up" | "down" | "flat";

export type WeekBar = {
  readonly week: number;
  readonly from: GameDate;
  /** Approval's move across the week; absent where the series no longer holds the week. */
  readonly delta?: number;
  /** The move against the largest in the window, -1..1. */
  readonly share: number;
  readonly current: boolean;
};

export type DigestKpi = {
  readonly key: keyof MetricSet;
  readonly label: string;
  readonly href: string;
  /** False where the series no longer holds this week's figures. */
  readonly known: boolean;
  readonly beforeText?: string;
  readonly afterText?: string;
  /** Where the reading closed in its own range, 0..1, and where it opened. */
  readonly afterFraction?: number;
  readonly beforeFraction?: number;
  readonly text: string;
  readonly direction: DigestDirection;
  /** The move in range fractions, against the largest of the five: -1..1. Every reading is better higher. */
  readonly share: number;
};

export type StateTile = StateMove & { readonly share: number };

export type ActGroup = {
  readonly domain: string;
  readonly label: string;
  readonly rows: readonly RecordRow[];
  /** Entries whose readings netted up, and netted down, so the group's head says whether it helped. */
  readonly helped: number;
  readonly hurt: number;
};

export type WireLine = {
  readonly index: number;
  readonly headline: string;
  readonly intelligence: boolean;
  /** The subject's screen, where the item names one. */
  readonly href?: string;
  readonly subject?: string;
};

export type WireGroup = { readonly kind: FeedItem["kind"]; readonly label: string; readonly lines: readonly WireLine[] };

export type DigestView = {
  readonly digest: WeekDigest;
  readonly latest: boolean;
  readonly bars: readonly WeekBar[];
  readonly olderWeek?: number;
  readonly newerWeek?: number;
  readonly kpis: readonly DigestKpi[];
  /** Every state whose approval moved, for the tile map; empty where the week is older than the state series. */
  readonly tiles: readonly StateTile[];
  readonly acts: readonly ActGroup[];
  readonly world: readonly ActGroup[];
  readonly wire: readonly WireGroup[];
};

/** Where each reading is owned: approval in public opinion, the books in the budget, force in national security. */
export function kpiHref(key: keyof MetricSet): string {
  // One table names the screen that owns each reading; a second copy here had already drifted from it.
  return place.metric(key);
}

const signedShare = (delta: number, scale: number): number => Math.max(-1, Math.min(1, delta / scale));

const direction = (delta: number): DigestDirection => (delta > 0 ? "up" : delta < 0 ? "down" : "flat");

function barsOf(campaign: Campaign, current: number): { readonly bars: readonly WeekBar[]; readonly older?: number; readonly newer?: number } {
  const weeks = digestWeeks(campaign);
  const at = weeks.findIndex((tab) => tab.week === current);
  const start = Math.max(0, Math.min(weeks.length - DIGEST_WINDOW, at - Math.floor(DIGEST_WINDOW / 2)));
  // Newest first in the list; the chart reads oldest to newest, left to right.
  const shown = [...weeks.slice(start, start + DIGEST_WINDOW)].reverse();
  const scale = Math.max(APPROVAL_FLOOR, ...shown.map((tab) => Math.abs(tab.approvalDelta ?? 0)));
  return {
    bars: shown.map((tab) => ({ week: tab.week, from: tab.from, ...(tab.approvalDelta === undefined ? {} : { delta: tab.approvalDelta }), share: signedShare(tab.approvalDelta ?? 0, scale), current: tab.week === current })),
    ...(weeks[at + 1] ? { older: weeks[at + 1]!.week } : {}),
    ...(weeks[at - 1] ? { newer: weeks[at - 1]!.week } : {}),
  };
}

function figureOf(key: keyof MetricSet, value: number): string {
  return key === "treasury" ? formatMoney(value) : formatRatio(value);
}

/** The five Brief readings across the week, each on the range fraction its gauge draws so one scale holds them all. */
function kpisOf(campaign: Campaign, week: number): readonly DigestKpi[] {
  const before = openingRow(campaign, week);
  const after = closingRow(campaign, week);
  if (!before || !after) {
    return NOW_KEYS.map((key) => ({ key, label: METRIC_LABELS[key], href: kpiHref(key), known: false, text: "Not tracked that far back", direction: "flat" as const, share: 0 }));
  }
  const moves = metricMoves(before, after);
  const fractions = NOW_KEYS.map((key) => metricFraction(key, after[key]) - metricFraction(key, before[key]));
  const scale = Math.max(READING_FLOOR, ...fractions.map(Math.abs));
  return NOW_KEYS.map((key, index) => {
    const move = moves.find((entry) => entry.key === key);
    return {
      key, label: METRIC_LABELS[key], href: kpiHref(key), known: true,
      beforeText: figureOf(key, before[key]), afterText: figureOf(key, after[key]),
      beforeFraction: metricFraction(key, before[key]), afterFraction: metricFraction(key, after[key]),
      text: move ? move.text : "No change",
      direction: move ? direction(move.delta) : "flat",
      share: move ? signedShare(fractions[index]!, scale) : 0,
    };
  });
}

function tilesOf(campaign: Campaign, week: number): readonly StateTile[] {
  const moves = stateMoves(campaign, week);
  const scale = Math.max(STATE_FLOOR, ...moves.map((move) => Math.abs(move.delta)));
  return moves.map((move) => ({ ...move, share: signedShare(move.delta, scale) }));
}

const DOMAIN_OF: Readonly<Record<string, string>> = {
  congress: "congress",
  judiciary: "orders", orders: "orders", policy: "orders",
  nominations: "personnel", cabinet: "personnel", institutions: "personnel",
  economic: "economy", macro: "economy", fiscal: "economy", markets: "economy", trade: "economy",
  relations: "world", engagement: "world", statecraft: "world", alliances: "world", treaties: "world", compacts: "world", "foreign-politics": "world", "world-events": "world",
  military: "security", "war-powers": "security", "combatant-commands": "security", intelligence: "security", "covert-action": "security",
  press: "public", leak: "public", platform: "public", opinion: "public", states: "public", emergency: "public",
};

const DOMAIN_LABELS: Readonly<Record<string, string>> = {
  congress: "Congress",
  orders: "Orders, law, and the courts",
  personnel: "Appointments and offices",
  economy: "Economy and trade",
  world: "Diplomacy",
  security: "Security and the military",
  public: "Press and the public",
  other: "Other",
};

/** The order groups are drawn in, so the same domain sits in the same place week to week. */
const DOMAIN_ORDER = Object.keys(DOMAIN_LABELS);

function domainOf(row: RecordRow): string {
  for (const system of row.systems) {
    const domain = DOMAIN_OF[system];
    if (domain) return domain;
  }
  return "other";
}

function netOf(row: RecordRow): number {
  return row.moves.reduce((sum, move) => sum + metricFraction(move.key, move.after) - metricFraction(move.key, move.before), 0);
}

/** Rows grouped by the domain they moved, in a fixed domain order, each group saying how many helped and how many cost. */
export function groupRows(rows: readonly RecordRow[]): readonly ActGroup[] {
  return DOMAIN_ORDER.flatMap((domain) => {
    const members = rows.filter((row) => domainOf(row) === domain);
    if (members.length === 0) return [];
    const nets = members.map(netOf);
    return [{ domain, label: DOMAIN_LABELS[domain]!, rows: members, helped: nets.filter((net) => net > 0).length, hurt: nets.filter((net) => net < 0).length }];
  });
}

const WIRE_LABELS: Readonly<Record<FeedItem["kind"], string>> = {
  "player-action": "Your actions",
  "npc-action": "Governments",
  operator: "Operators",
  drift: "Drift",
  press: "The press",
  conflict: "Conflict",
  condition: "Conditions at home",
  governance: "Governance",
  pursuit: "Pursuits",
  bloc: "Blocs",
};

function wireLine(campaign: Campaign, item: FeedItem, index: number): WireLine {
  const nation = [item.actor, item.target].find((id): id is NationId => id !== undefined && id !== campaign.founding.nation && campaign.nations[id] !== undefined);
  const base = { index, headline: item.headline, intelligence: item.visibility === "intelligence" };
  if (nation) return { ...base, href: place.country(nation), subject: campaign.nations[nation]?.base.identity.name ?? nation };
  if (item.kind === "condition") return { ...base, href: place.emergency(), subject: "Emergency board" };
  if (item.kind === "press") return { ...base, href: place.press(), subject: "The press" };
  return base;
}

function wireGroups(campaign: Campaign, wire: readonly FeedItem[]): readonly WireGroup[] {
  const kinds = [...new Set(wire.map((item) => item.kind))];
  return kinds.map((kind) => ({
    kind,
    label: WIRE_LABELS[kind],
    lines: wire.flatMap((item, index) => (item.kind === kind ? [wireLine(campaign, item, index)] : [])),
  }));
}

/** One closed week composed for the digest screen, or undefined for a week the term has not closed. */
export function digestView(campaign: Campaign, week: number): DigestView | undefined {
  const digest = weekDigest(campaign, week);
  if (!digest) return undefined;
  const { bars, older, newer } = barsOf(campaign, week);
  return {
    digest,
    latest: week === campaign.turn - 1,
    bars,
    ...(older === undefined ? {} : { olderWeek: older }),
    ...(newer === undefined ? {} : { newerWeek: newer }),
    kpis: kpisOf(campaign, week),
    tiles: tilesOf(campaign, week),
    acts: groupRows(digest.acts),
    world: groupRows(digest.world),
    wire: wireGroups(campaign, digest.wire),
  };
}
