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
/**
 * Export demand response: how sharply a foreign buyer turns away from American
 * goods a tariff of its own makes dearer, when the same goods sell at the world
 * price from other origins. Fitted, not a measured elasticity: USDA ERS (Amber
 * Waves, 2022-03-07, opened 2026-10-25) reports that China's retaliatory
 * tariffs, 5 to 25 percent, reduced the value of US agricultural exports to
 * China by 76 percent from mid-2018 through 2019; a 25 percent answer on row
 * crops falls by about that at this figure.
 */
export declare const RETALIATION_RESPONSE = 6.2;
/**
 * The half-life, in days, of a tariffed partner's lost sales turning toward
 * other suppliers. Fitted, not measured: Census goods trade (opened
 * 2026-10-25) has US imports from China falling $89.4 billion from 2018 to
 * 2019 while all US imports fell $44.4 billion, so about half the lost Chinese
 * flow was bought elsewhere within the year. With buyers replacing at most a
 * sector's `substitutability`, 91 days brings the replaced share over the
 * year after a tariff near that half. The record is all goods and mixes the
 * tariffs with 2019's other causes, so the fit is a planning value.
 */
export declare const DIVERSION_HALF_LIFE_DAYS = 91;
/** The share of an American export flow a partner's answering tariff removes. */
export declare function retaliationFall(def: TradeSectorDef, rate: number): number;
/** The share of a flow a rate removes: the border price rise, times how readily buyers switch. */
export declare function volumeFall(def: TradeSectorDef, rate: number): number;
type Totals = {
    readonly imports: number;
    readonly exports: number;
};
/**
 * What the partner's standing answers leave of American sales in one sector:
 * each retaliatory tariff takes its fall of what the others left, as rates on
 * the same goods compound. The one figure both this book and the economy's
 * export loss (`external-pressure.ts`) read.
 */
export declare function retaliationLeft(campaign: Campaign, partner: NationId, def: TradeSectorDef): number;
/**
 * The trade sector a government's leading export to the world falls in: the
 * first of its listed exports (`trade.topExports`, ranked by value) that a
 * trade sector covers, and within it the one it sells the United States most,
 * the taxonomy's own order breaking a tie.
 */
export declare function leadingExportOf(topExports: readonly string[], soldToUs: Readonly<Record<string, number>>): TradeSectorId | undefined;
/** Every trade sector a government's listed exports fall in, leading first, as `leadingExportOf` orders them. */
export declare function exportGoodsOf(topExports: readonly string[], soldToUs: Readonly<Record<string, number>>): readonly TradeSectorId[];
export declare function leadingExportSector(campaign: Campaign, nation: NationId): TradeSectorId | undefined;
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
