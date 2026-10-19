import { stateById, worldNations } from "@admin/world";
import type { MapPalette } from "./palette.js";

/** The level a lens is written for. */
export type LensLevel = "nation" | "state" | "district";
/** The three region layers the map draws: governments, states and congressional districts. */
export type RegionLayer = "world" | "states" | "districts";

export type LensScale = "categorical" | "sequential" | "diverging";
/** Color alone; color with a magnitude; or a mixed value in proportion. */
export type LensEncoding = "color" | "color-radius" | "dither";

export interface LegendEntry {
  readonly label: string;
  readonly color: string;
}

/**
 * How a reading colors its region. `scale` is a magnitude lens's size
 * multiplier (0.6× to 1.6×) for a renderer that draws one; a dither is a
 * mixed value (28 of 52 seats) in proportion.
 */
export type LensFill =
  | { readonly kind: "solid"; readonly color: string; readonly scale?: number }
  | { readonly kind: "dither"; readonly colors: readonly string[]; readonly weights: readonly number[] }
  | { readonly kind: "none" };

/** One region as a lens reads it: which layer, and its id there (`FRA`, `CA`, `NY-12`). */
export interface RegionRef {
  readonly layer: RegionLayer;
  readonly id: string;
  /** The name the geometry carries, for a government the dataset does not list. */
  readonly name?: string;
}

/** What a lens says about one region: the value in words, its rank in the list, and its color. */
export interface LensReading {
  readonly text: string;
  /** Orders the list, highest first. */
  readonly rank: number;
  readonly fill: LensFill;
  /** The value in a few characters ("54%", "+0.2"), for a label beside the region's name; absent for a reading that is a word. */
  readonly figure?: string;
  /**
   * How much the map should fight to name this region, 0 to 1. Absent, it is how far the region sits from the
   * middle of the lens's own ranking; a lens sets it where its ranking misleads (an unread government sorts last
   * without being an extreme).
   */
  readonly salience?: number;
}

/**
 * The lens contract. `read` answers null for a region outside the lens's
 * subject (foreign land under a state lens), which draws as neutral land; a
 * region inside it with nothing honest to show answers a no-data reading.
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
  readonly read: (region: RegionRef, effective: LensLevel) => LensReading | null;
}

/** A reading with its short figure for the map's labels. */
export function withFigure(reading: LensReading, figure: string): LensReading {
  return { ...reading, figure };
}

export function noData(palette: MapPalette, text = "No data"): LensReading {
  return { text, rank: Number.NEGATIVE_INFINITY, fill: { kind: "solid", color: palette.nodata } };
}

export function solid(text: string, rank: number, color: string, scale?: number): LensReading {
  return { text, rank, fill: scale === undefined ? { kind: "solid", color } : { kind: "solid", color, scale } };
}

export function neutralLens(): MapLens {
  return { id: "neutral", name: "The map", level: "nation", scale: "categorical", encoding: "color", legend: [], read: () => null };
}

const LAYER_OF_LEVEL: Readonly<Record<LensLevel, RegionLayer>> = { nation: "world", state: "states", district: "districts" };
const REF_OF_LAYER: Readonly<Record<RegionLayer, string>> = { world: "nation", states: "state", districts: "district" };

export function layerOfLevel(level: LensLevel): RegionLayer {
  return LAYER_OF_LEVEL[level];
}

/** A region's ref, the form a selection and a route name it in: `nation:FRA`, `state:CA`, `district:NY-12`. */
export function refOf(region: RegionRef): string {
  return `${REF_OF_LAYER[region.layer]}:${region.id}`;
}

/** The region a ref names, or undefined for a ref that is no region. */
export function regionOfRef(ref: string): RegionRef | undefined {
  const colon = ref.indexOf(":");
  if (colon <= 0) return undefined;
  const kind = ref.slice(0, colon);
  const id = ref.slice(colon + 1);
  const layer = (Object.entries(REF_OF_LAYER) as [RegionLayer, string][]).find(([, name]) => name === kind)?.[0];
  return layer && id ? { layer, id } : undefined;
}

const NATION_NAMES = new Map(worldNations.map((nation) => [nation.id as string, nation.identity.name]));

/** The name a player reads for a region. */
export function regionName(region: RegionRef): string {
  if (region.layer === "world") return NATION_NAMES.get(region.id) ?? region.name ?? region.id;
  if (region.layer === "states") return stateById.get(region.id)?.name ?? region.id;
  return `District ${region.id}`;
}

/** The state a district belongs to, read off the district's id ("CO-03"). */
function stateOfDistrict(region: RegionRef): RegionRef | undefined {
  const state = region.id.split("-")[0];
  return region.layer === "districts" && state ? { layer: "states", id: state } : undefined;
}

/**
 * What a lens says about a region as drawn. A nation lens reads a US state or
 * district as the United States, so the country does not go neutral when the
 * map draws its states. A state lens with nothing of its own to say about a
 * district reads the district's state, said as statewide.
 */
export function readRegion(lens: MapLens, region: RegionRef, effective: LensLevel): LensReading | null {
  if (lens.level === "nation" && region.layer !== "world") return lens.read({ layer: "world", id: "USA" }, effective);
  const own = lens.read(region, effective);
  if (own || lens.level !== "state") return own;
  const state = stateOfDistrict(region);
  const statewide = state ? lens.read(state, "state") : null;
  return statewide ? { ...statewide, text: `${statewide.text}, statewide` } : null;
}
