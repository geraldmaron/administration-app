import type { Frequency, MetricDefinition } from "./definitions.js";
export type ComparisonVerdict = {
    readonly status: "compatible";
} | {
    readonly status: "transform";
    readonly steps: readonly string[];
    readonly approximate: boolean;
} | {
    readonly status: "incompatible";
    readonly reason: string;
};
/**
 * How a series can be brought to a coarser cadence, or why it cannot. A stock
 * or a point reading of a rate takes the period's last observation; a flow sums;
 * a year-on-year change or a rate averaged over unequal bases does not
 * aggregate at all, so it is read at the coarser period's end instead of blended.
 */
export declare function resampleRule(def: MetricDefinition, to: Frequency): {
    readonly ok: true;
    readonly step: string;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Whether two definitions describe quantities that may share an axis, and what
 * must be done to them first. Checks run from the most fundamental difference
 * to the least, so the reason a player reads is the first thing wrong.
 */
export declare function checkComparison(a: MetricDefinition, b: MetricDefinition): ComparisonVerdict;
