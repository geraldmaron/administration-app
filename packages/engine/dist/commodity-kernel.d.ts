import type { KernelParams } from "./commodity-registry.js";
/** The part of a market the week carries forward. */
export type MarketQuote = {
    readonly index: number;
    readonly norm: number;
    readonly inventory: number;
};
export type KernelInput = {
    readonly quote: MarketQuote;
    /** Where the market rests with nothing moving it. */
    readonly reference: number;
    readonly params: KernelParams;
    /** Share of world supply lost this week, net of any added. */
    readonly loss: number;
    /** Log-price premium for a threat not yet in the supply. */
    readonly risk: number;
    /** Log-price push from the inputs' own prices. */
    readonly inputPush: number;
    /** A seeded draw in [0, 1). */
    readonly draw: number;
};
/** What set this week's price, each in log-price units at the target, for the Record's "why". */
export type KernelTerms = {
    readonly shortfall: number;
    readonly stocks: number;
    readonly risk: number;
    readonly inputs: number;
};
export type KernelStep = MarketQuote & {
    readonly target: number;
    readonly terms: KernelTerms;
};
/** Planning value: how much of a stock shortfall producers answer with more output each week. */
export declare const RESTOCK_RESPONSE = 0.2;
/** Planning value: how hard thin stocks push the price, per unit of normal cover missing. */
export declare const STOCKS_WEIGHT = 0.3;
/** A year: how long buyers take to treat a new price as the normal one. */
export declare const NORM_WEEKS = 52;
/** One week of one market. Pure: the same quote, shocks and draw give the same week. */
export declare function stepMarket(input: KernelInput): KernelStep;
