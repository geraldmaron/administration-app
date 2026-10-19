/**
 * The commodities the world trades on, and founding price anchors for the
 * four sourced so far: crude, wheat, corn and soybeans.
 *
 * An index is a quoted price divided by the last full pre-shock
 * measurement. Opening levels are official forecasts used as planning
 * values. A forecast is never a measurement. This module does not write
 * inflation or approval: prices reach an economy as pressure, through
 * `commodity-pressure.ts` and the external-pressure channel.
 */
import type { Campaign } from "./state.js";
import type { MarketQuote } from "./commodity-kernel.js";
export * from "./commodity-kernel.js";
/**
 * The eleven commodities that drive the world's prices, in six families:
 * crude; natural gas and LNG; grains; fertilizer; industrial metals; and the
 * critical minerals. Every one is a member here so a reading can name it; only
 * the anchored ones below carry a founding price so far.
 */
export declare const COMMODITY_IDS: readonly ["crude", "natural-gas", "lng", "wheat", "corn", "soybeans", "potash", "nitrogen", "copper", "lithium", "rare-earths"];
export type CommodityId = (typeof COMMODITY_IDS)[number];
/** The commodities with a sourced founding anchor. */
export type AnchoredCommodityId = "crude" | "wheat" | "corn" | "soybeans";
export type AnchorKind = "historical" | "forecast" | "projection";
export type CommodityAnchor = {
    readonly id: AnchoredCommodityId;
    readonly series: string;
    readonly period: string;
    readonly usd: number;
    readonly unit: "usd_per_barrel" | "usd_per_bushel";
    readonly kind: AnchorKind;
};
/** Brent spot, annual average, index 1.0. EIA-STEO-2026-09 */
export declare const CRUDE_ANCHOR: CommodityAnchor;
/** US season-average farm price, index 1.0. USDA-WASDE-675 */
export declare const WHEAT_ANCHOR: CommodityAnchor;
/** US season-average farm price, index 1.0. USDA-WASDE-675 */
export declare const CORN_ANCHOR: CommodityAnchor;
/** 2027 annual average. Planning forecast, not a measurement. EIA-STEO-2026-09 */
export declare const CRUDE_OPENING_FORECAST: CommodityAnchor;
/** 2026/27 projection. Planning forecast, not a measurement. USDA-WASDE-675 */
export declare const WHEAT_OPENING_FORECAST: CommodityAnchor;
/** 2026/27 projection. Planning forecast, not a measurement. USDA-WASDE-675 */
export declare const CORN_OPENING_FORECAST: CommodityAnchor;
/** US season-average farm price, index 1.0. USDA-WASDE-675 */
export declare const SOYBEANS_ANCHOR: CommodityAnchor;
/** 2026/27 projection. Planning forecast, not a measurement. USDA-WASDE-675 */
export declare const SOYBEANS_OPENING_FORECAST: CommodityAnchor;
/** The sourced price an index of 1 stands for, in its own unit. */
export declare function commodityAnchor(id: AnchoredCommodityId): CommodityAnchor;
/** Quoted price divided by the historical anchor. The anchor itself is 1. */
export declare function commodityIndex(id: AnchoredCommodityId, price: number): number;
/** Opening planning ratio: forecast price over the historical anchor. */
export declare function openingCommodityIndex(id: AnchoredCommodityId): number;
/**
 * Share of world output whose producers are among the named belligerents, read
 * off the production rows of the producer table. Not an inflation write.
 */
export declare function producerShareAtWar(id: AnchoredCommodityId, belligerents: readonly string[]): number;
export type CommodityReading = {
    readonly id: CommodityId;
    readonly index: number;
    /** Weekly indexes, oldest first; empty until the first week has run. */
    readonly series: readonly number[];
    readonly cause?: string;
};
/** One market's carried state, at its reference level with full stocks where the markets record has not reached it. */
export declare function marketQuote(campaign: Campaign, id: CommodityId): MarketQuote;
/** Every commodity's index this week; one the markets record has not reached reads its opening level. */
export declare function selectCommodities(campaign: Campaign): readonly CommodityReading[];
/**
 * The index a reader `from` to `to` weeks behind feels: the average of those
 * past weeks, which is how a retail price follows a wholesale one. A week
 * before the record began read the opening level, because an unmoved market is
 * at its opening level.
 */
export declare function laggedIndex(campaign: Campaign, id: CommodityId, from: number, to: number): number;
