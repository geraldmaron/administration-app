import { bilateralGoods, hasIntelOnNation, selectRelationship, trustCourse, type Campaign, type TrustPoint } from "@admin/engine";
import type { NationId } from "@admin/world";
import { stanceForDisposition, stanceForPressure, stanceForTrust, trustWord } from "../format/figures";
import { recordStart, trendOf, type RecordStart, type TrendChange, type TrendPoint } from "../polling/record-trend";
import type { ReadingBand, Stance } from "../reading";

// How one government and the United States sit toward each other, the one
// reader every surface that draws a posture goes through.
//
// The relationship is directed and the two directions are different facts.
// What a capital thinks of the United States is intelligence: a government
// that keeps its counsel is unread until the services outread it, and an
// unread government shows that it is unread rather than a guess. What the
// United States thinks of it is the administration's own record and always
// legible. Every reading is said as a band, never a percentage: a figure to
// the percent would claim a precision the game does not have about a foreign
// government, read or not. The World's ranking may still place a read
// government where its trust sits inside its band, so two capitals in one band
// are not drawn as one; it prints the band's word, never the figure.

/** A band with where it sits on its own four steps, 1 to 4, so a screen can light the step. */
export type StandingBand = ReadingBand & { readonly level: number };

/**
 * One side of a relationship, as a screen captions it.
 *
 * Printing one direction under the other's caption is the error every surface
 * that reads a posture has to avoid, so the caption travels with the band.
 */
export type StandingReading = {
  /** Whose view it is: "Their view of you", "Your read of them". */
  readonly caption: string;
  readonly trust: StandingBand;
};

/**
 * Both directions of the relationship with one government, and the United
 * States' own read of the tension, the common aims and the threat. Their view
 * of the United States is absent and `unread` is true when the services have
 * no read on them.
 */
export type Standing = {
  readonly theirs?: StandingReading;
  readonly ours?: StandingReading;
  readonly unread: boolean;
  readonly tension?: StandingBand;
  readonly aims?: StandingBand;
  readonly threat?: StandingBand;
  readonly trend: StandingTrend;
};

/**
 * How the relationship has moved, as the engine observed it week by week. The
 * changes are for drawing a slope, not for printing: a screen still says the
 * band. Their side is absent while the services cannot read them, for the same
 * reason their current band is: the record holds it, the President does not.
 */
export type StandingTrend = {
  readonly start: RecordStart;
  readonly ours?: TrendChange;
  readonly theirs?: TrendChange;
  readonly tension?: TrendChange;
};

export const THEIR_VIEW = "Their view of you";
const OUR_READ = "Your view of them";

// Lowest to highest on each band's own scale, so `level` means "how much of
// it": how far they trust, how high the tension runs.
const RISING: readonly Stance[] = ["adverse", "caution", "neutral", "favorable"];
const MOUNTING: readonly Stance[] = ["favorable", "neutral", "caution", "adverse"];

const OUR_TRUST: Readonly<Record<Stance, string>> = { favorable: "Trusted", neutral: "Neutral", caution: "Wary", adverse: "Hostile" };
const TENSION: Readonly<Record<Stance, string>> = { favorable: "Low", neutral: "Manageable", caution: "Rising", adverse: "High" };
const AIMS: Readonly<Record<Stance, string>> = { favorable: "Aligned", neutral: "Mixed", caution: "Apart", adverse: "Opposed" };
const THREAT: Readonly<Record<Stance, string>> = { favorable: "Low", neutral: "Modest", caution: "Serious", adverse: "Grave" };

function band(stance: Stance, words: Readonly<Record<Stance, string>>, scale: readonly Stance[]): StandingBand {
  return { word: words[stance], stance, level: scale.indexOf(stance) + 1 };
}

const THEIR_TRUST: Readonly<Record<Stance, string>> = {
  favorable: trustWord("favorable"),
  neutral: trustWord("neutral"),
  caution: trustWord("caution"),
  adverse: trustWord("adverse"),
};

function sideOf(course: readonly TrustPoint[], read: (point: TrustPoint) => number | undefined): TrendChange | undefined {
  const points = course.flatMap((point): TrendPoint[] => {
    const value = read(point);
    return value === undefined ? [] : [{ turn: point.turn, value }];
  });
  return points.length === 0 ? undefined : trendOf(points);
}

/** The observed course of one government's standing with the United States. */
export function standingTrend(campaign: Campaign, nation: NationId, unread: boolean): StandingTrend {
  const course = trustCourse(campaign, nation);
  const ours = sideOf(course, (point) => point.ours);
  const theirs = unread ? undefined : sideOf(course, (point) => point.theirs);
  const tension = sideOf(course, (point) => point.tension);
  return {
    start: recordStart(campaign, campaign.relationsRecord?.since),
    ...(ours ? { ours } : {}),
    ...(theirs ? { theirs } : {}),
    ...(tension ? { tension } : {}),
  };
}

export function standingToward(campaign: Campaign, nation: NationId): Standing | undefined {
  const home = campaign.founding.nation;
  if (nation === home || campaign.nations[nation] === undefined) return undefined;
  const unread = !hasIntelOnNation(campaign, nation);
  const toward = selectRelationship(campaign, nation, home);
  const from = selectRelationship(campaign, home, nation);
  return {
    unread,
    ...(toward && !unread ? { theirs: { caption: THEIR_VIEW, trust: band(stanceForTrust(toward.trust), THEIR_TRUST, RISING) } } : {}),
    ...(from
      ? {
          ours: { caption: OUR_READ, trust: band(stanceForTrust(from.trust), OUR_TRUST, RISING) },
          tension: band(stanceForPressure(from.tension), TENSION, MOUNTING),
          aims: band(stanceForDisposition(from.alignment), AIMS, RISING),
          threat: band(stanceForPressure(from.militaryThreat), THREAT, MOUNTING),
        }
      : {}),
    trend: standingTrend(campaign, nation, unread),
  };
}

/**
 * How a government is drawn on the board: its own trust in the United States
 * where the services read it, "unread" where they do not, and nothing for a
 * government with no relationship kept either way. The fill, the stance
 * filter and the board's counts all read this, so they cannot disagree.
 */
export function boardStance(standing: Standing | undefined): Stance | "unread" | undefined {
  if (!standing) return undefined;
  if (standing.unread) return "unread";
  return standing.theirs?.trust.stance;
}

type GoodsTrade = { readonly imports: number; readonly exports: number };

// The sums across every partner, kept per campaign object (never mutated),
// because a share needs every partner and summing them walks every sector.
const goodsTradeBySnapshot = new WeakMap<Campaign, GoodsTrade>();

/** US goods trade with every partner together, in the trade volumes' own units. */
export function goodsTradeTotals(campaign: Campaign): GoodsTrade {
  const known = goodsTradeBySnapshot.get(campaign);
  if (known !== undefined) return known;
  const totals = (Object.keys(campaign.nations) as NationId[])
    .filter((id) => id !== campaign.founding.nation)
    .reduce<GoodsTrade>(
      (sums, id) => {
        const goods = bilateralGoods(campaign, id);
        return { imports: sums.imports + goods.imports, exports: sums.exports + goods.exports };
      },
      { imports: 0, exports: 0 },
    );
  goodsTradeBySnapshot.set(campaign, totals);
  return totals;
}

/** A partner's share of US goods trade, 0..1, from the committed trade volumes. */
export function goodsTradeShare(campaign: Campaign, nation: NationId): number | undefined {
  if (nation === campaign.founding.nation || campaign.nations[nation] === undefined) return undefined;
  const { imports, exports } = goodsTradeTotals(campaign);
  const total = imports + exports;
  if (total <= 0) return undefined;
  const goods = bilateralGoods(campaign, nation);
  return (goods.imports + goods.exports) / total;
}
