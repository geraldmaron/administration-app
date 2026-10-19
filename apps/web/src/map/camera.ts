/** Plane to screen: `screen = plane * k + (x, y)`, in CSS pixels. */
export interface Affine {
  readonly k: number;
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** A view for zoom interpolation: the center and width of what is framed, in one coordinate space. */
export interface View {
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** The affine that frames `plane` inside the viewport with `padding` CSS pixels on every side. */
export function fitRect(plane: Rect, viewport: Viewport, padding = 24): Affine {
  return fitRectIn(plane, { x0: 0, y0: 0, x1: viewport.width, y1: viewport.height }, padding);
}

/** The affine that frames `plane` inside a screen `area`, centered there, with `padding` CSS pixels on every side. */
export function fitRectIn(plane: Rect, area: Rect, padding = 24): Affine {
  const pw = Math.max(plane.x1 - plane.x0, 1e-6);
  const ph = Math.max(plane.y1 - plane.y0, 1e-6);
  const aw = Math.max(area.x1 - area.x0 - padding * 2, 1);
  const ah = Math.max(area.y1 - area.y0 - padding * 2, 1);
  const k = Math.min(aw / pw, ah / ph);
  return {
    k,
    x: (area.x0 + area.x1) / 2 - ((plane.x0 + plane.x1) / 2) * k,
    y: (area.y0 + area.y1) / 2 - ((plane.y0 + plane.y1) / 2) * k,
  };
}

/** What the shell's chrome covers on each side of the map, CSS pixels. */
export interface MapInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const NO_INSETS: MapInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * The part of the viewport the map can be seen in. An inset that leaves less
 * than a sliver (a full-height sheet) collapses to a strip at the top, so the
 * camera still has somewhere to frame and the locator stays honest.
 */
export function visibleArea(viewport: Viewport, insets: MapInsets = NO_INSETS): Rect {
  const minSide = 48;
  const x0 = Math.min(Math.max(0, insets.left), Math.max(0, viewport.width - minSide));
  const x1 = Math.max(x0 + minSide, viewport.width - Math.max(0, insets.right));
  const y0 = Math.min(Math.max(0, insets.top), Math.max(0, viewport.height - minSide));
  const y1 = Math.max(y0 + minSide, viewport.height - Math.max(0, insets.bottom));
  return { x0, y0, x1: Math.min(x1, viewport.width), y1: Math.min(y1, viewport.height) };
}

/** Whether `inner` lies within `outer`, give or take `slack` pixels. */
export function rectInside(inner: Rect, outer: Rect, slack = 0): boolean {
  return inner.x0 >= outer.x0 - slack && inner.y0 >= outer.y0 - slack && inner.x1 <= outer.x1 + slack && inner.y1 <= outer.y1 + slack;
}

export function applyAffine(a: Affine, px: number, py: number): readonly [number, number] {
  return [px * a.k + a.x, py * a.k + a.y];
}

export function invertAffine(a: Affine, sx: number, sy: number): readonly [number, number] {
  return [(sx - a.x) / a.k, (sy - a.y) / a.k];
}

/** Zoom about a screen point, keeping that point fixed. */
export function zoomAbout(a: Affine, factor: number, sx: number, sy: number): Affine {
  const k = a.k * factor;
  return { k, x: sx - (sx - a.x) * factor, y: sy - (sy - a.y) * factor };
}

export function rectOfPoints(points: readonly (readonly [number, number])[]): Rect | null {
  const finite = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (finite.length === 0) return null;
  return {
    x0: Math.min(...finite.map((p) => p[0])),
    y0: Math.min(...finite.map((p) => p[1])),
    x1: Math.max(...finite.map((p) => p[0])),
    y1: Math.max(...finite.map((p) => p[1])),
  };
}

const RHO = Math.SQRT2;

export interface ZoomPath {
  /** Path length in van Wijk's units; duration scales with it. */
  readonly length: number;
  readonly at: (t: number) => View;
}

/**
 * van Wijk and Nuij's smooth zoom-and-pan: the optimal path between two views
 * that zooms out to cover the distance and back in. `t` runs 0..1.
 */
export function smoothZoom(from: View, to: View): ZoomPath {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  const d2 = dx * dx + dy * dy;
  if (d2 < 1e-12) {
    const s = Math.log(to.w / from.w) / RHO;
    return { length: Math.abs(s), at: (t) => ({ cx: from.cx + t * dx, cy: from.cy + t * dy, w: from.w * Math.exp(RHO * t * s) }) };
  }
  const d = Math.sqrt(d2);
  const b0 = (to.w * to.w - from.w * from.w + RHO ** 4 * d2) / (2 * from.w * RHO ** 2 * d);
  const b1 = (to.w * to.w - from.w * from.w - RHO ** 4 * d2) / (2 * to.w * RHO ** 2 * d);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const length = (r1 - r0) / RHO;
  const at = (t: number): View => {
    const s = t * length;
    const coshR0 = Math.cosh(r0);
    const u = (from.w / (RHO ** 2 * d)) * (coshR0 * Math.tanh(RHO * s + r0) - Math.sinh(r0));
    return { cx: from.cx + u * dx, cy: from.cy + u * dy, w: (from.w * coshR0) / Math.cosh(RHO * s + r0) };
  };
  return { length, at };
}

/** Flight duration: proportional to path length, held to the 600–1100ms band. */
export function flightDuration(path: ZoomPath): number {
  return Math.min(1100, Math.max(600, path.length * 320));
}

/** Ease for the flight clock. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
