import type { Campaign } from "@admin/engine";
import { type CompareMetricId } from "./metrics.js";
import type { Better, CompareBenchmarkKind, FormatKind } from "./types.js";
export type SelfComparisonKind = "inauguration" | "four-weeks-ago" | CompareBenchmarkKind;
export type SelfComparison = {
    readonly id: string;
    readonly label: string;
    readonly kind: SelfComparisonKind;
    /** The figure compared against, on the reading's own scale. */
    readonly value?: number;
    /** Now less the figure; positive is higher. */
    readonly gap?: number;
    /** Whether the gap favors the President, under the reading's own better direction. */
    readonly standing?: "better" | "worse" | "level";
    /** The gap in words, or why there is none. */
    readonly sentence: string;
};
export type SelfVersus = {
    readonly metricId: CompareMetricId;
    readonly label: string;
    readonly format: FormatKind;
    readonly better: Better;
    readonly now?: number;
    /** Why there is no figure this week, where there is not. */
    readonly unavailable?: string;
    readonly comparisons: readonly SelfComparison[];
};
/** This presidency now against the oath, four weeks ago, and every defined line for the reading. */
export declare function selfVersus(campaign: Campaign, metricId: CompareMetricId): SelfVersus;
