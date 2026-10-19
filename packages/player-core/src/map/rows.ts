import { layerOfLevel, readRegion, refOf, regionName, type LegendEntry, type LensFill, type LensLevel, type LensReading, type MapLens, type RegionRef } from "./contract.js";
import type { MapPalette } from "./palette.js";

/** A mixed value in proportion: each color with its share's weight. */
export interface LensMix {
  readonly colors: readonly string[];
  readonly weights: readonly number[];
}

/**
 * One region as a filled map and its list both draw it: the ref it is chosen
 * by, its name, the value in words, its rank, and one color. A mixed reading
 * fills with its majority color and carries the mix for a proportional key.
 */
export interface LensRow {
  readonly regionKey: string;
  readonly label: string;
  readonly value: string;
  readonly rank: number;
  readonly fill: string;
  readonly mix?: LensMix;
  readonly figure?: string;
  readonly salience?: number;
}

/** A drawn region's color where the list carries no row of its own: a district under its state's reading, a state read as the United States. */
export interface LensPaint {
  readonly regionKey: string;
  readonly fill: string;
  readonly label: string;
  readonly value: string;
}

/** Everything a map panel draws for one lens: its name and key, the ranked rows, and the colors of the regions the rows do not list. */
export interface LensView {
  readonly id: string;
  readonly name: string;
  readonly level: LensLevel;
  readonly legend: readonly LegendEntry[];
  readonly rows: readonly LensRow[];
  readonly paint: readonly LensPaint[];
}

/** The one color a fill draws as: a solid's color, a mix's largest share, or the quiet land. */
export function fillColor(fill: LensFill, palette: MapPalette): string {
  if (fill.kind === "solid") return fill.color;
  if (fill.kind === "none") return palette.land;
  const top = fill.weights.reduce((best, weight, index) => (weight > (fill.weights[best] ?? 0) ? index : best), 0);
  return fill.colors[top] ?? palette.land;
}

function toRow(region: RegionRef, reading: LensReading, palette: MapPalette): LensRow {
  return {
    regionKey: refOf(region),
    label: regionName(region),
    value: reading.text,
    rank: reading.rank,
    fill: fillColor(reading.fill, palette),
    ...(reading.fill.kind === "dither" ? { mix: { colors: reading.fill.colors, weights: reading.fill.weights } } : {}),
    ...(reading.figure === undefined ? {} : { figure: reading.figure }),
    ...(reading.salience === undefined ? {} : { salience: reading.salience }),
  };
}

/**
 * The lens as a ranked list at the level the map is drawing: the data table,
 * the arrow-key order and the forced-colors view. Regions the lens says
 * nothing about are left out; regions with no data sort last.
 */
export function lensRows(lens: MapLens, regions: readonly RegionRef[], effective: LensLevel, palette: MapPalette): readonly LensRow[] {
  // A state lens drawn at district level still ranks states: its districts carry only their state's value.
  const layer = layerOfLevel(lens.level === "state" && effective === "district" ? "state" : effective);
  return regions
    .filter((region) => region.layer === layer)
    .flatMap((region): LensRow[] => {
      const reading = lens.read(region, effective);
      return reading ? [toRow(region, reading, palette)] : [];
    })
    .sort((a, b) => b.rank - a.rank || a.label.localeCompare(b.label));
}

/** The lens read for a map: the ranked rows, plus the color of every other drawn region the lens says something about. */
export function lensView(lens: MapLens, regions: readonly RegionRef[], effective: LensLevel, palette: MapPalette): LensView {
  const rows = lensRows(lens, regions, effective, palette);
  const listed = new Set(rows.map((row) => row.regionKey));
  const paint = regions.flatMap((region): LensPaint[] => {
    const key = refOf(region);
    if (listed.has(key)) return [];
    const reading = readRegion(lens, region, effective);
    return reading ? [{ regionKey: key, fill: fillColor(reading.fill, palette), label: regionName(region), value: reading.text }] : [];
  });
  return { id: lens.id, name: lens.name, level: lens.level, legend: lens.legend, rows, paint };
}
