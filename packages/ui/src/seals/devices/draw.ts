/**
 * Plotting helpers for the device drawings. Every device is authored on a
 * 100×100 grid; these turn point lists and regular figures into path data so
 * symmetric and repeated forms (a wing and its mirror, a ring of stars, the
 * teeth of a gear) are drawn once and stay exact.
 */
export type Point = readonly [number, number];

const r2 = (n: number) => Math.round(n * 100) / 100;

export function poly(points: readonly Point[]): string {
  return `M${points.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" L")} Z`;
}

export function line(points: readonly Point[]): string {
  return `M${points.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" L")}`;
}

export function mirror(points: readonly Point[], axis = 50): readonly Point[] {
  return points.map(([x, y]) => [2 * axis - x, y] as const);
}

export function rotate(points: readonly Point[], degrees: number, cx = 50, cy = 50): readonly Point[] {
  const a = (degrees * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return points.map(([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos] as const);
}

export function circle(cx: number, cy: number, r: number): string {
  return `M${r2(cx - r)},${r2(cy)} a${r2(r)},${r2(r)} 0 1,0 ${r2(2 * r)},0 a${r2(r)},${r2(r)} 0 1,0 ${r2(-2 * r)},0 Z`;
}

/** A point at `degrees` clockwise from twelve o'clock. */
export function polar(cx: number, cy: number, r: number, degrees: number): Point {
  const a = (degrees * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}

export function star(cx: number, cy: number, r: number, points = 5, inner = 0.382, turn = 0): string {
  const pts: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    pts.push(polar(cx, cy, i % 2 === 0 ? r : r * inner, turn + (i * 180) / points));
  }
  return poly(pts);
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, degrees = 0, steps = 48): string {
  const pts: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return poly(rotate(pts, degrees, cx, cy));
}

/** A pointed leaf from its base along `degrees` (clockwise from twelve o'clock). */
export function leaf(x: number, y: number, length: number, width: number, degrees: number): string {
  const tip = polar(x, y, length, degrees);
  const mid = polar(x, y, length * 0.5, degrees);
  const side = polar(0, 0, width / 2, degrees + 90);
  const a: Point = [mid[0] + side[0], mid[1] + side[1]];
  const b: Point = [mid[0] - side[0], mid[1] - side[1]];
  return `M${r2(x)},${r2(y)} Q${r2(a[0])},${r2(a[1])} ${r2(tip[0])},${r2(tip[1])} Q${r2(b[0])},${r2(b[1])} ${r2(x)},${r2(y)} Z`;
}

/** Points along an arc of a circle, from `from` to `to` degrees. */
export function arcPoints(cx: number, cy: number, r: number, from: number, to: number, count: number): readonly Point[] {
  return Array.from({ length: count }, (_, i) => polar(cx, cy, r, from + ((to - from) * i) / Math.max(1, count - 1)));
}

export function rect(x: number, y: number, w: number, h: number): string {
  return poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
}
