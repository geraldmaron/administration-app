import { type KernelStep } from "./commodity-kernel.js";
import { type CommodityShock } from "./commodity-shocks.js";
import type { Campaign, FeedItem, MarketsState } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
/** A weekly move this large reaches the wire. */
export declare const NEWSWORTHY_MOVE = 0.05;
/**
 * What the Record names for this week's move: the heaviest shock while one is
 * standing, the draw-down of stocks or the return of supply once none is, and
 * nothing for a market at rest.
 */
export declare function moveCause(shocks: readonly CommodityShock[], step: KernelStep, previous: number): string | undefined;
/** The markets record this week would leave, and the moves worth a headline. */
export declare function nextMarkets(campaign: Campaign): {
    readonly markets: MarketsState;
    readonly wire: readonly FeedItem[];
};
export declare const commodityPhase: TurnPhase;
