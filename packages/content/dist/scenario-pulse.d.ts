import { type Campaign, type CommodityId } from "@admin/engine";
import { z } from "zod";
/** Where inflation sits against the 2 percent the Fed targets. */
export declare const INFLATION_BANDS: readonly ["below-target", "near-target", "elevated", "high"];
export type InflationBand = (typeof INFLATION_BANDS)[number];
/** How much work there is for people who want it. */
export declare const UNEMPLOYMENT_BANDS: readonly ["tight", "normal", "slack", "severe"];
export type UnemploymentBand = (typeof UNEMPLOYMENT_BANDS)[number];
/** How far the cost of living has moved since the oath. */
export declare const COST_OF_LIVING_BANDS: readonly ["easing", "steady", "rising", "straining"];
export type CostOfLivingBand = (typeof COST_OF_LIVING_BANDS)[number];
/** Which way crime has moved since the oath. */
export declare const CRIME_TRENDS: readonly ["falling", "steady", "rising"];
export type CrimeTrend = (typeof CRIME_TRENDS)[number];
/** Mirrors the engine's `CyclePhase`; the test holds the two to one list. */
export declare const CYCLE_PHASES: readonly ["expansion", "peak", "contraction", "trough"];
/**
 * The commodities the market model prices, by the ids its data table uses.
 * Mirrored here rather than imported because the market model is being built
 * beside this vocabulary; the integration test holds the two to one list once
 * it lands (see the content notes).
 */
export type ContentCommodityId = CommodityId;
/** Where a commodity's index sits against its anchor (1.0 is the last full pre-shock period). */
export declare const COMMODITY_BANDS: readonly ["slumped", "normal", "elevated", "spiking"];
export type CommodityBand = (typeof COMMODITY_BANDS)[number];
export declare const PULSE_CONDITIONS: readonly [z.ZodObject<{
    kind: z.ZodLiteral<"inflationBand">;
    in: z.ZodArray<z.ZodEnum<{
        high: "high";
        "below-target": "below-target";
        "near-target": "near-target";
        elevated: "elevated";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"unemploymentBand">;
    in: z.ZodArray<z.ZodEnum<{
        tight: "tight";
        normal: "normal";
        slack: "slack";
        severe: "severe";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"costOfLivingBand">;
    in: z.ZodArray<z.ZodEnum<{
        easing: "easing";
        steady: "steady";
        rising: "rising";
        straining: "straining";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"crimeTrend">;
    in: z.ZodArray<z.ZodEnum<{
        steady: "steady";
        rising: "rising";
        falling: "falling";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"cyclePhase">;
    in: z.ZodArray<z.ZodEnum<{
        expansion: "expansion";
        peak: "peak";
        contraction: "contraction";
        trough: "trough";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"commodityBand">;
    commodity: z.ZodEnum<{
        crude: "crude";
        "natural-gas": "natural-gas";
        lng: "lng";
        wheat: "wheat";
        corn: "corn";
        soybeans: "soybeans";
        potash: "potash";
        nitrogen: "nitrogen";
        copper: "copper";
        lithium: "lithium";
        "rare-earths": "rare-earths";
    }>;
    in: z.ZodArray<z.ZodEnum<{
        elevated: "elevated";
        normal: "normal";
        slumped: "slumped";
        spiking: "spiking";
    }>>;
}, z.core.$strip>];
type PulseCondition = z.infer<(typeof PULSE_CONDITIONS)[number]>;
/** Planning values: under 1 percent, within a point of the target, up to 5, and past it. */
export declare function inflationBandOf(rate: number): InflationBand;
/** Planning values: under 4 percent, to 5.5, to 8, and past it. */
export declare function unemploymentBandOf(rate: number): UnemploymentBand;
/** Planning values: the index against the oath's, falling at all, within 3 percent, to 8, and past it. */
export declare function costOfLivingBandOf(now: number, atOath: number): CostOfLivingBand;
/** Planning value: three points of the crime index either way is a trend; less is noise. */
export declare function crimeTrendOf(now: number, atOath: number): CrimeTrend;
/** Planning values: under 0.85 of the anchor, within 15 percent of it, to 1.4, and past it. */
export declare function commodityBandOf(index: number): CommodityBand;
/**
 * The narrow interface the market model is read through: a commodity's index
 * against its anchor; an unmoved market reads the engine's opening level.
 * Structural rather than imported, so this reads the stored markets the moment
 * they exist without this package having to be edited when they land.
 */
export declare function commodityIndex(campaign: Campaign, commodity: ContentCommodityId): number;
/** Whether a pulse gate holds on this board. The player's own country; a pulse gate never reads the counterpart. */
export declare function pulseMet(campaign: Campaign, condition: PulseCondition): boolean;
export {};
