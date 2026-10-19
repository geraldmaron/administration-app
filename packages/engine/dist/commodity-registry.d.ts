import { type NationId } from "@admin/world";
import type { ConditionKind } from "./condition-kinds.js";
import { type AnchoredCommodityId, type CommodityId } from "./commodities.js";
export type CommodityFamily = "crude" | "gas" | "grains" | "fertilizer" | "metals" | "minerals";
export type CommodityReader = "pump" | "grocery" | "home-energy" | "farm-costs" | "factory-inputs" | "defense-tech";
/**
 * How a market of this kind answers pressure. Every figure here is a planning
 * value, stated once and labeled: no opened source gives a weekly
 * price-adjustment speed or a short-run elasticity for a game week.
 */
export type KernelParams = {
    /** Log-price change per unit of pressure at rest. */
    readonly sensitivity: number;
    /** Share of the distance to the target price closed in a week. */
    readonly speed: number;
    /** The most the log price may move in one week. */
    readonly weeklyCap: number;
    /** Spare output that answers a loss, as a share of world supply. */
    readonly spare: number;
    /** Normal stocks, in weeks of demand. */
    readonly coverWeeks: number;
    /** How much demand falls per unit of log price above its reference. */
    readonly elasticity: number;
    /** Half-width of the seeded weekly residual, in log price. */
    readonly residual: number;
};
/**
 * A strait a commodity's trade passes through: the share of world supply that
 * does, the share of that flow a pipeline or a sea detour can carry when it is
 * shut, and the governments on its shores, any of which at war contests it.
 */
export type CommodityRoute = {
    readonly chokepoint: string;
    readonly share: number;
    readonly bypass: number;
    readonly littoral: readonly NationId[];
    readonly provenance: string;
};
/** Another commodity whose price is part of this one's cost, felt after a lag. */
export type CommodityInput = {
    readonly from: CommodityId;
    readonly weight: number;
    readonly lagWeeks: number;
};
export type CommodityDef = {
    readonly id: CommodityId;
    readonly name: string;
    readonly family: CommodityFamily;
    readonly reader: CommodityReader;
    readonly params: KernelParams;
    readonly routes: readonly CommodityRoute[];
    readonly inputs: readonly CommodityInput[];
    /** The acute conditions that cut this commodity's output where they strike a producer. */
    readonly hitBy: readonly ConditionKind[];
    /** Planning producer shares, used only where no opened source gives a world share. */
    readonly planningProducers?: Readonly<Record<string, number>>;
};
export declare const COMMODITY_DEFS: Readonly<Record<CommodityId, CommodityDef>>;
export declare function isAnchored(id: CommodityId): id is AnchoredCommodityId;
/**
 * The level a market rests at: the opening planning ratio for a commodity with
 * a sourced anchor, 1 for the rest, which have no sourced price and are read as
 * an index on the oath.
 */
export declare function referenceIndex(id: CommodityId): number;
export type ProducerShare = {
    readonly nation: NationId;
    readonly share: number;
};
/** Each listed producer's share of world output, from the production rows alone. */
export declare function productionShares(id: CommodityId): readonly ProducerShare[];
/**
 * Who supplies the world market. A grain's world price is set by what is
 * traded, so where the table carries exporters their shares stand in for the
 * market; elsewhere production does, and a commodity with neither on file reads
 * its planning shares.
 */
export declare function supplierShares(id: CommodityId): readonly ProducerShare[];
/** A nation's share of the world market for one commodity, 0 where it is not a listed supplier. */
export declare function supplierShare(id: CommodityId, nation: NationId): number;
export declare const COMMODITY_FAMILIES: readonly CommodityFamily[];
export declare function commoditiesIn(family: CommodityFamily): readonly CommodityId[];
