import type { CommodityId } from "./commodities.js";
import { type StraitPassage } from "./strait-passage.js";
import { type Campaign } from "./state.js";
export type CommodityShockKind = "war" | "route" | "blockade" | "sanction" | "harvest" | "release";
export type CommodityShock = {
    readonly commodity: CommodityId;
    readonly kind: CommodityShockKind;
    /** What the Record and the screens name as the cause. */
    readonly cause: string;
    /** Share of world supply lost this week; negative where supply is added. */
    readonly loss: number;
    /** Log-price premium for a threat that has not yet cut any supply. */
    readonly risk: number;
    /** For a contested strait: who the governments closing it let through and who they stop. */
    readonly passage?: StraitPassage;
};
/**
 * Planning values: the share of a principal belligerent's output a war at full
 * intensity takes off the market. A defender fights on its own fields and
 * wells; an aggressor fights abroad, and its output mostly keeps flowing.
 */
export declare const WAR_OUTPUT_LOSS: {
    readonly defender: 0.5;
    readonly aggressor: 0.02;
};
/** Planning value: how much of a strait a war with a government on its shores closes at full intensity. */
export declare const ROUTE_CLOSURE = 0.5;
/** Planning value: the log-price premium per unit of a threatened strait's share, at full intensity. */
export declare const ROUTE_RISK = 0.3;
/** Planning value: sanctioned output finds other buyers at a discount, so a measure cuts less than its trade rate. */
export declare const SANCTION_BITE = 0.3;
/** Planning value: the share of a supplier's output a condition at full severity takes. */
export declare const CONDITION_OUTPUT_LOSS = 0.3;
/** Planning value: a Strategic Petroleum Reserve release, as a share of world crude supply. */
export declare const RESERVE_RELEASE_SHARE = 0.01;
/** Whether a reserve release covers today. */
export declare function reserveReleasing(campaign: Campaign): boolean;
/** Everything moving one market this week, heaviest first. */
export declare function commodityShocks(campaign: Campaign, id: CommodityId): readonly CommodityShock[];
/** The week's shocks as one supply loss and one premium, the loss capped so no week empties a market. */
export declare function netShock(shocks: readonly CommodityShock[]): {
    readonly loss: number;
    readonly risk: number;
};
