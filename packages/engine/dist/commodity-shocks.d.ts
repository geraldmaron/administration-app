import { type NationId } from "@admin/world";
import { type CommodityRoute } from "./commodity-registry.js";
import type { CommodityId } from "./commodities.js";
import { type StraitPassage } from "./strait-passage.js";
import { type Campaign, type Conflict } from "./state.js";
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
/**
 * How much of a strait's stopped cargo a war with a government on its shores
 * keeps from getting through at full intensity. Fitted, not measured: with
 * per-flag passage, the pipelines, the barrels the war already took at origin
 * (weighted by EIA's loadings by origin) and the war's own lost output, 0.68
 * makes a full-intensity Hormuz war take 9.6 percent of world supply, the
 * 10.4 Mb/d of 108.42 EIA's Short-Term Energy Outlook gives as shut in in
 * April 2026 (July edition, Table 1; October edition, Table 3a; opened
 * 2026-10-13).
 */
export declare const ROUTE_CLOSURE = 0.68;
/** Planning value: the log-price premium per unit of a threatened strait's share, at full intensity. */
export declare const ROUTE_RISK = 0.3;
/** Planning value: sanctioned output finds other buyers at a discount, so a measure cuts less than its trade rate. */
export declare const SANCTION_BITE = 0.3;
/** Planning value: the share of a supplier's output a condition at full severity takes. */
export declare const CONDITION_OUTPUT_LOSS = 0.3;
/** Planning value: a Strategic Petroleum Reserve release, as a share of world crude supply. */
export declare const RESERVE_RELEASE_SHARE = 0.01;
/**
 * A strait a war contests this week, for one commodity: who the governments
 * closing it let through, how much of the stopped flags' cargo the war keeps
 * from getting through, and how much of the strait's flow was already off the
 * market before it reached the water.
 */
export type ContestedRoute = {
    readonly route: CommodityRoute;
    readonly threat: Conflict;
    readonly passage: StraitPassage;
    /** 0..1: the threat's intensity times `ROUTE_CLOSURE`. */
    readonly closure: number;
    /** 0..1 of the strait's flow that the war, a blockade or a measure already took from the producers who ship it. */
    readonly upstreamLost: number;
};
/** How badly a government is hurt if a strait closes, from the dataset's lanes (`geo.chokepointDependence`), 0 where it has none on file. */
export declare function chokepointDependence(campaign: Campaign, nation: NationId, chokepoint: string): number;
/**
 * 0..1 of a nation's oil consumption that the strait's cargo bound for it
 * carries: the cargo table's barrels over EIA's consumption series. Undefined
 * where the source names no such cargo or no consumption, and for any
 * commodity but crude, whose cargo and consumption are in the same barrels.
 */
export declare function cargoDependence(nation: NationId, chokepoint: string, commodity: CommodityId): number | undefined;
/**
 * 0..1 of a nation's crude sold abroad that loads behind a strait: the origin
 * table's barrels over EIA's crude production less the country's own oil
 * consumption. Undefined where the source names no such origin.
 */
export declare function originDependence(nation: NationId, chokepoint: string, commodity: CommodityId): number | undefined;
/** Every strait a war contests this week for one commodity. */
export declare function contestedRoutes(campaign: Campaign, id: CommodityId): readonly ContestedRoute[];
/** The share of a producer's output this week's wars already take, so a blockade is not charged for the same barrels. */
export declare function warLossFraction(nation: NationId, conflicts: readonly Conflict[]): number;
/** Whether a reserve release covers today. */
export declare function reserveReleasing(campaign: Campaign): boolean;
/** Everything moving one market this week, heaviest first. */
export declare function commodityShocks(campaign: Campaign, id: CommodityId): readonly CommodityShock[];
/** The week's shocks as one supply loss and one premium, the loss capped so no week empties a market. */
export declare function netShock(shocks: readonly CommodityShock[]): {
    readonly loss: number;
    readonly risk: number;
};
