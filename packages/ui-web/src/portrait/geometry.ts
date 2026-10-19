// Plane geometry for a 200-unit portrait frame, centered on x = 100.

export type Pt = { readonly x: number; readonly y: number };

export const CX = 100;

export const pt = (x: number, y: number): Pt => ({ x, y });

const r2 = (n: number): string => {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? "0" : String(v);
};

export const fmt = (p: Pt): string => `${r2(p.x)},${r2(p.y)}`;

export const mirror = (p: Pt): Pt => ({ x: 2 * CX - p.x, y: p.y });

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

export const add = (a: Pt, dx: number, dy: number): Pt => ({ x: a.x + dx, y: a.y + dy });

export const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));

/**
 * A symmetric outline from its right half, listed top to bottom. The two ends
 * sit on the center line, so the mirrored half joins without a seam.
 */
export function symmetric(rightHalf: readonly Pt[]): Pt[] {
  const inner = rightHalf.slice(1, -1).map(mirror).reverse();
  return [...rightHalf, ...inner];
}

type Segment = { readonly p1: Pt; readonly c1: Pt; readonly c2: Pt; readonly p2: Pt };

/**
 * Centripetal Catmull-Rom, converted to cubic Bezier segments. The uniform
 * variant overshoots wherever points are unevenly spaced, which is exactly
 * where a face needs a tight turn (a square jaw, a hairline's corner), so the
 * parameterization follows the square root of the chord length instead.
 */
function catmullSegments(points: readonly Pt[], closed: boolean, tension: number): Segment[] {
  const n = points.length;
  const at = (i: number): Pt => (closed ? points[(i + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  const count = closed ? n : n - 1;
  const gap = (a: Pt, b: Pt): number => Math.max(1e-4, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)));
  const segments: Segment[] = [];
  for (let i = 0; i < count; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const d1 = gap(p0, p1);
    const d2 = gap(p1, p2);
    const d3 = gap(p2, p3);
    const b1 = {
      x: (d1 * d1 * p2.x - d2 * d2 * p0.x + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.x) / (3 * d1 * (d1 + d2)),
      y: (d1 * d1 * p2.y - d2 * d2 * p0.y + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.y) / (3 * d1 * (d1 + d2)),
    };
    const b2 = {
      x: (d3 * d3 * p1.x - d2 * d2 * p3.x + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.x) / (3 * d3 * (d3 + d2)),
      y: (d3 * d3 * p1.y - d2 * d2 * p3.y + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.y) / (3 * d3 * (d3 + d2)),
    };
    segments.push({
      p1,
      c1: { x: p1.x + (b1.x - p1.x) * tension, y: p1.y + (b1.y - p1.y) * tension },
      c2: { x: p2.x + (b2.x - p2.x) * tension, y: p2.y + (b2.y - p2.y) * tension },
      p2,
    });
  }
  return segments;
}

/** A smooth curve through every point: the path most shapes in a face are. */
export function smooth(points: readonly Pt[], closed = true, tension = 1): string {
  if (points.length < 2) return "";
  const segments = catmullSegments(points, closed, tension);
  const body = segments.map((s) => `C${fmt(s.c1)} ${fmt(s.c2)} ${fmt(s.p2)}`).join("");
  return `M${fmt(points[0]!)}${body}${closed ? "Z" : ""}`;
}

export function polygon(points: readonly Pt[]): string {
  return `M${points.map(fmt).join("L")}Z`;
}

export function polyline(points: readonly Pt[]): string {
  return `M${points.map(fmt).join("L")}`;
}

function bezierAt(s: Segment, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * s.p1.x + b * s.c1.x + c * s.c2.x + d * s.p2.x,
    y: a * s.p1.y + b * s.c1.y + c * s.c2.y + d * s.p2.y,
  };
}

/** The same smooth curve as a dense polyline, for offsets and edge textures. */
export function sample(points: readonly Pt[], closed = true, perSegment = 10, tension = 1): Pt[] {
  const out: Pt[] = [];
  for (const segment of catmullSegments(points, closed, tension)) {
    for (let i = 0; i < perSegment; i += 1) out.push(bezierAt(segment, i / perSegment));
  }
  if (!closed) out.push(points[points.length - 1]!);
  return out;
}

/** Push each point away from a center, by an amount that may depend on direction. */
export function inflate(points: readonly Pt[], center: Pt, amount: (dir: Pt) => number): Pt[] {
  return points.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const len = Math.hypot(dx, dy) || 1;
    const dir = { x: dx / len, y: dy / len };
    const d = amount(dir);
    return { x: p.x + dir.x * d, y: p.y + dir.y * d };
  });
}

/**
 * An edge broken into small outward arcs: what curly and coiled hair looks
 * like at the silhouette. Arc size varies with a deterministic wobble so the
 * edge never reads as a stamped pattern.
 */
export function scallop(points: readonly Pt[], radius: number, closed: boolean, wobble: (i: number) => number): string {
  const pts = closed ? [...points, points[0]!] : [...points];
  let d = `M${fmt(pts[0]!)}`;
  let i = 0;
  let from = pts[0]!;
  let acc = 0;
  for (let k = 1; k < pts.length; k += 1) {
    acc += Math.hypot(pts[k]!.x - pts[k - 1]!.x, pts[k]!.y - pts[k - 1]!.y);
    const step = radius * 2 * (0.8 + 0.4 * wobble(i));
    if (acc >= step || k === pts.length - 1) {
      const to = pts[k]!;
      const r = Math.max(0.4, (Math.hypot(to.x - from.x, to.y - from.y) / 2) * (1.05 + 0.25 * wobble(i + 7)));
      d += `A${r2(r)},${r2(r)} 0 0 1 ${fmt(to)}`;
      from = to;
      acc = 0;
      i += 1;
    }
  }
  return closed ? `${d}Z` : d;
}

/** Offset an open polyline sideways (positive = to the right of travel). */
export function offsetLine(points: readonly Pt[], dist: (t: number) => number): Pt[] {
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const d = dist(i / Math.max(1, points.length - 1));
    return { x: p.x + (dy / len) * d, y: p.y - (dx / len) * d };
  });
}

/** A tapered ribbon along a centerline: brows, strands, folds. */
export function ribbon(center: readonly Pt[], width: (t: number) => number): string {
  const left = offsetLine(center, (t) => width(t) / 2);
  const right = offsetLine(center, (t) => -width(t) / 2);
  return smooth([...left, ...right.reverse()], true, 0.9);
}
