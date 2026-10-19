import {
  PRESS_PLAYS,
  outletAudience,
  outletDrivers,
  pickOutletForFeedItem,
  pressOutletById,
  pressReading,
  selectDateOfTurn,
  selectOutlets,
  type Campaign,
  type OutletFormat,
  type OutletStance,
  type OutletStanding,
} from "@admin/engine";
import type { StateRegion } from "@admin/world";
import { formatDate } from "../format/figures.js";
import type { Stance } from "../reading.js";

// The press room's reading of its desks: who each one is, who reads it, where it
// stands with this administration and why. Words and bands throughout, never a
// disposition figure: a reader can act on "hostile, and the President's party
// is most of why", and cannot act on 0.21.

export const FORMAT_LABEL: Readonly<Record<OutletFormat, string>> = {
  wire: "Wire service",
  daily: "Major national paper",
  trade: "Capitol Hill paper",
  weekly: "Opinion weekly",
  network: "Broadcast network",
  business: "Business daily",
  cable: "Cable news",
  digital: "News site",
  "talk-radio": "Talk radio",
  podcast: "Podcast",
  regional: "Regional paper",
};

const REGION_LABEL: Readonly<Record<StateRegion, string>> = {
  northeast: "the Northeast",
  midwest: "the Midwest",
  south: "the South",
  west: "the West",
};

export const STANCE_WORD: Readonly<Record<OutletStance, string>> = {
  hostile: "Hostile",
  skeptical: "Skeptical",
  neutral: "Even-handed",
  friendly: "Friendly",
};

export const STANCE_TONE: Readonly<Record<OutletStance, Stance>> = {
  hostile: "adverse",
  skeptical: "caution",
  neutral: "neutral",
  friendly: "favorable",
};

/** "about one American adult in four", from a weekly reach. */
export function reachWords(reach: number): string {
  const inN = Math.max(2, Math.round(1 / Math.max(reach, 0.01)));
  const small = ["", "", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const count = inN <= 10 ? small[inN]! : inN <= 15 ? "a dozen" : inN <= 25 ? "twenty" : inN <= 40 ? "thirty" : "fifty";
  return `Reaches about one American adult in ${count} each week`;
}

export function credibilityWords(credibility: number): string {
  if (credibility >= 0.7) return "Trusted across the country";
  if (credibility >= 0.55) return "Trusted by most of its readers and many who are not";
  if (credibility >= 0.4) return "Trusted by its readers, doubted by the rest";
  return "Trusted mostly by its own audience";
}

export type DeskReason = {
  readonly reason: string;
  /** Toward the administration, or away from it. */
  readonly direction: "toward" | "away";
  readonly strength: "strongly" | "somewhat" | "slightly";
};

export type DeskProfile = {
  readonly id: string;
  readonly name: string;
  readonly format: string;
  readonly region?: string;
  readonly beat: string;
  readonly reach: string;
  /** The share of American adults the desk reaches each week, 0..1: the figure the reach sentence is said from. */
  readonly reachShare: number;
  /** Its reach as a share of the widest desk on the roster, 0..1, the scale the landscape draws on. */
  readonly reachOfWidest: number;
  readonly credibility: string;
  readonly stance: OutletStance;
  readonly stanceWord: string;
  readonly tone: Stance;
  /** Where the record is taking it next. */
  readonly heading: "warming" | "cooling" | "settled";
  /** Why it sits where it does, strongest first. */
  readonly reasons: readonly DeskReason[];
  /** How many smaller reasons were left off the list. */
  readonly folded: number;
  /** The groups most over-represented among its readers. */
  readonly readers: readonly string[];
};

/** Below this, a term is inside a desk's ordinary noise and is not a reason. */
const FELT = 0.02;
const SHOWN_REASONS = 3;
/** Where a desk's pull stops being a drift and is a heading. */
const SETTLED = 0.005;

function strength(delta: number): DeskReason["strength"] {
  const size = Math.abs(delta);
  if (size >= 0.15) return "strongly";
  if (size >= 0.06) return "somewhat";
  return "slightly";
}

function reasonsFor(campaign: Campaign, row: OutletStanding): { readonly reasons: readonly DeskReason[]; readonly folded: number } {
  const felt = outletDrivers(campaign, row.outlet)
    .filter((driver) => Math.abs(driver.delta) >= FELT)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.key.localeCompare(b.key));
  const reasons = felt.slice(0, SHOWN_REASONS).map((driver) => ({
    reason: driver.reason,
    direction: driver.delta > 0 ? ("toward" as const) : ("away" as const),
    strength: strength(driver.delta),
  }));
  return { reasons, folded: Math.max(0, felt.length - SHOWN_REASONS) };
}

const widestReach = (rows: readonly OutletStanding[]): number => Math.max(0.01, ...rows.map((row) => row.outlet.reach));

function profileOf(campaign: Campaign, row: OutletStanding, widest: number): DeskProfile {
  const { outlet } = row;
  const gap = row.target - row.disposition;
  return {
    id: outlet.id,
    name: outlet.name,
    format: FORMAT_LABEL[outlet.format],
    ...(outlet.region ? { region: REGION_LABEL[outlet.region] } : {}),
    beat: outlet.beat,
    reach: reachWords(outlet.reach),
    reachShare: outlet.reach,
    reachOfWidest: outlet.reach / widest,
    credibility: credibilityWords(outlet.credibility),
    stance: row.stance,
    stanceWord: STANCE_WORD[row.stance],
    tone: STANCE_TONE[row.stance],
    heading: Math.abs(gap) < SETTLED ? "settled" : gap > 0 ? "warming" : "cooling",
    ...reasonsFor(campaign, row),
    readers: outletAudience(campaign, outlet).leans.map((lean) => lean.name),
  };
}

/** Every desk's profile, hostile end first, the order the engine draws the spectrum in. */
export function deskProfiles(campaign: Campaign): readonly DeskProfile[] {
  const rows = selectOutlets(campaign);
  const widest = widestReach(rows);
  return rows.map((row) => profileOf(campaign, row, widest));
}

export function deskProfile(campaign: Campaign, id: string): DeskProfile | undefined {
  const rows = selectOutlets(campaign);
  const row = rows.find((entry) => entry.outlet.id === id);
  return row ? profileOf(campaign, row, widestReach(rows)) : undefined;
}

export type DeskFiling = { readonly index: number; readonly headline: string };

/**
 * The stories this masthead actually carried, newest first, read back off the
 * same pick the composer uses, so a headline listed under a desk opens under
 * the same desk on the dispatch page.
 */
export function deskFilings(campaign: Campaign, outletId: string, limit = 3): readonly DeskFiling[] {
  return campaign.feed
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => pickOutletForFeedItem(item)?.id === outletId)
    .sort((a, b) => b.item.turn - a.item.turn || b.index - a.index)
    .slice(0, limit)
    .map(({ item, index }) => ({ index, headline: item.headline }));
}

export type EngagementRow = {
  readonly id: string;
  readonly when: string;
  readonly play: string;
  readonly desk?: string;
  readonly wentWell: boolean;
  readonly summary: string;
};

/** Every time the administration went in front of the press, newest first. */
export function pressHistory(campaign: Campaign): readonly EngagementRow[] {
  return [...campaign.press.engagements].reverse().map((engagement) => {
    const desk = engagement.outletId ? pressOutletById(engagement.outletId)?.name : undefined;
    return {
      id: engagement.id,
      when: formatDate(selectDateOfTurn(campaign, engagement.turn)),
      play: PRESS_PLAYS[engagement.kind].name,
      ...(desk ? { desk } : {}),
      wentWell: engagement.wentWell,
      summary: engagement.summary,
    };
  });
}

/**
 * How long it has been since anyone at the White House took a question, which
 * is half of what the corps is reading: past six weeks, the silence is the story.
 */
export function silenceWords(campaign: Campaign): string {
  const weeks = pressReading(campaign, "silenceWeeks") ?? 0;
  if (weeks <= 1) return "Someone from the White House has answered reporters' questions this week or last.";
  return `${weeks} weeks since anyone at the White House took a question.`;
}

export type CoverageTrend = {
  /** Running tally of the last outings, oldest first: +1 for one that went well, -1 for one that did not. */
  readonly values: readonly number[];
  readonly tone: Stance;
  readonly summary: string;
};

/**
 * Which way coverage has been running, read off the administration's own
 * record of engagements. No history of the corps's standing is kept, and this
 * does not invent one. Undefined before the second outing: one point is a
 * fact, not a trend.
 */
export function pressCoverageTrend(campaign: Campaign, limit = 8): CoverageTrend | undefined {
  const engagements = campaign.press.engagements.slice(-limit);
  if (engagements.length < 2) return undefined;
  let score = 0;
  const values = engagements.map((engagement) => (score += engagement.wentWell ? 1 : -1));
  const good = engagements.filter((engagement) => engagement.wentWell).length;
  const tone: Stance = score > 0 ? "favorable" : score < 0 ? "adverse" : "neutral";
  const run = tone === "favorable" ? "running your way" : tone === "adverse" ? "running against you" : "even";
  return {
    values,
    tone,
    summary: `${good} of the last ${engagements.length} went well. Coverage is ${run}.`,
  };
}
