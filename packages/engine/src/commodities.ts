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
import type { Campaign, CommodityQuote } from "./state.js";
import { productionShares, referenceIndex } from "./commodity-registry.js";
import type { MarketQuote } from "./commodity-kernel.js";

export * from "./commodity-kernel.js";

/**
 * The eleven commodities that drive the world's prices, in six families:
 * crude; natural gas and LNG; grains; fertilizer; industrial metals; and the
 * critical minerals. Every one is a member here so a reading can name it; only
 * the anchored ones below carry a founding price so far.
 */
export const COMMODITY_IDS = [
  "crude",
  "natural-gas",
  "lng",
  "wheat",
  "corn",
  "soybeans",
  "potash",
  "nitrogen",
  "copper",
  "lithium",
  "rare-earths",
] as const;

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
export const CRUDE_ANCHOR: CommodityAnchor = {
  id: "crude",
  series: "Brent spot, annual average",
  period: "2025",
  usd: 69,
  unit: "usd_per_barrel",
  kind: "historical",
};

/** US season-average farm price, index 1.0. USDA-WASDE-675 */
export const WHEAT_ANCHOR: CommodityAnchor = {
  id: "wheat",
  series: "US season-average farm price",
  period: "2024/25",
  usd: 5.52,
  unit: "usd_per_bushel",
  kind: "historical",
};

/** US season-average farm price, index 1.0. USDA-WASDE-675 */
export const CORN_ANCHOR: CommodityAnchor = {
  id: "corn",
  series: "US season-average farm price",
  period: "2024/25",
  usd: 4.24,
  unit: "usd_per_bushel",
  kind: "historical",
};

/** 2027 annual average. Planning forecast, not a measurement. EIA-STEO-2026-09 */
export const CRUDE_OPENING_FORECAST: CommodityAnchor = {
  id: "crude",
  series: "Brent spot, annual average",
  period: "2027",
  usd: 74,
  unit: "usd_per_barrel",
  kind: "forecast",
};

/** 2026/27 projection. Planning forecast, not a measurement. USDA-WASDE-675 */
export const WHEAT_OPENING_FORECAST: CommodityAnchor = {
  id: "wheat",
  series: "US season-average farm price",
  period: "2026/27",
  usd: 6.4,
  unit: "usd_per_bushel",
  kind: "projection",
};

/** 2026/27 projection. Planning forecast, not a measurement. USDA-WASDE-675 */
export const CORN_OPENING_FORECAST: CommodityAnchor = {
  id: "corn",
  series: "US season-average farm price",
  period: "2026/27",
  usd: 4.8,
  unit: "usd_per_bushel",
  kind: "projection",
};

/** US season-average farm price, index 1.0. USDA-WASDE-675 */
export const SOYBEANS_ANCHOR: CommodityAnchor = {
  id: "soybeans",
  series: "US season-average farm price",
  period: "2024/25",
  usd: 10,
  unit: "usd_per_bushel",
  kind: "historical",
};

/** 2026/27 projection. Planning forecast, not a measurement. USDA-WASDE-675 */
export const SOYBEANS_OPENING_FORECAST: CommodityAnchor = {
  id: "soybeans",
  series: "US season-average farm price",
  period: "2026/27",
  usd: 12,
  unit: "usd_per_bushel",
  kind: "projection",
};

const HISTORICAL: Record<AnchoredCommodityId, CommodityAnchor> = {
  crude: CRUDE_ANCHOR,
  wheat: WHEAT_ANCHOR,
  corn: CORN_ANCHOR,
  soybeans: SOYBEANS_ANCHOR,
};

const OPENING: Record<AnchoredCommodityId, CommodityAnchor> = {
  crude: CRUDE_OPENING_FORECAST,
  wheat: WHEAT_OPENING_FORECAST,
  corn: CORN_OPENING_FORECAST,
  soybeans: SOYBEANS_OPENING_FORECAST,
};

/** The sourced price an index of 1 stands for, in its own unit. */
export function commodityAnchor(id: AnchoredCommodityId): CommodityAnchor {
  return rowFor(HISTORICAL, id);
}

function rowFor(table: Record<AnchoredCommodityId, CommodityAnchor>, id: AnchoredCommodityId): CommodityAnchor {
  const row = table[id];
  if (!row) throw new Error(`Unknown commodity: ${id}`);
  return row;
}

/** Quoted price divided by the historical anchor. The anchor itself is 1. */
export function commodityIndex(id: AnchoredCommodityId, price: number): number {
  return price / rowFor(HISTORICAL, id).usd;
}

/** Opening planning ratio: forecast price over the historical anchor. */
export function openingCommodityIndex(id: AnchoredCommodityId): number {
  return rowFor(OPENING, id).usd / rowFor(HISTORICAL, id).usd;
}

/**
 * Share of world output whose producers are among the named belligerents, read
 * off the production rows of the producer table. Not an inflation write.
 */
export function producerShareAtWar(id: AnchoredCommodityId, belligerents: readonly string[]): number {
  const atWar = new Set(belligerents);
  return productionShares(id).reduce((sum, row) => (atWar.has(row.nation as string) ? sum + row.share : sum), 0);
}

export type CommodityReading = {
  readonly id: CommodityId;
  readonly index: number;
  /** Weekly indexes, oldest first; empty until the first week has run. */
  readonly series: readonly number[];
  readonly cause?: string;
};

/** One market's carried state, at its reference level with full stocks where the markets record has not reached it. */
export function marketQuote(campaign: Campaign, id: CommodityId): MarketQuote {
  const quote: CommodityQuote | undefined = campaign.markets?.commodities[id];
  const reference = referenceIndex(id);
  return { index: quote?.index ?? reference, norm: quote?.norm ?? quote?.index ?? reference, inventory: quote?.inventory ?? 1 };
}

/** Every commodity's index this week; one the markets record has not reached reads its opening level. */
export function selectCommodities(campaign: Campaign): readonly CommodityReading[] {
  return COMMODITY_IDS.map((id) => {
    const quote = campaign.markets?.commodities[id];
    return { id, index: quote?.index ?? referenceIndex(id), series: quote?.series ?? [], ...(quote?.cause ? { cause: quote.cause } : {}) };
  });
}

/**
 * The index a reader `from` to `to` weeks behind feels: the average of those
 * past weeks, which is how a retail price follows a wholesale one. A week
 * before the record began read the opening level, because an unmoved market is
 * at its opening level.
 */
export function laggedIndex(campaign: Campaign, id: CommodityId, from: number, to: number): number {
  const series = campaign.markets?.commodities[id]?.series ?? [];
  const reference = referenceIndex(id);
  let sum = 0;
  for (let lag = from; lag <= to; lag += 1) sum += series[series.length - 1 - lag] ?? reference;
  return sum / (to - from + 1);
}
