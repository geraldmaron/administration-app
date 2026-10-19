import { WINDOW_PRESETS, normalizePeers, isEconomyMeasure, type EconomyMeasure } from "@admin/player-core";


export const ECONOMY_VIEWS = ["overview", "markets", "trade", "finances", "levers"] as const;
export type EconomyView = (typeof ECONOMY_VIEWS)[number];

export function isEconomyView(value: unknown): value is EconomyView {
  return typeof value === "string" && (ECONOMY_VIEWS as readonly string[]).includes(value);
}


export type EconomyBasis = "us-record" | "history" | "countries";

export type CommoditySort = "registry" | "name" | "change" | "stocks";
export type MarketSearch = {
  readonly view?: EconomyView;
  readonly measure?: EconomyMeasure;
  readonly observation?: number;
  readonly historyWindow?: "term" | "published" | undefined;
  readonly basis?: EconomyBasis;
  readonly comparisonWindow?: string;
  readonly peers?: readonly string[];
  readonly peerWindow?: string;
  readonly sort?: CommoditySort;
  readonly direction?: "ascending" | "descending";
};
export type MarketPatch = { readonly [K in keyof MarketSearch]?: MarketSearch[K] | undefined };

/** Only presentation state is stored in the URL; no replay action advances the game. */
export function marketSearch(search: Record<string, unknown>): MarketSearch {
  const sort = ["name", "change", "stocks"].find((key) => key === search.sort) as CommoditySort | undefined;
  const observation = typeof search.observation === "number" && Number.isSafeInteger(search.observation) && search.observation >= 0 ? Math.min(search.observation, 10000) : undefined;
  const peers = Array.isArray(search.peers) ? normalizePeers(search.peers.filter((id): id is string => typeof id === "string")) : undefined;
  return {
    ...(isEconomyView(search.view) && search.view !== "overview" ? { view: search.view } : {}),
    ...(isEconomyMeasure(search.measure) ? { measure: search.measure } : {}),
    ...(search.historyWindow === "published" || search.historyWindow === "term" ? { historyWindow: search.historyWindow } : {}),
    ...(search.basis === "us-record" || search.basis === "history" || search.basis === "countries" ? { basis: search.basis } : {}),
    ...(typeof search.comparisonWindow === "string" && WINDOW_PRESETS.some((window) => window.id === search.comparisonWindow) ? { comparisonWindow: search.comparisonWindow } : {}),
    ...(peers !== undefined ? { peers } : {}),
    ...(typeof search.peerWindow === "string" && WINDOW_PRESETS.some((window) => window.id === search.peerWindow) ? { peerWindow: search.peerWindow } : {}),
    ...(observation !== undefined ? { observation } : {}),
    ...(sort ? { sort } : {}),
    ...(search.direction === "descending" ? { direction: "descending" as const } : {}),
  };
}
