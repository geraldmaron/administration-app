/** The user's map density setting scales the target pitch. */
export type Density = "fine" | "standard" | "bold";

const DENSITY_SCALE: Readonly<Record<Density, number>> = { fine: 0.8, standard: 1, bold: 1.3 };

export const MIN_PITCH = 3.5;
export const MAX_PITCH = 9;
const RADIUS_RATIO = 0.2;
/** Radius floor in device pixels: below it a dot stops reading as round. */
const MIN_RADIUS_DEVICE_PX = 1.5;

/**
 * The on-screen dot pitch, in CSS pixels, a view should aim for. A phone
 * world view sits at the 3.5px floor; the pitch opens up with zoom toward the
 * 9px ceiling at state and metro zoom. `zoomLevel` is log2 of the zoom over
 * the world-fit zoom, so 0 is the whole world in view.
 */
export function targetPitch(zoomLevel: number, viewportMinPx: number, density: Density = "standard"): number {
  const base = Math.min(5.5, Math.max(MIN_PITCH, viewportMinPx / 110));
  const pitch = base * (1 + 0.25 * Math.max(0, zoomLevel)) * DENSITY_SCALE[density];
  return Math.min(pitchCeiling(density), Math.max(MIN_PITCH * DENSITY_SCALE[density], pitch));
}

/** The widest drawn pitch a density allows: the 9px ceiling at state and metro zoom, scaled by the setting. */
export function pitchCeiling(density: Density = "standard"): number {
  return MAX_PITCH * DENSITY_SCALE[density];
}

/**
 * The lattice the dots sit on, quantized to octaves of a fixed plane pitch so
 * the grid is anchored to the map plane and travels with the land.
 *
 * Within an octave the coarse grid A spans one doubling of screen pitch
 * around the target. Grid B is A at half the pitch, so every A point is also a B point. Over the
 * top of the octave the B-only points fade in and every radius eases toward
 * B's, so at the octave boundary the old B grid is exactly the new A grid and
 * nothing pops.
 */
export interface Octave {
  /** Octave index: the A grid's plane pitch is `planePitch0 / 2^n`. */
  readonly n: number;
  /** Plane pitch of the B grid, which is the id buffer's cell size. */
  readonly cell: number;
  /** Screen pitch of the A grid, CSS pixels. */
  readonly pitchA: number;
  /** Alpha of the B-only points, 0..1. */
  readonly fadeB: number;
  /** The pitch drawn for the current blend of grids, CSS pixels: never above the ceiling. */
  readonly pitch: number;
  /** Dot radius in CSS pixels for the current blend of grids. */
  readonly radius: number;
}

export const PLANE_PITCH_0 = 64;
const FADE_START = 0.6;
/**
 * Shifts the octave so the drawn pitch straddles the target instead of sitting
 * above it: the A grid runs from about 0.8× to 1.6× of the target, and the
 * fade toward the half-pitch grid starts near 1.2×.
 */
const OCTAVE_OFFSET = 0.3;

/**
 * `ceiling` caps the drawn pitch. Octave quantization lets the A grid run up
 * to 1.6× the target, so near the ceiling the half-pitch grid fades in early,
 * exactly as far as it takes to hold the blend at the ceiling. The bump is
 * zero where the A grid is under the ceiling, so it joins the ordinary
 * crossfade without a pop.
 */
export function octaveFor(k: number, target: number, dpr = 1, ceiling = Number.POSITIVE_INFINITY): Octave {
  const exact = Math.log2((PLANE_PITCH_0 * k) / target) + OCTAVE_OFFSET;
  const n = Math.floor(exact);
  const frac = exact - n;
  const planeA = PLANE_PITCH_0 / 2 ** n;
  const pitchA = planeA * k;
  const held = Math.min(1, Math.max(0, 2 * (1 - ceiling / pitchA)));
  const fadeB = Math.max(smoothstep(FADE_START, 1, frac), held);
  const pitch = pitchA * (1 - fadeB) + (pitchA / 2) * fadeB;
  return { n, cell: planeA / 2, pitchA, fadeB, pitch, radius: Math.max(pitch * RADIUS_RATIO, MIN_RADIUS_DEVICE_PX / dpr) };
}

/** Radius for a magnitude lens: 0.6× to 1.6× of the base, square-root scaled so area tracks value. */
export function magnitudeRadius(base: number, value: number, max: number): number {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return base * (0.6 + Math.sqrt(share));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
