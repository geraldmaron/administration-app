import type { CompareMetric } from "./metrics.js";
/** One published period, as months since the stretch began, valued as a fraction. */
export type RecordPeriod = {
    readonly from: number;
    readonly to: number;
    readonly label: string;
    readonly value: number | undefined;
};
export type ResolvedHistory = {
    readonly ok: true;
    readonly kind: "landmark";
    readonly id: string;
    readonly label: string;
    readonly value: number;
    readonly note?: string;
} | {
    readonly ok: true;
    readonly kind: "record";
    readonly id: string;
    readonly label: string;
    readonly periods: readonly RecordPeriod[];
    readonly note: string;
} | {
    readonly ok: false;
    readonly id: string;
    readonly label: string;
    readonly reason: string;
};
/** Every past this reading can be set against, the refused ones with their reason. */
export declare function historyOptions(metric: CompareMetric): readonly ResolvedHistory[];
export declare function resolveHistory(metric: CompareMetric, benchmarkId: string): ResolvedHistory;
/** The published figure for the month a campaign week falls in, counted from the oath; undefined before the oath or past the stretch. */
export declare function recordValueAt(periods: readonly RecordPeriod[], turn: number): number | undefined;
/** A stretch's average over the periods it published, or undefined where it published none. */
export declare function recordAverage(periods: readonly RecordPeriod[]): number | undefined;
