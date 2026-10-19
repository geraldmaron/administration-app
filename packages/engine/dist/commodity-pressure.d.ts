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
/** What the world's commodity prices are doing to one economy's targets this week. */
export declare function commodityMacroPressure(campaign: Campaign, nation: NationId): CommodityMacroPressure;
