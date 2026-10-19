import type { TradeSectorRow } from "@admin/player-core";
import type { KeyEntry } from "@admin/ui";

export { tradeGlyph } from "./glyphs";

/** The widest figure either direction reaches, so every pair of bars on a screen shares one scale. */
export function tradeScale(rows: readonly Pick<TradeSectorRow, "imports" | "exports">[]): number {
  return Math.max(1, ...rows.flatMap((row) => [row.imports, row.exports]));
}

/** A figure as a bar's length, 0..100, measured on the shared scale; a nonzero figure never draws as nothing. */
export function barPercent(value: number, scale: number): number {
  if (value <= 0) return 0;
  return Math.max(2, Math.min(100, Math.round((value / scale) * 100)));
}

/** How many ranked rows the first view must show so the picked sector is among them. */
export function rowsToShow(rows: readonly Pick<TradeSectorRow, "sector">[], initial: number, picked: string | undefined): number {
  const at = picked ? rows.findIndex((row) => row.sector === picked) : -1;
  return Math.max(initial, at + 1);
}

/** The two bars of a trade pair, by their own words: what the United States buys, then what it sells. */
export function tradeKey(buy: string, sell: string): readonly KeyEntry[] {
  return [
    { id: "buy", kind: "line", label: buy, ink: "accent", weight: 6 },
    { id: "sell", kind: "line", label: sell, ink: "goldRule", weight: 6 },
  ];
}
