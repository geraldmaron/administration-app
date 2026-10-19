import { metricBenchmarks, selectMetricSeries, type Campaign, type MetricBenchmarkKind } from "@admin/engine";
import { readingBand, type Stance } from "../reading";

// Approval against the record, on approval's own scale.
//
// A term that has run between 44 and 48 percent has no room on its own axis for
// the honeymoon it started from, so a track drawn on the term's span puts every
// landmark off the end of it and teaches nothing. This draws the full 0..1 scale
// the landmarks are actually stated on, with the term as a band inside it — the
// comparison a range track exists to make.

export type RangeMark = {
  readonly at: number;
  readonly label: string;
  readonly kind: MetricBenchmarkKind;
  /** What kind of claim this mark is, said in words rather than by its color. */
  readonly claim: string;
  readonly note?: string;
  /** Position on the drawn scale, 0..1. */
  readonly offset: number;
};

/**
 * What each kind of reference is, spoken.
 *
 * The benchmark layer's whole honesty rule lives in `kind`: a published Gallup
 * reading and a line this game's own rules read are two different claims, and a
 * track that drew them as one hairline would let a player take either for the
 * other. So the word travels with the mark.
 */
const RANGE_MARK_CLAIMS: Readonly<Record<MetricBenchmarkKind, string>> = {
  historical: "a real poll result from the past",
  gate: "a line the game's rules use",
  "own-record": "where you've been this term",
};

export type RangeTrackReading = {
  /** The drawn scale, which for a ratio is the whole of it. */
  readonly scaleLow: number;
  readonly scaleHigh: number;
  /** The term's own span inside that scale. */
  readonly termLow: number;
  readonly termHigh: number;
  readonly opening: number;
  readonly now: number;
  readonly openingOffset: number;
  readonly nowOffset: number;
  readonly termLowOffset: number;
  readonly termHighOffset: number;
  readonly figure: string;
  readonly word: string;
  readonly stance: Stance;
  /** Signed, against the opening: what this term has done to the reading. */
  readonly sinceOpening: string;
  readonly marks: readonly RangeMark[];
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function signedPoints(value: number): string {
  const points = Math.round(value * 100);
  if (points === 0) return "no change since you took office";
  return `${points > 0 ? "+" : "−"}${Math.abs(points)} points since you took office`;
}

/**
 * Approval's range track: the term's span and today's reading on the full
 * scale, with every landmark the benchmark layer has for approval.
 *
 * `undefined` where the campaign has no closed week, because a track with one
 * point on it is a dot and a span drawn from a single reading is invented.
 */
export function approvalRangeTrack(campaign: Campaign): RangeTrackReading | undefined {
  const series = selectMetricSeries(campaign, "approval");
  if (series.length < 2) return undefined;
  const now = series[series.length - 1]!;
  const opening = series[0]!;
  const termLow = Math.min(...series);
  const termHigh = Math.max(...series);
  const band = readingBand("standing", now);
  const offset = (value: number) => clamp01(value);
  return {
    scaleLow: 0,
    scaleHigh: 1,
    termLow,
    termHigh,
    opening,
    now,
    openingOffset: offset(opening),
    nowOffset: offset(now),
    termLowOffset: offset(termLow),
    termHighOffset: offset(termHigh),
    figure: percent(now),
    word: band?.word ?? "",
    stance: band?.stance ?? "neutral",
    sinceOpening: signedPoints(now - opening),
    marks: metricBenchmarks(campaign, "approval").map((mark) => ({
      at: mark.at,
      label: mark.label,
      kind: mark.kind,
      claim: RANGE_MARK_CLAIMS[mark.kind],
      ...(mark.note === undefined ? {} : { note: mark.note }),
      offset: offset(mark.at),
    })),
  };
}

