import type { PhaseStart } from "./approval-attribution.js";
import type { Campaign } from "./state.js";
export type AttributedMetric = "stability" | "treasury";
export declare const ATTRIBUTED_METRICS: readonly AttributedMetric[];
/** The stretch before the tick where the President acts. */
export declare const DECISIONS = "decisions";
/** The stretch before the tick where the day resolvers run. Not a phase, so no phase observer sees it. */
export declare const DAY_RESOLVERS = "dayResolvers";
/** What one stretch of the week did to a metric over a run, falls and rises kept apart. */
export type StretchMovement = {
    readonly fell: number;
    readonly rose: number;
};
export type MetricAttribution = Readonly<Record<AttributedMetric, Readonly<Record<string, StretchMovement>>>>;
export declare function openMetricAttribution(): MetricAttribution;
/**
 * One harness week: `start` before the President acted, `decided` after, then
 * each stretch the harness observed from the state it began on to the next
 * one's, the last running to `end`.
 */
export declare function attributeMetricWeek(ledger: MetricAttribution, start: Campaign, decided: Campaign, stretches: readonly PhaseStart[], end: Campaign): MetricAttribution;
/** A stretch's part of all the movement a metric made, as shares of the gross falls and gross rises. */
export type StretchShare = {
    readonly id: string;
    readonly fell: number;
    readonly rose: number;
};
/** Each stretch's share of a metric's gross falls and rises, the stretch that moved it furthest first. Shares of zero movement read zero. */
export declare function metricShares(attributions: readonly MetricAttribution[], metric: AttributedMetric): readonly StretchShare[];
