import type { Campaign } from "@admin/engine";
import { type CompareMetricId } from "./metrics.js";
import type { Better, CompareBenchmark, CompareWindow, FormatKind, Subject } from "./types.js";
export type SeriesKind = "self" | "peer" | "history";
export type CompareLine = {
    readonly id: string;
    readonly subject: Subject;
    readonly label: string;
    readonly kind: SeriesKind;
    /** One value per x position; null where the subject has no reading that week. */
    readonly values: readonly (number | null)[];
    readonly available: boolean;
    /** Why the line is empty, where it is. */
    readonly reason?: string;
    /** What the line does and does not hold, where that is not obvious from it. */
    readonly note?: string;
};
export type CompareSeriesView = {
    readonly metricId: CompareMetricId;
    readonly title: string;
    readonly unit: string;
    readonly format: FormatKind;
    readonly better: Better;
    readonly domain?: readonly [number, number];
    /** The campaign week each x position stands for. */
    readonly turns: readonly number[];
    readonly x: readonly string[];
    readonly series: readonly CompareLine[];
    readonly benchmarks: readonly CompareBenchmark[];
};
/** One reading's course for each subject over the same weeks, with the lines it is judged against. */
export declare function compareSeries(campaign: Campaign, metricId: CompareMetricId, subjects: readonly Subject[], window: CompareWindow): CompareSeriesView;
