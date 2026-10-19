import { type Campaign, type MetricCost, type RiskBranch } from "@admin/engine";
import type { ComparisonRow } from "../conversation/decision-comparison.js";
/** What an act would charge and what follows from it, in the shape every engine projection on a chair returns. */
export type ActPrice = {
    readonly cost: MetricCost;
    readonly risks: readonly RiskBranch[];
};
export type PricedOption = {
    readonly id: string;
    readonly label: string;
    /** Why the engine refuses this option today, in its own words. */
    readonly unavailable?: string;
    readonly price?: ActPrice;
    /** What follows that the price does not say. */
    readonly follows?: readonly string[];
};
/**
 * The rows a priced comparison is read on: every reading any option moves,
 * then what follows. A row an option has nothing to say on reads "No change",
 * never a blank.
 */
export declare function pricedRows(campaign: Campaign, options: readonly PricedOption[]): readonly ComparisonRow[];
