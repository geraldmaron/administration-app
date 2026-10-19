import type { GeoProjection } from "d3-geo";
import { applyAffine, fitRectIn, rectOfPoints, type Affine, type Rect, type Viewport } from "./camera";
import { insetLayout } from "./insets";
import { blendForExtent, boundsCenter, boundsExtent, type GeoBounds, type ProjectionState } from "./projection";

/** What a route asks the camera to frame. */
export interface CameraTarget {
  readonly label: string;
  readonly bounds: GeoBounds;
  /** Overrides the bounds' center as the projection's focus. */
  readonly focus?: readonly [number, number];
  /** The US home view: Alaska and Hawaii insets take the lower left of the visible area. */
  readonly insets?: boolean;
}

export function projectionFor(target: CameraTarget): ProjectionState {
  const [lon, lat] = target.focus ?? boundsCenter(target.bounds);
  return { lon, lat, blend: blendForExtent(boundsExtent(target.bounds)) };
}

/** Sample the bounds' edges and interior: a projected box is not a box under a curved projection. */
export function boundsSamples(bounds: GeoBounds, steps = 6): readonly (readonly [number, number])[] {
  const [w, s, e, n] = bounds;
  const width = e >= w ? e - w : e + 360 - w;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const lon = w + (width * i) / steps;
      points.push([lon > 180 ? lon - 360 : lon, s + ((n - s) * j) / steps]);
    }
  }
  return points;
}

/** The target's rectangle in plane units under a projection. */
export function planeRectOf(projection: GeoProjection, bounds: GeoBounds): Rect | null {
  const projected = boundsSamples(bounds).map(([lon, lat]): readonly [number, number] => projection([lon, lat]) ?? [Number.NaN, Number.NaN]);
  return rectOfPoints(projected);
}

export function screenRectOf(projection: GeoProjection, camera: Affine, bounds: GeoBounds): Rect | null {
  const plane = planeRectOf(projection, bounds);
  if (!plane) return null;
  const [x0, y0] = applyAffine(camera, plane.x0, plane.y0);
  const [x1, y1] = applyAffine(camera, plane.x1, plane.y1);
  return { x0, y0, x1, y1 };
}

/** The whole viewport as an area. */
export function fullArea(viewport: Viewport): Rect {
  return { x0: 0, y0: 0, x1: viewport.width, y1: viewport.height };
}

/** The area a target is framed in: the visible area, less the inset band when the target carries insets. */
export function framingArea(target: CameraTarget, area: Rect): Rect {
  return target.insets ? { ...area, y1: area.y1 - insetLayout(area).reserve } : area;
}

/**
 * Frame a target inside the visible area (the viewport less whatever the
 * shell's rail, panel or sheet covers). Padding scales with the area so a
 * phone keeps most of its width for the land.
 */
export function frameTarget(projection: GeoProjection, target: CameraTarget, viewport: Viewport, area: Rect = fullArea(viewport)): Affine {
  const plane = planeRectOf(projection, target.bounds) ?? { x0: -500, y0: -250, x1: 500, y1: 250 };
  const frame = framingArea(target, area);
  const padding = Math.min(48, Math.min(frame.x1 - frame.x0, frame.y1 - frame.y0) * 0.06);
  return fitRectIn(plane, frame, padding);
}

/**
 * Whether a target's longitudes straddle the seam of a view centered on
 * `centerLon` (its antimeridian). Such a target projects onto both edges of
 * that view at once, so its on-screen rectangle spans the whole map and a
 * flight planned from it swings through the wrong place.
 */
export function crossesSeam(bounds: GeoBounds, centerLon: number): boolean {
  const [w, , e] = bounds;
  const span = e >= w ? e - w : e + 360 - w;
  if (span >= 359) return false;
  const seam = centerLon + 180;
  const offset = (((seam - w) % 360) + 360) % 360;
  return offset > 0 && offset < span;
}
