import { type Campaign, type CaseKind } from "@admin/engine";
import { type CommodityBand, type ContentCommodityId } from "@admin/content";
import { type FamilySource } from "./family-raise";
export type CommodityFactory = {
    readonly id: string;
    readonly commodities: readonly ContentCommodityId[];
    /** The bands that raise the case; a case raised on the worse band is the hard one. */
    readonly raiseOn: readonly CommodityBand[];
    readonly hardOn: CommodityBand;
    readonly kind: Extract<CaseKind, "emergency" | "foreign-request">;
    /** Weeks until the family's own default, when nobody decides. */
    readonly clockWeeks: number;
    readonly title: (commodity: string, band: CommodityBand) => string;
    readonly reason: (commodity: string, band: CommodityBand) => string;
};
/**
 * The factories, bounded on purpose: four questions a real White House is
 * asked when a traded price moves, each on the case family whose contract
 * already fits it. Planning values: the clock lengths are how long the question
 * stays open before the family's default answers it.
 */
export declare const COMMODITY_FACTORIES: readonly CommodityFactory[];
/** Every commodity case the markets raise this week, one per factory and commodity past its line. */
export declare function commoditySources(campaign: Campaign): readonly FamilySource[];
/** What a commodity case settled on when the market came back before anything was decided. */
export declare const COMMODITY_EASED = "Prices went back to normal before anything was decided.";
