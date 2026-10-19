import type { Viewport } from "./camera";
import type { LevelPlan } from "./levels";
import type { ProvinceSet } from "./provinces";
import type { CameraTarget } from "./target";

/**
 * The user-timing mark set at the map's first drawn frame. The shell waits on
 * it before loading the stores, and a production build's first paint is
 * measured by it with no harness mounted.
 */
export const MAP_FIRST_PAINT_MARK = "map:first-paint";

/**
 * What the overlays (cards, labels, pins, arcs) read of the map as drawn now.
 * The GL map supplies it from MapLibre's own camera, so a pin is placed from
 * the same transform, in the same frame, as the land under it.
 */
export interface MapView {
  /** A lon/lat on screen as drawn now, or null when it is on the far side of the globe or the map is not up. */
  project(lon: number, lat: number): readonly [number, number] | null;
  /** Whether the camera is moving: labels wait for it to stop, pins take no clicks until it does. */
  readonly moving: boolean;
  readonly viewportSize: Viewport;
  /** Zoom levels above the world-fit zoom: 0 is the whole world in view. */
  readonly zoomLevel: number;
  /** The levels drawn now, which the labels name; null before the first frame. */
  readonly current: { readonly plan: LevelPlan } | null;
  /** The selected regions by index, which the label layer names first. */
  readonly selection: ReadonlySet<number>;
  /** The selected government's divisions, for the label layer. */
  readonly provinces: { readonly current: ProvinceSet | null };
  /** The camera target framed now, or null before the first frame. */
  readonly target: CameraTarget | null;
}
