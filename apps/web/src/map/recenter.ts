import { geoDistance, type GeoProjection } from "d3-geo";
import { invertAffine, type Affine, type Rect } from "./camera";
import { makeProjection, type ProjectionState } from "./projection";
import { projectionFor, type CameraTarget } from "./target";

/** How far, in degrees, the middle of the view may sit from the projection's center before the map visibly tilts. */
export const RECENTER_DEGREES = 5;
/** Below this blend the view is Natural Earth, which turns only in longitude and never tilts. */
const AZIMUTHAL_FROM = 0.3;

/**
 * Where the view should be re-centered, if it should: an azimuthal view is
 * true only near its center, so a framing or a pan that leaves the middle of
 * the visible map far from it slants every parallel. Returns the lon/lat at
 * the middle of the visible area and where it sits on screen.
 */
export function recenterFor(projection: GeoProjection, state: ProjectionState, camera: Affine, area: Rect): { readonly center: readonly [number, number]; readonly screen: readonly [number, number] } | null {
  if (state.blend < AZIMUTHAL_FROM || !projection.invert) return null;
  const screen: readonly [number, number] = [(area.x0 + area.x1) / 2, (area.y0 + area.y1) / 2];
  const plane = invertAffine(camera, screen[0], screen[1]);
  const at = projection.invert([plane[0], plane[1]]);
  if (!at || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) return null;
  const off = (geoDistance([state.lon, state.lat], at) * 180) / Math.PI;
  return off > RECENTER_DEGREES ? { center: [at[0], at[1]], screen } : null;
}

/** The re-centered view: the same target focused on the middle of the view, and the camera that keeps that point where it was at the same zoom. */
export function recenteredView(projection: GeoProjection, state: ProjectionState, camera: Affine, area: Rect, target: CameraTarget): { readonly target: CameraTarget; readonly camera: Affine } | null {
  const found = recenterFor(projection, state, camera, area);
  if (!found) return null;
  const next: CameraTarget = { ...target, focus: found.center };
  const at = makeProjection(projectionFor(next))([found.center[0], found.center[1]]);
  if (!at) return null;
  return { target: next, camera: { k: camera.k, x: found.screen[0] - camera.k * at[0], y: found.screen[1] - camera.k * at[1] } };
}
