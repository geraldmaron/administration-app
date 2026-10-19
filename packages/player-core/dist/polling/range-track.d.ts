import { type Campaign, type MetricBenchmarkKind } from "@admin/engine";
import { type Stance } from "../reading";
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
/**
 * Approval's range track: the term's span and today's reading on the full
 * scale, with every landmark the benchmark layer has for approval.
 *
 * `undefined` where the campaign has no closed week, because a track with one
 * point on it is a dot and a span drawn from a single reading is invented.
 */
export declare function approvalRangeTrack(campaign: Campaign): RangeTrackReading | undefined;
