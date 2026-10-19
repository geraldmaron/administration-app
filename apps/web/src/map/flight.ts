import { applyAffine, easeInOut, flightDuration, smoothZoom, type Affine, type Rect, type View, type Viewport, type ZoomPath } from "./camera";

/**
 * A flight between two camera targets drawn from two cached bitmaps: the
 * last frame of the source view and a frame of the destination rendered in
 * its own projection. Neither is re-projected while moving; each is placed
 * with an affine transform, and the destination fades in over the second
 * half. The two projections differ (Natural Earth versus azimuthal), so they
 * are tied together by the target's rectangle in each: `from` is where the
 * target sits on screen now, `to` is where it will sit when the flight lands.
 */
export interface FlightPlan {
  readonly duration: number;
  readonly path: ZoomPath;
  readonly sigma: number;
  readonly from: Rect;
  readonly to: Rect;
  readonly viewport: Viewport;
}

const center = (r: Rect): readonly [number, number] => [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];

/** `maxDuration` holds a short move or the Quick setting under the van Wijk timing. */
export function planFlight(from: Rect, to: Rect, viewport: Viewport, maxDuration?: number): FlightPlan {
  const w1 = Math.max(from.x1 - from.x0, 1e-3);
  const h1 = Math.max(from.y1 - from.y0, 1e-3);
  const w2 = Math.max(to.x1 - to.x0, 1e-3);
  const h2 = Math.max(to.y1 - to.y0, 1e-3);
  const sigma = Math.sqrt((w2 * h2) / (w1 * h1));
  const [c1x, c1y] = center(from);
  const [c2x, c2y] = center(to);
  const start: View = { cx: viewport.width / 2, cy: viewport.height / 2, w: viewport.width };
  const end: View = { cx: c1x + (viewport.width / 2 - c2x) / sigma, cy: c1y + (viewport.height / 2 - c2y) / sigma, w: viewport.width / sigma };
  const path = smoothZoom(start, end);
  const duration = maxDuration === undefined ? flightDuration(path) : Math.min(maxDuration, flightDuration(path));
  return { duration, path, sigma, from, to, viewport };
}

export interface FlightFrame {
  /** Where the source bitmap (screen pixels at take-off) is drawn. */
  readonly source: Affine;
  /** Where the destination bitmap (screen pixels at landing) is drawn. */
  readonly dest: Affine;
  readonly destAlpha: number;
}

export function flightFrame(plan: FlightPlan, elapsed: number): FlightFrame {
  const t = Math.min(1, Math.max(0, elapsed / plan.duration));
  const view = plan.path.at(easeInOut(t));
  const { width, height } = plan.viewport;
  const s = width / view.w;
  const source: Affine = { k: s, x: width / 2 - view.cx * s, y: height / 2 - view.cy * s };
  const [c1x, c1y] = center(plan.from);
  const [c2x, c2y] = center(plan.to);
  const dest: Affine = {
    k: s / plan.sigma,
    x: (c1x - c2x / plan.sigma - view.cx) * s + width / 2,
    y: (c1y - c2y / plan.sigma - view.cy) * s + height / 2,
  };
  const fade = Math.min(1, Math.max(0, (t - 0.45) / 0.45));
  return { source, dest, destAlpha: fade * fade * (3 - 2 * fade) };
}

/**
 * Where a lon/lat sits mid-flight, so a pin rides the land instead of
 * waiting for the landing: the point as the source bitmap carries it, moving
 * toward the point as the destination bitmap carries it while that bitmap
 * fades in. Either may be off its hemisphere (null); the visible bitmap wins.
 */
export function flightPoint(
  frame: FlightFrame,
  source: readonly [number, number] | null,
  dest: readonly [number, number] | null,
  destReady: boolean,
): readonly [number, number] | null {
  const a = source ? applyAffine(frame.source, source[0], source[1]) : null;
  if (!destReady) return a;
  const b = dest ? applyAffine(frame.dest, dest[0], dest[1]) : null;
  if (!a || !b) return frame.destAlpha >= 0.5 ? b : a;
  const t = frame.destAlpha;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
