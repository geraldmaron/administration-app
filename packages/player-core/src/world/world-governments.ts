import { hasIntelOnNation, selectBindingTreaties, selectRelationship, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { trustWord } from "../format/figures";
import { place } from "../navigation/places";
import type { Stance } from "../reading";
import { worldLeaderRows } from "./leaders";
import { formatShare } from "./trade-partners";
import { forcesByHost } from "./us-presence";
import { boardStance, goodsTradeShare, standingToward, type Standing } from "./standing";
import { atWarWith } from "./world-board";
import { WORLD_REGION_NAMES, worldRegionOf, type WorldRegionId } from "./world-regions";

// Every other government as one row of the World's full-data table and one
// shape on its map. The row holds the facts; the map's reading only chooses
// which fact colors the shape, so a color and the cell beside it cannot differ.

export type TrendDirection = "warming" | "cooling" | "steady";

export type GovernmentTrend = {
  readonly direction: TrendDirection;
  readonly word: string;
  /** Their trust week by week, oldest first, for the line beside the word. */
  readonly values: readonly number[];
  /** The move over the last four closed weeks, in trust units (−2 to 2). */
  readonly change: number;
};

export type AlignmentKey = "aligned" | "leaning-aligned" | "neutral" | "leaning-opposed" | "opposed";

export const ALIGNMENT_WORDS: Readonly<Record<AlignmentKey, string>> = {
  aligned: "On your side",
  "leaning-aligned": "Leaning your way",
  neutral: "On neither side",
  "leaning-opposed": "Leaning against you",
  opposed: "Against you",
};

/** Opposed first, aligned last, so a sorted column runs the way the word reads. */
export const ALIGNMENT_RANK: Readonly<Record<AlignmentKey, number>> = { opposed: 1, "leaning-opposed": 2, neutral: 3, "leaning-aligned": 4, aligned: 5 };

export type WorldGovernment = {
  readonly nation: NationId;
  readonly name: string;
  readonly capital: string;
  readonly adjective: string;
  readonly href: string;
  readonly region: WorldRegionId | undefined;
  readonly regionName: string;
  /** Their view of the United States, as a band; "unread" where the services have no read. */
  readonly stance: Stance | "unread" | undefined;
  readonly standingWord: string;
  /** Their trust placed on the axis, 0..1; absent while unread. */
  readonly trust: number | undefined;
  /** What the United States thinks of them. */
  readonly ours: { readonly word: string; readonly stance: Stance } | undefined;
  readonly trend: GovernmentTrend | undefined;
  readonly alignment: AlignmentKey;
  /** A binding alliance treaty with the United States. */
  readonly allied: boolean;
  /** Treaties and agreements in force between the two. */
  readonly treaties: number;
  readonly tradeShare: number;
  readonly tradeText: string;
  /** US personnel hosted. */
  readonly forces: number;
  readonly forcesText: string;
  readonly atWar: boolean;
};

/** A month of closed weeks that moves their trust by less than this reads as steady. */
export const TREND_FLAT = 0.01;

const onAxis = (trust: number): number => (trust + 1) / 2;

export function presenceWord(personnel: number, most: number): string {
  if (personnel <= 0) return "None";
  const share = personnel / most;
  return share >= 0.25 ? "Large" : share >= 0.05 ? "Sizable" : "Small";
}

const TREND_WORDS: Readonly<Record<TrendDirection, string>> = { warming: "Warming", cooling: "Cooling", steady: "Steady" };
const TREND_WEEKS_DRAWN = 13;

function trendOf(standing: Standing | undefined): GovernmentTrend | undefined {
  const theirs = standing?.trend.theirs;
  if (!theirs || theirs.change4 === undefined) return undefined;
  const direction: TrendDirection = theirs.change4 > TREND_FLAT ? "warming" : theirs.change4 < -TREND_FLAT ? "cooling" : "steady";
  return { direction, word: TREND_WORDS[direction], values: theirs.points.slice(-TREND_WEEKS_DRAWN).map((point) => point.value), change: theirs.change4 };
}

/** Their current trust where the services read it. The band the standing carries is the word; this places it on the axis. */
export function theirTrust(campaign: Campaign, nation: NationId): number | undefined {
  if (!hasIntelOnNation(campaign, nation)) return undefined;
  const toward = selectRelationship(campaign, nation, campaign.founding.nation);
  return toward ? Math.max(-1, Math.min(1, toward.trust)) : undefined;
}

type Ties = { readonly treaties: ReadonlyMap<string, number>; readonly allies: ReadonlySet<string> };

function tiesOf(campaign: Campaign): Ties {
  const binding = selectBindingTreaties(campaign);
  const treaties = binding.reduce((counts, record) => counts.set(record.counterpart, (counts.get(record.counterpart) ?? 0) + 1), new Map<string, number>());
  return { treaties, allies: new Set(binding.filter((record) => record.kind === "alliance").map((record) => record.counterpart)) };
}

/** Every other government with every fact the World table and map read, ranked for nothing: callers sort. */
export function worldGovernments(campaign: Campaign): readonly WorldGovernment[] {
  const presence = forcesByHost(campaign);
  const most = Math.max(1, ...presence.values());
  const war = atWarWith(campaign);
  const ties = tiesOf(campaign);
  return worldLeaderRows(campaign).map((leader): WorldGovernment => {
    const standing = standingToward(campaign, leader.nation);
    const stance = boardStance(standing);
    const region = worldRegionOf(leader.region);
    const share = goodsTradeShare(campaign, leader.nation) ?? 0;
    const personnel = presence.get(leader.nation) ?? 0;
    const trust = stance === "unread" ? undefined : theirTrust(campaign, leader.nation);
    const ours = standing?.ours?.trust;
    return {
      nation: leader.nation,
      name: leader.nationName,
      capital: leader.capital,
      adjective: leader.adjective,
      href: place.country(leader.nation),
      region,
      regionName: region ? WORLD_REGION_NAMES[region] : "Elsewhere",
      stance,
      standingWord: stance === undefined ? "No relationship" : stance === "unread" ? "Unread" : trustWord(stance),
      trust: trust === undefined ? undefined : onAxis(trust),
      ours: ours ? { word: ours.word, stance: ours.stance } : undefined,
      trend: stance === "unread" ? undefined : trendOf(standing),
      alignment: campaign.nations[leader.nation]?.base.bands.alignmentBand ?? "neutral",
      allied: ties.allies.has(leader.nation),
      treaties: ties.treaties.get(leader.nation) ?? 0,
      tradeShare: share,
      tradeText: formatShare(share),
      forces: personnel,
      forcesText: presenceWord(personnel, most),
      atWar: war.has(leader.nation),
    };
  });
}
