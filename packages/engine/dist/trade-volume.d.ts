import { type NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type TradeSectorDef, type TradeSectorId } from "./trade-sectors.js";
import type { TradeMeasureKind } from "./trade.js";
/** Import demand response: a price rise destroys volume in proportion to how easily the buyer goes elsewhere. */
export declare const DEMAND_RESPONSE = 1.6;
/**
 * How hard a measure that is not a rate lands, on the scale a tariff rate is
 * read on. The retaliation model prices an answer off the rate of the thing
 * that provoked it, and the volume model cuts a flow by it; none of these has a
 * rate. An embargo is not a hundred percent of anything, it is the end of the
 * trade.
 */
export declare const COERCION_AS_RATE: Readonly<Record<Exclude<TradeMeasureKind, "tariff">, number>>;
/** The share of a flow a rate removes: the border price rise, times how readily buyers switch. */
export declare function volumeFall(def: TradeSectorDef, rate: number): number;
type Totals = {
    readonly imports: number;
    readonly exports: number;
};
/** One partner's flow in one sector, USD millions a year, before the reliance reading. */
export declare function sectorFlow(campaign: Campaign, partner: NationId, sectorId: TradeSectorId): Totals | undefined;
/**
 * Everything the two countries trade in goods, USD millions a year: every
 * sector as the measures leave it, and the goods no trade sector covers (gold,
 * furniture, toys), which move with the economies and stop for an embargo or
 * a war but carry no sector's tariff.
 */
export declare function bilateralGoods(campaign: Campaign, partner: NationId): Totals;
/** What the United States imports of one sector from everyone, USD millions a year. */
export declare function sectorImports(campaign: Campaign, sectorId: TradeSectorId): number;
export {};
