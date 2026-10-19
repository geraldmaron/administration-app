import { NO_REGION } from "./id-color";

/** How a dot entered the lattice; decides its alpha and whether it carries a ring. */
export const DotKind = { A: 0, B: 1, Sub: 2, Centroid: 3 } as const;
export type DotKind = (typeof DotKind)[keyof typeof DotKind];

/** Regions with fewer A dots than this get their B points at full strength: the local sub-grid. */
export const SUBGRID_BELOW = 12;

/**
 * The id buffer, one pixel per B-grid cell. Pixel (px, py) samples the plane
 * at `((i0 + px) * cell, (j0 + py) * cell)`: lattice points sit on cell
 * corners, so the B grid of one octave is exactly the A grid of the next.
 */
export interface IdGrid {
  readonly ids: Int32Array;
  readonly width: number;
  readonly height: number;
  readonly i0: number;
  readonly j0: number;
  readonly cell: number;
}

/** Plane-space centroid per region; NaN where the projection cannot show it. */
export interface Centroids {
  readonly x: Float64Array;
  readonly y: Float64Array;
}

export interface Dots {
  readonly count: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly region: Int32Array;
  readonly kind: Uint8Array;
  /** Stable per-lattice-point hash in [0, 1): the dither order. */
  readonly key: Float32Array;
  /** A-grid dots per region, before the sub-grid and centroid rules. */
  readonly countA: Int32Array;
}

/** A stable hash of a lattice point, independent of the buffer's origin. */
export function latticeKey(i: number, j: number): number {
  let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function countGrids(grid: IdGrid, regionCount: number): { countA: Int32Array; countB: Int32Array } {
  const countA = new Int32Array(regionCount);
  const countB = new Int32Array(regionCount);
  for (let py = 0; py < grid.height; py++) {
    const rowIsA = (grid.j0 + py) % 2 === 0;
    for (let px = 0; px < grid.width; px++) {
      const r = grid.ids[py * grid.width + px] ?? NO_REGION;
      if (r === NO_REGION) continue;
      countB[r] = (countB[r] ?? 0) + 1;
      if (rowIsA && (grid.i0 + px) % 2 === 0) countA[r] = (countA[r] ?? 0) + 1;
    }
  }
  return { countA, countB };
}

function kindOf(isA: boolean, smallRegion: boolean): DotKind {
  if (smallRegion) return DotKind.Sub;
  return isA ? DotKind.A : DotKind.B;
}

/**
 * Turns the id buffer into dots. Every B point inside a region becomes a dot;
 * the A/B split drives the octave crossfade. A region with fewer than
 * `SUBGRID_BELOW` A dots shows all its B points at full strength, and a
 * region the lattice misses entirely gets one centroid dot with a ring, so
 * DC, a microstate or an urban district never disappears.
 */
export function sampleLattice(grid: IdGrid, regionCount: number, centroids: Centroids): Dots {
  const { countA, countB } = countGrids(grid, regionCount);
  let total = 0;
  for (let r = 0; r < regionCount; r++) total += countB[r] ?? 0;
  const capacity = total + regionCount;
  const out = { x: new Float32Array(capacity), y: new Float32Array(capacity), region: new Int32Array(capacity), kind: new Uint8Array(capacity), key: new Float32Array(capacity) };
  let n = 0;
  for (let py = 0; py < grid.height; py++) {
    const j = grid.j0 + py;
    for (let px = 0; px < grid.width; px++) {
      const r = grid.ids[py * grid.width + px] ?? NO_REGION;
      if (r === NO_REGION) continue;
      const i = grid.i0 + px;
      out.x[n] = i * grid.cell;
      out.y[n] = j * grid.cell;
      out.region[n] = r;
      out.kind[n] = kindOf(i % 2 === 0 && j % 2 === 0, (countA[r] ?? 0) < SUBGRID_BELOW);
      out.key[n] = latticeKey(i, j);
      n++;
    }
  }
  n = addCentroids(grid, countB, centroids, out, n);
  return { count: n, x: out.x, y: out.y, region: out.region, kind: out.kind, key: out.key, countA };
}

function addCentroids(
  grid: IdGrid,
  countB: Int32Array,
  centroids: Centroids,
  out: { x: Float32Array; y: Float32Array; region: Int32Array; kind: Uint8Array; key: Float32Array },
  start: number,
): number {
  const minX = (grid.i0 - 0.5) * grid.cell;
  const minY = (grid.j0 - 0.5) * grid.cell;
  const maxX = minX + grid.width * grid.cell;
  const maxY = minY + grid.height * grid.cell;
  let n = start;
  for (let r = 0; r < countB.length; r++) {
    if ((countB[r] ?? 0) > 0) continue;
    const cx = centroids.x[r] ?? Number.NaN;
    const cy = centroids.y[r] ?? Number.NaN;
    if (!(cx >= minX && cx < maxX && cy >= minY && cy < maxY)) continue;
    out.x[n] = cx;
    out.y[n] = cy;
    out.region[n] = r;
    out.kind[n] = DotKind.Centroid;
    out.key[n] = 0.5;
    n++;
  }
  return n;
}
