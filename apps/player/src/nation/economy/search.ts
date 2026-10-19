import { WINDOW_PRESETS, isEconomyMeasure, normalizePeers, type EconomyMeasure } from "@admin/player-core";
import type { CommoditySort } from "./Markets";
import type { EconomyBasis } from "./Rates";

export const ECONOMY_VIEWS = ["overview", "markets", "trade", "finances", "levers"] as const;
export type EconomyView = (typeof ECONOMY_VIEWS)[number];
export const isEconomyView = (value: unknown): value is EconomyView => typeof value === "string" && (ECONOMY_VIEWS as readonly string[]).includes(value);

export type EconomySearch = {
  readonly view?: EconomyView;
  readonly measure?: EconomyMeasure;
  readonly observation?: number;
  readonly historyWindow?: "term" | "published";
  readonly basis?: EconomyBasis;
  readonly comparisonWindow?: string;
  readonly peers?: readonly string[];
  readonly peerWindow?: string;
  readonly sort?: CommoditySort;
  readonly direction?: "ascending" | "descending";
};

const one = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);
const BASES: readonly EconomyBasis[] = ["us-record", "history", "countries", "world"];

/** Only presentation state is kept in the address; no replay advances the game. */
export function economySearch(raw: Readonly<Record<string, unknown>>): EconomySearch {
  const search = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, one(value)]));
  const sort = (["name", "change", "stocks"] as const).find((key) => key === search.sort);
  const observation = Number(search.observation);
  const peers = typeof search.peers === "string" && search.peers ? normalizePeers(search.peers.split(",")) : undefined;
  const preset = (value: unknown) => typeof value === "string" && WINDOW_PRESETS.some((window) => window.id === value);
  return {
    ...(isEconomyView(search.view) && search.view !== "overview" ? { view: search.view } : {}),
    ...(isEconomyMeasure(search.measure) ? { measure: search.measure } : {}),
    ...(search.historyWindow === "published" || search.historyWindow === "term" ? { historyWindow: search.historyWindow } : {}),
    ...(BASES.includes(search.basis as EconomyBasis) ? { basis: search.basis as EconomyBasis } : {}),
    ...(preset(search.comparisonWindow) ? { comparisonWindow: search.comparisonWindow as string } : {}),
    ...(peers !== undefined ? { peers } : {}),
    ...(preset(search.peerWindow) ? { peerWindow: search.peerWindow as string } : {}),
    ...(search.observation !== undefined && Number.isSafeInteger(observation) && observation >= 0 ? { observation: Math.min(observation, 10000) } : {}),
    ...(sort ? { sort } : {}),
    ...(search.direction === "descending" ? { direction: "descending" as const } : {}),
  };
}

/** The address parameters for a search; an absent value clears its key. */
export function economyParams(search: EconomySearch): Readonly<Record<string, string | undefined>> {
  return {
    view: search.view,
    measure: search.measure,
    observation: search.observation === undefined ? undefined : String(search.observation),
    historyWindow: search.historyWindow,
    basis: search.basis,
    comparisonWindow: search.comparisonWindow,
    peers: search.peers?.join(","),
    peerWindow: search.peerWindow,
    sort: search.sort,
    direction: search.direction,
  };
}
