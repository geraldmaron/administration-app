import type { Campaign, MetricSet } from "./state.js";
import type { MetricCost } from "./resolution.js";
export type ChargedQuote = {
    readonly cost: MetricCost;
    readonly exhausted: readonly (keyof MetricSet)[];
};
export declare function chargedQuote(cost: MetricCost, campaign: Campaign): ChargedQuote;
