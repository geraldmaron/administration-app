import type { CommodityId } from "./commodities.js";
import { type Campaign, type CommodityQuote, type EquityState, type MarketsState } from "./state.js";
export type EquityInputs = {
    readonly growthSurprise: number;
    readonly cycleDrag: number;
    readonly uncertainty: number;
    readonly commodityShock: number;
};
export declare function equityIndex(inputs: EquityInputs): number;
/** Starting threshold, labeled here, not sourced. An 8 percent drop. */
export declare const CRASH_DROP = 0.08;
export declare function marketCrash(previous: number, next: number): boolean;
/** Planning value: the share of the distance to the fair level the index closes in a week. */
export declare const EQUITY_SPEED = 0.3;
/** Planning value: half-width of the seeded weekly wobble on the level. */
export declare const EQUITY_WOBBLE = 0.015;
/** Planning values: how much each standing uncertainty adds, together capped at 1. */
export declare const UNCERTAINTY_WEIGHTS: {
    readonly war: 0.3;
    readonly shutdown: 0.3;
    readonly debtLimit: 0.5;
};
/** How unsettled the country is this week: a war it is party to, a shutdown, a binding debt limit. */
export declare function policyUncertainty(campaign: Campaign): number;
/** What the index is answering this week, read off the United States' own economy and the price of crude. */
export declare function equityInputs(campaign: Campaign, crude: CommodityQuote | undefined): EquityInputs;
/** The equity record after this week, given the commodity quotes the same week set. */
export declare function nextEquity(campaign: Campaign, commodities: Readonly<Partial<Record<CommodityId, CommodityQuote>>>): EquityState;
export { applyMarkets, type MarketsEffect } from "./world-effects.js";
/**
 * The equity level this week, 1 at the oath. A campaign whose markets have
 * never moved reads the founding level rather than nothing, because a level
 * of 1 is what an unmoved index is.
 */
export declare function selectEquityLevel(campaign: Campaign): number;
/** The weekly equity levels, oldest first, beginning with the oath's 1. */
export declare function selectEquitySeries(campaign: Campaign): readonly number[];
/** A crash the week it happened: last week's level, this week's, and the fall between them. */
export type MarketShock = {
    readonly from: number;
    readonly to: number;
    readonly drop: number;
};
/** This week's crash, if the index's last step fell past the crash line; nothing in any other week. */
export declare function selectMarketShock(campaign: Campaign): MarketShock | undefined;
/** A blank markets record: every commodity at its opening level, the index at 1. */
export declare function emptyMarkets(): MarketsState;
