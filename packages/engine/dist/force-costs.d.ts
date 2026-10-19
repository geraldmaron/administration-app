import { type ForceAssetId, type Nation, type NationId, type NationStats } from "@admin/world";
import { type ForcePackage } from "./force-packages.js";
import type { RungLevel } from "./instrument-ids.js";
import { type Campaign } from "./state.js";
/**
 * The United States' price of one unit of each rung, USD millions: what the
 * act costs up front, and what it costs each week the unit stays out.
 *
 * An exercise is priced whole. A carrier group and a blockading destroyer pay
 * their passage to station up front, then their days on it. A strike sortie is
 * priced all-in from a short air campaign's bill, tankers and munitions with
 * it, so the airframes it holds afterward bill nothing more. A brigade pays the
 * shipping of its equipment, then its share of a war's cost in theater.
 */
export type RungPrice = {
    readonly upFront: number;
    readonly weekly: number;
};
export declare const US_FORCE_PRICES: Readonly<Record<RungLevel, RungPrice>>;
/**
 * What a unit of force costs this government against what it costs the United
 * States: its military spending per active service member over the US figure.
 *
 * Derived, not measured. Spending per service member carries pay, equipment
 * and upkeep together, which is what an operation draws on; the price level
 * of a conscript army is not the price level of an all-volunteer one. A
 * government with no standing force has no figure of its own and buys at the
 * only price sourced, the US one.
 */
export declare function militaryCostIndex(actor: NationStats, us: NationStats): number;
/**
 * The index read off the authored figures rather than the live ones, so a
 * government's price of force does not drift with a budget the campaign moves
 * and the yardstick, the US figure, stays where it was sourced.
 */
export declare function campaignCostIndex(campaign: Campaign, actor: NationId): number;
/** The price of a force act, laid out the way a desk would state its basis. */
export type ForceCostBasis = {
    readonly rung: RungLevel;
    /** What is sent: a unit type, or none for an exercise. */
    readonly unitType?: ForceAssetId;
    readonly units: number;
    /** USD millions up front per unit, at US prices. */
    readonly perUnit: number;
    /** The acting government's price of force against the United States' (1 for the US). */
    readonly costIndex: number;
    /** The distance factor on the up-front price: 1 across a shared border. */
    readonly reach: number;
    /** USD millions charged when the act is taken. */
    readonly upFront: number;
    /** USD millions charged each week the force stays committed; 0 where nothing recurs. */
    readonly weekly: number;
};
export declare function forceCostBasis(rung: RungLevel, units: number, costIndex: number, reach: number, unitType?: ForceAssetId): ForceCostBasis;
/**
 * The basis for a military rung as ordered: the package's own count, or with
 * none named the count the rung's package is drawn at (its preferred size,
 * the size an unscaled order commits). An exercise sends no package.
 */
export declare function forceActBasis(campaign: Campaign, actor: Nation, rung: RungLevel, force: ForcePackage | undefined, reach: number): ForceCostBasis;
