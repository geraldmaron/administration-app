import type { Affine } from "./camera";
import { SET_SEPARATOR } from "./camera-keys";
import type { Region, RegionTable } from "./data";
import { regionOfRef } from "./lenses/contract";
import type { LensLevel } from "./levels";

/** How far a detachment has gone: the others' alpha, the lift and the scale about the selection's centroid. */
export interface DetachFrame {
  readonly progress: number;
  readonly othersAlpha: number;
  /** CSS pixels, negative is up. */
  readonly lift: number;
  readonly scale: number;
}

/** The others fade to 22%, or to 35% in high contrast so the context stays legible. */
export function fadeFloor(highContrast: boolean): number {
  return highContrast ? 0.35 : 0.22;
}

export const LIFT_PX = 6;
export const LIFT_SCALE = 0.03;

export const AT_REST: DetachFrame = { progress: 0, othersAlpha: 1, lift: 0, scale: 1 };

/** The detachment at `progress` 0..1, eased out so the lift lands softly. */
export function detachFrame(progress: number, highContrast: boolean): DetachFrame {
  const t = Math.min(1, Math.max(0, progress));
  const e = 1 - (1 - t) ** 3;
  return { progress: e, othersAlpha: 1 - (1 - fadeFloor(highContrast)) * e, lift: -LIFT_PX * e, scale: 1 + LIFT_SCALE * e };
}

/**
 * The regions a selection names. A selection is one ref or a set joined by
 * `|`; a ref the map does not know is dropped rather than failing the rest.
 * `nation:USA` lifts the country's own shape.
 */
export function selectedRegions(table: RegionTable, selection: string | undefined): readonly Region[] {
  if (!selection) return [];
  const seen = new Set<number>();
  return selection.split(SET_SEPARATOR).flatMap((ref) => {
    const region = regionOfRef(table, ref.trim());
    if (!region || seen.has(region.index)) return [];
    seen.add(region.index);
    return [region];
  });
}

/**
 * The regions a detachment lifts: a selected state brings its districts, so
 * it detaches whole when the map is drawing districts (a district lens at
 * state zoom), and its district lines show inside the lifted outline.
 */
export function liftedRegions(table: RegionTable, regions: readonly Region[]): readonly Region[] {
  const states = new Set(regions.filter((region) => region.layer === "states").map((region) => `${region.id}-`));
  if (states.size === 0) return regions;
  const districts = table.regions.filter((region) => region.layer === "districts" && states.has(`${region.id.split("-")[0] ?? ""}-`));
  return [...regions, ...districts];
}

/**
 * The second level of a detachment: a district chosen inside a state that is
 * itself detached (`state:CO|district:CO-03`). It draws at full strength with
 * its own outline while the rest of its state steps back.
 */
export function focusedRegions(regions: readonly Region[]): readonly Region[] {
  const states = new Set(regions.filter((region) => region.layer === "states").map((region) => region.id));
  return regions.filter((region) => region.layer === "districts" && states.has(region.id.split("-")[0] ?? ""));
}

/** The one state a selection detaches, whose capitol and metros the map pins; none for a set of several. */
export function detachedState(selection: string | undefined): string | undefined {
  const states = (selection ?? "").split(SET_SEPARATOR).filter((ref) => ref.startsWith("state:"));
  return states.length === 1 ? states[0]!.slice("state:".length) : undefined;
}

/** The one foreign government a selection lifts, whose cities the map pins; the United States has its states instead. */
export function detachedNation(selection: string | undefined): string | undefined {
  const nations = (selection ?? "").split(SET_SEPARATOR).filter((ref) => ref.startsWith("nation:"));
  const id = nations.length === 1 ? nations[0]!.slice("nation:".length) : undefined;
  return id === "USA" ? undefined : id;
}

/** How strongly the rest of a detached state draws while one of its districts is detached a second level. */
export const SECOND_LEVEL_ALPHA = 0.45;

// A detached state brings its districts, so its inner lines are drawn: it asks for the district level.
const LEVEL_OF_LAYER = { world: "nation", states: "district", districts: "district" } as const;
const ORDER: readonly LensLevel[] = ["nation", "state", "district"];

/** The finest level a selection needs drawn, so a selected state is on the map, district lines and all, even under a nation lens. */
export function selectionLevel(regions: readonly Region[]): LensLevel {
  return regions.reduce<LensLevel>((finest, region) => {
    const level = LEVEL_OF_LAYER[region.layer];
    return ORDER.indexOf(level) > ORDER.indexOf(finest) ? level : finest;
  }, "nation");
}

/** The finer of two levels. */
export function finerLevel(a: LensLevel, b: LensLevel): LensLevel {
  return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b;
}

/** The camera a lifted selection draws with: scaled about its screen centroid and raised. */
export function liftedCamera(camera: Affine, centroid: readonly [number, number], frame: DetachFrame): Affine {
  const [cx, cy] = centroid;
  const s = frame.scale;
  return { k: camera.k * s, x: (camera.x - cx) * s + cx, y: (camera.y - cy) * s + cy + frame.lift };
}
