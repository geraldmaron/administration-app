import type { Campaign } from "./state.js";
export type MetricBenchmarkKind = "historical" | "gate" | "own-record";
export type MetricBenchmark = {
    /** Position on the metric's own 0..1 scale — the same scale the dial reads. */
    readonly at: number;
    /** Short enough for a track label. */
    readonly label: string;
    readonly kind: MetricBenchmarkKind;
    /** One sentence for the explain layer, which is default-off. */
    readonly note?: string;
};
/**
 * How many of the oldest rows in `metricHistory` are the predecessor's.
 *
 * The history opens with `INHERITED_WEEKS` inherited rows and keeps only the
 * newest `METRIC_HISTORY_WINDOW`, so once enough governed weeks close the
 * inherited rows scroll out of the front first. Counting by the turn rather
 * than by index is what keeps a governed week from being read as inherited.
 */
export declare function inheritedRowCount(campaign: Campaign): number;
/**
 * The reference marks for one player-facing reading, ascending, all on that
 * reading's own 0..1 scale.
 *
 * Pure and deterministic: the historical and gate marks are authored constants,
 * and the own-record marks are read off the campaign's stored series. An
 * unrecognized metric returns nothing rather than guessing.
 */
export declare function metricBenchmarks(campaign: Campaign, metricId: string): readonly MetricBenchmark[];
/** The authored historical set for a metric, campaign-independent — what the tests hold the layer to. */
export declare function historicalBenchmarks(metricId: string): readonly MetricBenchmark[];
