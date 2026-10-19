/**
 * The quarter before you: the record a new administration walks into.
 */
import type { MetricSet } from "./state-campaign.js";
import type { RngStreams } from "./rng.js";

/**
 * How many closed weeks a president inherits.
 *
 * A quarter is the shortest stretch that reads as a record rather than as a
 * rounding error: long enough for a sparkline to have a shape, for a delta to
 * mean something, and for "since you took office" to be a different question
 * from "since the term began".
 */
export const INHERITED_WEEKS = 13;

/** How far a single week may move a 0..1 reading under the predecessor. */
const WEEKLY_DRIFT = 0.018;
/** The share of the treasury a single inherited week may move. */
const TREASURY_DRIFT = 0.011;

/**
 * The thirteen weeks behind the opening reading.
 *
 * Generated backwards from the metrics the founding already sealed, so the
 * last inherited snapshot lands adjacent to today rather than being reconciled
 * to it afterwards: the trace always arrives at the number the room is about
 * to draw, whatever the walk did on the way.
 *
 * This is deliberately the predecessor's record and not the player's. The
 * founding used to open with an empty history on the reasoning that seeding a
 * point would "draw a trend out of a campaign that has not moved" — true of a
 * campaign, and the wrong frame for a presidency, which is a going concern
 * that was already being run by somebody. A first week with no past is why
 * every sparkline was a dot, every delta absent and the record empty.
 *
 * Each reading walks on its own stream, so two campaigns from different seeds
 * inherit different quarters and the same seed always inherits the same one.
 */
export function inheritedMetricHistory(streams: RngStreams, opening: MetricSet): readonly MetricSet[] {
  const ratio = walkRatio(streams, opening);
  const treasury = walkTreasury(streams, opening.treasury);
  const history: MetricSet[] = [];
  for (let week = 0; week < INHERITED_WEEKS; week += 1) {
    history.push({
      approval: ratio.approval[week]!,
      stability: ratio.stability[week]!,
      militaryReadiness: ratio.militaryReadiness[week]!,
      standing: ratio.standing[week]!,
      treasury: treasury[week]!,
    });
  }
  return history;
}

type RatioKey = "approval" | "stability" | "militaryReadiness" | "standing";
const RATIO_KEYS: readonly RatioKey[] = ["approval", "stability", "militaryReadiness", "standing"];

function walkRatio(streams: RngStreams, opening: MetricSet): Readonly<Record<RatioKey, readonly number[]>> {
  const walked = {} as Record<RatioKey, readonly number[]>;
  for (const key of RATIO_KEYS) {
    const stream = streams.stream("inheritance", key);
    // Walk back from today, then read the result forwards. Going backwards is
    // what guarantees the series ends where the campaign actually starts.
    const backwards: number[] = [];
    let value = opening[key];
    for (let step = 0; step < INHERITED_WEEKS; step += 1) {
      value = clampRatio(value - (stream.next() * 2 - 1) * WEEKLY_DRIFT);
      backwards.push(value);
    }
    walked[key] = backwards.reverse();
  }
  return walked;
}

function walkTreasury(streams: RngStreams, opening: number): readonly number[] {
  const stream = streams.stream("inheritance", "treasury");
  const backwards: number[] = [];
  let value = opening;
  for (let step = 0; step < INHERITED_WEEKS; step += 1) {
    value = Math.max(0, value * (1 - (stream.next() * 2 - 1) * TREASURY_DRIFT));
    backwards.push(value);
  }
  return backwards.reverse();
}

function clampRatio(value: number): number {
  return Math.max(0.02, Math.min(0.98, value));
}
