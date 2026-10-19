import { type CohortAxisId, type CohortId, type StateCohortMix } from "@admin/world";
import type { RngStream, RngStreams } from "./rng.js";
/**
 * The opening mix of each state is approximate: a stable set of hand-rounded and
 * Census-based shares. Every campaign samples around it, so no two games open on
 * exactly the same country. The sample has two parts, because real error is
 * shared: a national factor per cell (a source that runs a point high runs high
 * everywhere) and a smaller state factor on top. Each is a relative change, so a
 * small cell moves by a small amount, and each axis is renormalized to sum to
 * one, which is what keeps every axis a partition of the people.
 *
 * Standard deviations are relative (0.05 is five percent of the share itself) and
 * chosen by how well the source pins the axis down: sex ratios barely move, the
 * approximate nativity and disability columns move the most.
 */
export declare const JITTER_SPREAD: Readonly<Record<CohortAxisId, {
    readonly national: number;
    readonly state: number;
}>>;
/** The campaign's national factor per cell, in cohort declaration order. */
export declare function nationalDemographicFactors(streams: RngStreams): Readonly<Record<CohortId, number>>;
/** One state's mix, sampled around its authored values. Pure given the stream and national factors. */
export declare function jitterCohortMix(mix: StateCohortMix, national: Readonly<Record<CohortId, number>>, stream: RngStream): StateCohortMix;
