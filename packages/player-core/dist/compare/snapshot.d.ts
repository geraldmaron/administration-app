import type { Campaign } from "@admin/engine";
import { type CompareMetricId } from "./metrics.js";
import type { Better, FormatKind, Subject } from "./types.js";
/** A row's place in one column: 1 is best. */
export type CellRank = {
    readonly rank: number;
    readonly of: number;
    readonly percentile: number;
};
export type SnapshotMetric = {
    readonly id: CompareMetricId;
    readonly label: string;
    readonly unit: string;
    readonly format: FormatKind;
    readonly better: Better;
    /** The median of the compared governments or states, where at least two carry the reading. */
    readonly benchmark?: {
        readonly label: string;
        readonly value: number;
    };
};
export type SnapshotRow = {
    readonly id: string;
    readonly subject: Subject;
    readonly label: string;
    readonly values: Readonly<Record<string, number | null>>;
    /** Why a cell is empty, keyed by metric. */
    readonly reasons: Readonly<Partial<Record<CompareMetricId, string>>>;
    readonly ranks: Readonly<Partial<Record<CompareMetricId, CellRank>>>;
    readonly self?: true;
    readonly reference?: true;
};
export type CompareSnapshot = {
    readonly metrics: readonly SnapshotMetric[];
    readonly rows: readonly SnapshotRow[];
};
/**
 * Ranks one column by which direction is better. Ties share the better rank;
 * the percentile is the share of ranked rows this one beats or equals, so the
 * best is 1 and a lone row is 1.
 */
export declare function rankColumn(values: readonly (number | null)[], better: Better): readonly (CellRank | undefined)[];
/** Every subject's figure on every reading this week, ranked within each column, with each column's median. */
export declare function compareSnapshot(campaign: Campaign, metricIds: readonly CompareMetricId[], subjects: readonly Subject[]): CompareSnapshot;
