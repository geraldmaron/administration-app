import type { LayerName, Lod } from "./data";

/** The level a lens is written for. */
export type LensLevel = "nation" | "state" | "district";

export interface LayerPlan {
  readonly layer: LayerName;
  readonly lod: Lod;
}

export interface LevelPlan {
  readonly layers: readonly LayerPlan[];
  /** The level actually drawn: never finer than the zoom can show. */
  readonly effective: LensLevel;
  /** Whether the United States' own nation shape is replaced by its states or districts. */
  readonly replacesUsa: boolean;
}

/** Districts get their own shapes at state zoom and deeper; wider, they dither by state. */
export const DISTRICT_EXTENT = 20;
const WORLD_HI_EXTENT = 60;
const STATES_HI_EXTENT = 20;

/**
 * Which levels of detail a view draws. `extent` is the target's angular size
 * in degrees. `motion` asks for the light levels used for a flight's
 * destination frame, which is drawn once, moved, and replaced on landing.
 */
export function planLevels(level: LensLevel, extent: number, motion: boolean): LevelPlan {
  const world: LayerPlan = { layer: "world", lod: !motion && extent < WORLD_HI_EXTENT ? "hi" : "lo" };
  if (level === "nation") return { layers: [world], effective: "nation", replacesUsa: false };
  const deep = extent < DISTRICT_EXTENT;
  if (level === "district" && deep) {
    return { layers: [world, { layer: "districts", lod: motion ? "lo" : "hi" }], effective: "district", replacesUsa: true };
  }
  const states: LayerPlan = { layer: "states", lod: !motion && extent < STATES_HI_EXTENT ? "hi" : "lo" };
  return { layers: [world, states], effective: "state", replacesUsa: true };
}
