// Pure geometry for the legislature drawings, kept apart from the renderer so
// the seat order a screen reader is told and the seat order drawn agree, and
// so both can be tested without a canvas.

export type SeatPlace = { readonly x: number; readonly y: number; readonly angle: number };

/** How many rows a chamber of this size is drawn in. */
function rowCount(seats: number): number {
  return Math.max(2, Math.min(12, Math.round(Math.sqrt(seats / 4))));
}

/**
 * Every seat's place on a half ring in a 100×54 box, filled row by row in
 * proportion to each row's length, then ordered by angle so parties fill from
 * left to right as a chamber's seating does.
 */
export function hemicycleSeats(total: number): readonly SeatPlace[] {
  if (total <= 0) return [];
  const rows = rowCount(total);
  const radii = Array.from({ length: rows }, (_, i) => 0.42 + (0.58 * i) / Math.max(1, rows - 1));
  const length = radii.reduce((sum, r) => sum + r, 0);
  const base = radii.map((r) => Math.floor((total * r) / length));
  const short = total - base.reduce((sum, n) => sum + n, 0);
  // Flooring each row leaves fewer seats over than there are rows; they go to the outer rows, where there is the most room.
  const perRow = base.map((n, row) => n + (rows - 1 - row < short ? 1 : 0));
  const seats = radii.flatMap((r, row) => {
    const n = perRow[row]!;
    return Array.from({ length: n }, (_, k) => {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (Math.PI * k) / (n - 1);
      return { x: 50 + 46 * r * Math.cos(angle), y: 50 - 46 * r * Math.sin(angle), angle };
    });
  });
  return [...seats].sort((a, b) => b.angle - a.angle);
}

/** A seat mark's radius for a chamber of this size, so a 9-seat bench and a 435-seat House both fill the ring. */
export function seatRadius(total: number): number {
  return Math.max(0.6, Math.min(2.2, 46 / Math.sqrt(Math.max(1, total) * 3.2)));
}

/**
 * The majority line: a spoke through the half ring between the seat that
 * makes a majority, counted from the left, and the one after it.
 */
export function majoritySpoke(seats: readonly SeatPlace[], majority: number | undefined): { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number } | undefined {
  if (!majority || majority >= seats.length) return undefined;
  const angle = (seats[majority - 1]!.angle + seats[majority]!.angle) / 2;
  const at = (r: number) => ({ x: 50 + 46 * r * Math.cos(angle), y: 50 - 46 * r * Math.sin(angle) });
  const inner = at(0.32);
  const outer = at(1.08);
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
}

/** A bench of `count` seats on one arc in a 320×170 box, left to right. */
export function benchSeats(count: number): readonly { readonly x: number; readonly y: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = Math.PI - (Math.PI * (index + 0.5)) / Math.max(1, count);
    return { x: 160 + 124 * Math.cos(angle), y: 148 - 124 * Math.sin(angle) };
  });
}

export const RIDGE_WIDTH = 1000;
export const RIDGE_HEIGHT = 150;
const GRID = 200;
/** How far one member's position spreads into the ridge, on the -1 to 1 scale. */
const BANDWIDTH = 0.045;

export type RidgeInput = { readonly id: string; readonly positions: readonly number[] };
export type RidgeShape = { readonly id: string; readonly count: number; readonly path: string; readonly median?: number };

/** A position on the -1..1 scale as an x in the ridge box. */
export const ridgeX = (position: number): number => ((position + 1) / 2) * RIDGE_WIDTH;

/**
 * Each group's members as one ridge: a smoothed count of members at every
 * position, so the area under a ridge is the group's size. Every ridge shares
 * one vertical scale, so a bigger group stands taller.
 */
export function ridgeShapes(groups: readonly RidgeInput[]): readonly RidgeShape[] {
  const grid = Array.from({ length: GRID + 1 }, (_, i) => -1 + (2 * i) / GRID);
  const kernel = (d: number) => Math.exp(-(d * d) / (2 * BANDWIDTH * BANDWIDTH));
  const curves = groups
    .filter((group) => group.positions.length > 0)
    .map((group) => {
      const sorted = [...group.positions].sort((a, b) => a - b);
      return { id: group.id, count: sorted.length, median: sorted[Math.floor(sorted.length / 2)], heights: grid.map((g) => sorted.reduce((sum, p) => sum + kernel(g - p), 0)) };
    });
  const top = Math.max(1e-9, ...curves.flatMap((curve) => curve.heights));
  return curves.map((curve) => {
    const points = curve.heights.map((h, i) => `${ridgeX(grid[i]!).toFixed(1)},${(RIDGE_HEIGHT - (h / top) * (RIDGE_HEIGHT - 8)).toFixed(1)}`);
    return { id: curve.id, count: curve.count, ...(curve.median !== undefined ? { median: curve.median } : {}), path: `M0,${RIDGE_HEIGHT} L${points.join(" L")} L${RIDGE_WIDTH},${RIDGE_HEIGHT} Z` };
  });
}
