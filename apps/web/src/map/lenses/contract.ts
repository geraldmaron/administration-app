import { stateById, worldNations } from "@admin/world";
import { regionKey, type LayerName, type Region, type RegionTable } from "../data";
import type { LensLevel } from "../levels";
import type { Lens, LensFill } from "../paint";
import type { MapPalette } from "./palette";

export type LensScale = "categorical" | "sequential" | "diverging";
/** Color alone; color with a magnitude radius; or proportional dither of a mixed value. */
export type LensEncoding = "color" | "color-radius" | "dither";

export interface LegendEntry {
  readonly label: string;
  readonly color: string;
}

/** What a lens says about one region: the value in words, its rank in the list, and how the dots show it. */
export interface LensReading {
  readonly text: string;
  /** Orders the accessible list, highest first. */
  readonly rank: number;
  readonly fill: LensFill;
  /** The value in a few characters ("54%", "+0.2"), written beside the region's name on the map where it fits; absent for a reading that is a word. */
  readonly figure?: string;
  /**
   * How much the map should fight to name this region, 0 to 1. Absent, it is how far the region sits from the
   * middle of the lens's own ranking; a lens sets it where its ranking misleads (an unread government sorts last
   * without being an extreme).
   */
  readonly salience?: number;
}

/** A reading with its short figure for the map's labels. */
export function withFigure(reading: LensReading, figure: string): LensReading {
  return { ...reading, figure };
}

/**
 * The lens contract. `read` answers null for a region outside the lens's
 * subject (foreign land under a state lens), which draws as neutral land; a
 * region inside it with nothing honest to show answers a no-data reading,
 * which draws as dim neutral dots.
 */
export interface MapLens {
  readonly id: string;
  readonly name: string;
  readonly level: LensLevel;
  readonly scale: LensScale;
  readonly encoding: LensEncoding;
  readonly legend: readonly LegendEntry[];
  /** The House's equal-area view: every district one hex. */
  readonly cartogram?: "hex";
  readonly read: (region: Region, effective: LensLevel) => LensReading | null;
}

export function noData(palette: MapPalette, text = "No data"): LensReading {
  return { text, rank: Number.NEGATIVE_INFINITY, fill: { kind: "solid", color: palette.nodata } };
}

export function solid(text: string, rank: number, color: string, scale?: number): LensReading {
  return { text, rank, fill: scale === undefined ? { kind: "solid", color } : { kind: "solid", color, scale } };
}

const LAYER_OF_LEVEL: Readonly<Record<LensLevel, LayerName>> = { nation: "world", state: "states", district: "districts" };
const REF_OF_LAYER: Readonly<Record<LayerName, string>> = { world: "nation", states: "state", districts: "district" };

export function layerOfLevel(level: LensLevel): LayerName {
  return LAYER_OF_LEVEL[level];
}

/** A region's ref, the form a selection and a camera key name it in: `nation:FRA`, `state:CA`, `district:NY-12`. */
export function refOf(region: Region): string {
  return `${REF_OF_LAYER[region.layer]}:${region.id}`;
}

/** The region a ref names, or undefined. */
export function regionOfRef(table: RegionTable, ref: string): Region | undefined {
  const colon = ref.indexOf(":");
  if (colon < 0) return undefined;
  const kind = ref.slice(0, colon);
  const layer = (Object.entries(REF_OF_LAYER) as [LayerName, string][]).find(([, name]) => name === kind)?.[0];
  return layer ? table.byKey.get(regionKey(layer, ref.slice(colon + 1))) : undefined;
}

const NATION_NAMES = new Map(worldNations.map((nation) => [nation.id as string, nation.identity.name]));

/** The name a player reads for a region. */
export function regionName(region: Region): string {
  if (region.layer === "world") return NATION_NAMES.get(region.id) ?? region.name ?? region.id;
  if (region.layer === "states") return stateById.get(region.id)?.name ?? region.id;
  return `District ${region.id}`;
}

/** The state a district belongs to, read off the district's id ("CO-03"). */
function stateOfDistrict(table: RegionTable, region: Region): Region | undefined {
  return region.layer === "districts" ? table.byKey.get(regionKey("states", region.id.split("-")[0] ?? "")) : undefined;
}

/**
 * What a lens says about a region as drawn. A nation lens reads a US state or
 * district as the United States, so the country does not go neutral when a
 * selection brings its states onto the map. A state lens with nothing of its
 * own to say about a district reads the district's state, said as statewide,
 * so a detached state's districts carry its color with their lines inside.
 */
export function readRegion(lens: MapLens, table: RegionTable, region: Region, effective: LensLevel): LensReading | null {
  if (lens.level === "nation" && region.layer !== "world") {
    const usa = table.byKey.get(regionKey("world", "USA"));
    return usa ? lens.read(usa, effective) : null;
  }
  const own = lens.read(region, effective);
  if (own || lens.level !== "state") return own;
  const state = stateOfDistrict(table, region);
  const statewide = state ? lens.read(state, "state") : null;
  return statewide ? { ...statewide, text: `${statewide.text}, statewide` } : null;
}

/** The lens as the renderer draws it. */
export function toRendererLens(lens: MapLens, table: RegionTable, palette: MapPalette): Lens {
  return {
    id: lens.id,
    name: lens.name,
    level: lens.level,
    fill: (region, effective) => readRegion(lens, table, region, effective)?.fill ?? { kind: "solid", color: palette.neutral },
  };
}

export function neutralLens(): MapLens {
  return { id: "neutral", name: "The map", level: "nation", scale: "categorical", encoding: "color", legend: [], read: () => null };
}

/** One line of the accessible list: the region, its value in words, its rank. */
export interface LensRow {
  readonly ref: string;
  readonly name: string;
  readonly value: string;
  readonly rank: number;
}

/**
 * The lens as a ranked list at the level the map is drawing: the accessible
 * data table, the arrow-key order and the forced-colors view. Regions the lens
 * says nothing about are left out; regions with no data sort last.
 */
export function lensRows(lens: MapLens, table: RegionTable, effective: LensLevel): readonly LensRow[] {
  // A state lens drawn at district level still ranks states: its districts carry only their state's value.
  const layer = layerOfLevel(lens.level === "state" && effective === "district" ? "state" : effective);
  return table.regions
    .filter((region) => region.layer === layer)
    .flatMap((region): LensRow[] => {
      const reading = lens.read(region, effective);
      return reading ? [{ ref: refOf(region), name: regionName(region), value: reading.text, rank: reading.rank }] : [];
    })
    .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name));
}
