import type { NationId } from "@admin/world";
import { type Campaign } from "./state.js";
export type CommodityMacroPressure = {
    readonly growth: number;
    readonly inflation: number;
};
/** Planning values: growth per unit of an energy price change, for a full importer and a full exporter. */
export declare const ENERGY_TRADE: {
    readonly importBill: 0.02;
    readonly exportRent: 0.06;
};
/** Planning value: growth lost per unit of an economy's energy supply that does not arrive, beyond the price it pays for the rest. */
export declare const SHORTFALL_COST = 0.1;
/** What the world's commodity prices are doing to one economy's targets this week. */
export declare function commodityMacroPressure(campaign: Campaign, nation: NationId): CommodityMacroPressure;
