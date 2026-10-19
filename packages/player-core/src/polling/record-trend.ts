import type { Campaign } from "@admin/engine";

// The read side of the engine's observed records: what a reading was at each
// closed week, and how far it has moved over a month and over a quarter.
//
// Every point is a week the engine observed. Nothing is interpolated between
// two observations and nothing is extended before the first: a record that
// opened when an older save was loaded says so, and its chart starts there.

/** One observed week. `turn` is the week the reading was filed under. */
export type TrendPoint = { readonly turn: number; readonly value: number };

export type TrendChange = {
  /** Oldest first, ending at the last closed week. */
  readonly points: readonly TrendPoint[];
  /** Last point less the point four weeks before it; absent until the record reaches back that far. */
  readonly change4?: number;
  /** The same over thirteen weeks, a quarter. */
  readonly change13?: number;
};

/** Where a record begins, so a chart can say whether it runs from the oath. */
export type RecordStart = {
  /** The turn the record opened on; absent until the first week closes under it. */
  readonly since?: number;
  /** True when the record runs from the oath, or will once the first week closes. */
  readonly fromOath: boolean;
  /** The line a chart prints when it does not. */
  readonly note?: string;
};

const OATH_TURN = 1;

export const RECORD_STARTS_AT_LOAD = "The record starts from the day you opened this save. Earlier weeks weren't kept.";

/** Read off the record's opening turn: a campaign past the oath with no record is an older save not yet closed a week. */
export function recordStart(campaign: Campaign, since: number | undefined): RecordStart {
  const fromOath = since === undefined ? campaign.turn <= OATH_TURN : since <= OATH_TURN;
  return { ...(since === undefined ? {} : { since }), fromOath, ...(fromOath ? {} : { note: RECORD_STARTS_AT_LOAD }) };
}

/** The last point less the last one filed at least `weeks` before it. */
export function changeOver(points: readonly TrendPoint[], weeks: number): number | undefined {
  const last = points[points.length - 1];
  if (!last) return undefined;
  const before = points.filter((point) => point.turn <= last.turn - weeks).at(-1);
  return before === undefined ? undefined : Math.round((last.value - before.value) * 1000) / 1000;
}

export function trendOf(points: readonly TrendPoint[]): TrendChange {
  const change4 = changeOver(points, 4);
  const change13 = changeOver(points, 13);
  return { points, ...(change4 === undefined ? {} : { change4 }), ...(change13 === undefined ? {} : { change13 }) };
}
