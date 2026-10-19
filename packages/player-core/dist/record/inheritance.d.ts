import { type Campaign, type MetricSet } from "@admin/engine";
/** How one reading moved across the inherited quarter still held in history. */
export type InheritedMove = {
    readonly metric: keyof MetricSet;
    readonly from: number;
    readonly to: number;
};
export type InheritedQuarter = {
    /** Always true: the quarter is reconstructed, never recorded, and a renderer must say so. */
    readonly modeled: true;
    readonly weeks: number;
    readonly moves: readonly InheritedMove[];
};
/**
 * The predecessor's quarter as far as it is still held in `metricHistory`.
 *
 * Undefined once every inherited row has scrolled out of the window — there is
 * nothing left to reconstruct it from, and reporting a quarter this campaign
 * can no longer see would be inventing a second stamp for it.
 */
export declare function inheritedQuarter(campaign: Campaign): InheritedQuarter | undefined;
/**
 * Whether one row of the campaign's metric history is the predecessor's. The
 * one predicate every surface drawing that history reads, dated against the
 * oath rather than counted by index, because the oldest rows scroll out.
 */
export declare function isInheritedRow(campaign: Campaign, index: number): boolean;
