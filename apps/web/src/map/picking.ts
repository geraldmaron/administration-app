import { NO_REGION } from "./id-color";
import { DotKind, type Dots, type IdGrid } from "./lattice";

/** Read the id buffer at a lattice cell, or NO_REGION outside it. */
export function regionAtCell(grid: IdGrid, i: number, j: number): number {
  const px = i - grid.i0;
  const py = j - grid.j0;
  if (px < 0 || py < 0 || px >= grid.width || py >= grid.height) return NO_REGION;
  return grid.ids[py * grid.width + px] ?? NO_REGION;
}

function nearestCentroid(dots: Dots, x: number, y: number, reach: number): number {
  let best = NO_REGION;
  let bestDistance = reach * reach;
  for (let d = 0; d < dots.count; d++) {
    if (dots.kind[d] !== DotKind.Centroid) continue;
    const dx = (dots.x[d] ?? Number.NaN) - x;
    const dy = (dots.y[d] ?? Number.NaN) - y;
    const distance = dx * dx + dy * dy;
    if (distance <= bestDistance) [best, bestDistance] = [dots.region[d] ?? NO_REGION, distance];
  }
  return best;
}

function majorityAround(grid: IdGrid, i: number, j: number): number {
  const tally = new Map<number, number>();
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      const r = regionAtCell(grid, i + di, j + dj);
      if (r !== NO_REGION) tally.set(r, (tally.get(r) ?? 0) + 1);
    }
  }
  let best = NO_REGION;
  let most = 0;
  for (const [r, count] of tally) if (count > most) [best, most] = [r, count];
  return best;
}

/**
 * The region under a plane point. Centroid dots win within `reachPx` screen
 * pixels: a microstate's dot sits inside a neighbor's shape and would
 * otherwise be unpickable. Then the id buffer at the nearest lattice cell,
 * and on a border (where the buffer holds no id) the majority of the eight
 * cells around it.
 */
export function pickRegion(grid: IdGrid, dots: Dots, x: number, y: number, k: number, reachPx = 10): number {
  const centroid = nearestCentroid(dots, x, y, reachPx / k);
  if (centroid !== NO_REGION) return centroid;
  const i = Math.round(x / grid.cell);
  const j = Math.round(y / grid.cell);
  const direct = regionAtCell(grid, i, j);
  return direct !== NO_REGION ? direct : majorityAround(grid, i, j);
}
