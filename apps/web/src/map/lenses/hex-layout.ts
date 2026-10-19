import type { Rect } from "../camera";

// The House's equal-area view: every district one hex, placed as near its
// real centroid as the cells already taken allow. Alaska and Hawaii are moved
// to the lower left the way the printed national map moves them, so the
// layout is one compact block.

export interface HexSeat {
  readonly id: string;
  readonly state: string;
  readonly lon: number;
  readonly lat: number;
}

export interface HexCell {
  readonly id: string;
  readonly state: string;
  readonly q: number;
  readonly r: number;
  /** Center in layout units; `size` is the hex's circumradius in the same units. */
  readonly x: number;
  readonly y: number;
}

export interface HexLayout {
  readonly cells: readonly HexCell[];
  readonly size: number;
  readonly bounds: Rect;
}

const SQRT3 = Math.sqrt(3);
const COS_MID_LATITUDE = Math.cos((38 * Math.PI) / 180);
/** Share of the seats' bounding box the hexes fill; districts crowd the east, so the box is mostly empty. */
const FILL = 0.4;
const MOVED: Readonly<Record<string, readonly [number, number]>> = { AK: [-117, 27.5], HI: [-109, 25] };

function planar(seat: HexSeat): readonly [number, number] {
  const [lon, lat] = MOVED[seat.state] ?? [seat.lon, seat.lat];
  return [lon * COS_MID_LATITUDE, -lat];
}

function center(q: number, r: number, size: number): readonly [number, number] {
  return [size * (SQRT3 * q + (SQRT3 / 2) * r), size * 1.5 * r];
}

function nearestCell(x: number, y: number, size: number): readonly [number, number] {
  const qf = ((SQRT3 / 3) * x - y / 3) / size;
  const rf = ((2 / 3) * y) / size;
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return [q, r];
}

const DIRECTIONS: readonly (readonly [number, number])[] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

/** The cells at hex distance `k` from (q, r). */
export function ring(q: number, r: number, k: number): readonly (readonly [number, number])[] {
  if (k === 0) return [[q, r]];
  const cells: [number, number][] = [];
  let cq = q + (DIRECTIONS[4]?.[0] ?? 0) * k;
  let cr = r + (DIRECTIONS[4]?.[1] ?? 0) * k;
  for (const [dq, dr] of DIRECTIONS) {
    for (let step = 0; step < k; step++) {
      cells.push([cq, cr]);
      cq += dq;
      cr += dr;
    }
  }
  return cells;
}

type Cell = readonly [number, number];
const keyOf = ([q, r]: Cell): string => `${q},${r}`;

function nearestTo(cells: readonly Cell[], x: number, y: number, size: number): Cell | undefined {
  const distance = ([q, r]: Cell): number => {
    const [cx, cy] = center(q, r, size);
    return (cx - x) ** 2 + (cy - y) ** 2;
  };
  return cells.reduce<Cell | undefined>((best, cell) => (best === undefined || distance(cell) < distance(best) ? cell : best), undefined);
}

/** The free cell nearest a point, searching outward ring by ring. */
function claimNear(taken: ReadonlySet<string>, x: number, y: number, size: number): Cell {
  const [q0, r0] = nearestCell(x, y, size);
  for (let k = 0; ; k++) {
    const found = nearestTo(ring(q0, r0, k).filter((cell) => !taken.has(keyOf(cell))), x, y, size);
    if (found) return found;
  }
}

/**
 * Grow one state's block: seed at the free cell nearest its centroid, then
 * keep claiming the free neighbor of the block nearest the centroid, so the
 * block stays compact and whole.
 */
function growBlock(taken: Set<string>, count: number, x: number, y: number, size: number): readonly Cell[] {
  const block: Cell[] = [claimNear(taken, x, y, size)];
  taken.add(keyOf(block[0]!));
  while (block.length < count) {
    const frontier = block.flatMap(([q, r]) => ring(q, r, 1)).filter((cell) => !taken.has(keyOf(cell)));
    const next = nearestTo(frontier, x, y, size) ?? claimNear(taken, x, y, size);
    taken.add(keyOf(next));
    block.push(next);
  }
  return block;
}

/** Hand a block's cells to its seats: the seat farthest from the state's center chooses first, so outer seats take outer cells. */
function seatBlock(seats: readonly { seat: HexSeat; point: readonly [number, number] }[], block: readonly Cell[], x: number, y: number, size: number): readonly HexCell[] {
  const order = [...seats].sort((a, b) => Math.hypot(b.point[0] - x, b.point[1] - y) - Math.hypot(a.point[0] - x, a.point[1] - y) || a.seat.id.localeCompare(b.seat.id));
  let free = [...block];
  return order.map(({ seat, point }) => {
    const cell = nearestTo(free, point[0], point[1], size) ?? block[0]!;
    free = free.filter((c) => c !== cell);
    const [cx, cy] = center(cell[0], cell[1], size);
    return { id: seat.id, state: seat.state, q: cell[0], r: cell[1], x: cx, y: cy };
  });
}

/** Lay every seat on its own hex, each state one compact block near where it is. Deterministic. */
export function hexLayout(seats: readonly HexSeat[]): HexLayout {
  const points = seats.map((seat) => ({ seat, point: planar(seat) }));
  const xs = points.map((p) => p.point[0]);
  const ys = points.map((p) => p.point[1]);
  const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  const size = Math.sqrt((area * FILL) / (Math.max(1, seats.length) * 1.5 * SQRT3));
  const byState = new Map<string, typeof points>();
  for (const entry of points) byState.set(entry.seat.state, [...(byState.get(entry.seat.state) ?? []), entry]);
  const states = [...byState.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const taken = new Set<string>();
  const cells = states.flatMap(([, members]) => {
    const x = members.reduce((sum, m) => sum + m.point[0], 0) / members.length;
    const y = members.reduce((sum, m) => sum + m.point[1], 0) / members.length;
    return seatBlock(members, growBlock(taken, members.length, x, y, size), x, y, size);
  });
  const bounds: Rect = {
    x0: Math.min(...cells.map((c) => c.x)) - size,
    y0: Math.min(...cells.map((c) => c.y)) - size,
    x1: Math.max(...cells.map((c) => c.x)) + size,
    y1: Math.max(...cells.map((c) => c.y)) + size,
  };
  return { cells: [...cells].sort((a, b) => a.id.localeCompare(b.id)), size, bounds };
}
