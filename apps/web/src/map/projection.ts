import {
  geoAzimuthalEqualAreaRaw,
  geoDistance,
  geoNaturalEarth1Raw,
  geoProjectionMutator,
  type GeoProjection,
  type GeoRawProjection,
} from "d3-geo";

/**
 * Where the runtime projection is looking. `blend` 0 is Natural Earth rotated
 * to the focus longitude (the world view); 1 is azimuthal equal-area centered
 * on the focus (a country and deeper). In between is a straight interpolation
 * of the two raw projections, which has no closed-form inverse: everything
 * that needs screen-to-map goes through the id buffer instead.
 */
export interface ProjectionState {
  readonly lon: number;
  readonly lat: number;
  readonly blend: number;
}

/** Plane units per radian. Natural Earth's world comes out about 1000 units wide. */
export const PLANE_SCALE = 183;

/** Beyond this angular distance from the focus a blended view cannot show a feature. */
const CULL_DEGREES = 100;

/** Newton steps for the blend's inverse, and the residual (plane units per radian) that ends them. */
const INVERT_STEPS = 8;
const INVERT_TOLERANCE = 1e-16;
const JACOBIAN_STEP = 1e-6;

export function blendRaw(t: number): GeoRawProjection {
  const ne = geoNaturalEarth1Raw;
  const az = geoAzimuthalEqualAreaRaw;
  const raw: GeoRawProjection = (lambda, phi) => {
    const [x0, y0] = ne(lambda, phi);
    if (t === 0) return [x0, y0];
    const [x1, y1] = az(lambda, phi);
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  };
  // No closed form exists between the ends, so the inverse is solved: seeded
  // from whichever projection dominates, then refined by Newton steps. Picking
  // still goes through the id buffer; this serves the drawn terrain.
  raw.invert = (x, y) => {
    const exact = t < 0.5 ? ne.invert?.(x, y) : az.invert?.(x, y);
    if (!exact || t === 0 || t === 1) return exact ?? [Number.NaN, Number.NaN];
    let [lambda, phi] = exact;
    for (let step = 0; step < INVERT_STEPS; step++) {
      const [fx, fy] = raw(lambda, phi);
      const dx = fx - x;
      const dy = fy - y;
      if (dx * dx + dy * dy < INVERT_TOLERANCE) break;
      const [ax, ay] = raw(lambda + JACOBIAN_STEP, phi);
      const [bx, by] = raw(lambda, phi + JACOBIAN_STEP);
      const j11 = (ax - fx) / JACOBIAN_STEP;
      const j21 = (ay - fy) / JACOBIAN_STEP;
      const j12 = (bx - fx) / JACOBIAN_STEP;
      const j22 = (by - fy) / JACOBIAN_STEP;
      const det = j11 * j22 - j12 * j21;
      if (Math.abs(det) < 1e-12) break;
      lambda -= (j22 * dx - j12 * dy) / det;
      phi -= (-j21 * dx + j11 * dy) / det;
    }
    return [lambda, phi];
  };
  return raw;
}

/** The d3 projection for a state, scaled to plane units and centered on the origin. */
export function makeProjection(state: ProjectionState): GeoProjection {
  const blend = clamp01(state.blend);
  // The d3 typings declare the mutator's result as taking no arguments; at
  // runtime it passes its arguments to the raw-projection factory.
  const mutate = geoProjectionMutator(blendRaw) as unknown as (t: number) => GeoProjection;
  const projection = mutate(blend);
  return projection
    .rotate([-state.lon, -state.lat * blend])
    .scale(PLANE_SCALE)
    .translate([0, 0])
    .precision(0.3);
}

/**
 * The blend for a target by its angular extent: a view wider than 120° is the
 * world and stays Natural Earth; 40° or narrower is fully azimuthal.
 */
export function blendForExtent(extentDegrees: number): number {
  const t = clamp01((120 - extentDegrees) / 80);
  return t * t * (3 - 2 * t);
}

/** Bounds are `[west, south, east, north]` in degrees; east may be less than west across the antimeridian. */
export type GeoBounds = readonly [number, number, number, number];

export function boundsExtent(bounds: GeoBounds): number {
  const [w, s, e, n] = bounds;
  const width = e >= w ? e - w : e + 360 - w;
  return Math.max(width * Math.cos(((s + n) / 2) * (Math.PI / 180)), n - s);
}

export function boundsCenter(bounds: GeoBounds): readonly [number, number] {
  const [w, s, e, n] = bounds;
  const width = e >= w ? e - w : e + 360 - w;
  const lon = w + width / 2;
  return [lon > 180 ? lon - 360 : lon, (s + n) / 2];
}

/**
 * Whether a feature can appear at all under a blended projection. Skipping
 * the far hemisphere is most of the vertex work saved at country zoom.
 */
export function isVisibleFrom(state: ProjectionState, bounds: GeoBounds): boolean {
  if (state.blend < 0.3) return true;
  const [lon, lat] = boundsCenter(bounds);
  const radius = boundsExtent(bounds) / 2;
  const distance = (geoDistance([state.lon, state.lat], [lon, lat]) * 180) / Math.PI;
  return distance - radius < CULL_DEGREES;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
