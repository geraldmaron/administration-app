import type { TradeSectorRow } from "@admin/player-core";
import type { IconName } from "@admin/ui-web";
import { COMMODITY_GLYPH, SECTOR_GLYPH } from "../../shell/glyphs";

// Four trade sectors are one commodity each, and the commodity has its own mark;
// every other sector wears the mark of the dataset sector it rolls into.
const COMMODITY_SECTORS: Readonly<Record<string, IconName>> = {
  "energy-crude": COMMODITY_GLYPH.crude,
  "energy-gas-lng": COMMODITY_GLYPH.lng,
  fertilizer: COMMODITY_GLYPH.potash,
  "critical-minerals": COMMODITY_GLYPH["rare-earths"],
};

export function tradeGlyph(row: Pick<TradeSectorRow, "sector" | "rollup">): IconName {
  return COMMODITY_SECTORS[row.sector] ?? SECTOR_GLYPH[row.rollup];
}

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
