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
export declare const INHERITED_WEEKS = 13;
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
export declare function inheritedMetricHistory(streams: RngStreams, opening: MetricSet): readonly MetricSet[];
