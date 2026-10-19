import type { Campaign } from "@admin/engine";
/** One observed week. `turn` is the week the reading was filed under. */
export type TrendPoint = {
    readonly turn: number;
    readonly value: number;
};
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
export declare const RECORD_STARTS_AT_LOAD = "The record starts from the day you opened this save. Earlier weeks weren't kept.";
/** Read off the record's opening turn: a campaign past the oath with no record is an older save not yet closed a week. */
export declare function recordStart(campaign: Campaign, since: number | undefined): RecordStart;
/** The last point less the last one filed at least `weeks` before it. */
export declare function changeOver(points: readonly TrendPoint[], weeks: number): number | undefined;
export declare function trendOf(points: readonly TrendPoint[]): TrendChange;
