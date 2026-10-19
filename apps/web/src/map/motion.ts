import { rectInside, type Rect } from "./camera";

/** The camera setting: Fly, Quick (the default after a first session) or Cut. */
export type CameraMotion = "fly" | "quick" | "cut";

/** How a move is drawn: a jump, or a flight held under `maxDuration` ms (absent: the van Wijk timing, 600–1100ms). */
export type MotionChoice = { readonly kind: "cut" } | { readonly kind: "move"; readonly maxDuration?: number };

/** A move this small is a pan or zoom, never a flight. */
export const SHORT_MOVE_MS = 250;
/** Quick holds even a long move to this. */
export const QUICK_MOVE_MS = 350;
/** Beyond this many zoom levels (log2 of the change in on-screen size) a move is long. */
export const LONG_ZOOM_LEVELS = 1.5;

/**
 * Whether a move is long: the target is not inside the current framing, or
 * the zoom changes by more than about one and a half levels. `from` is where
 * the target sits on screen now (null when it cannot be drawn there), `to`
 * where it will sit after landing, `area` the visible map.
 */
export function isLongMove(from: Rect | null, to: Rect, area: Rect): boolean {
  if (!from) return true;
  if (!rectInside(from, area, 2)) return true;
  const sizeNow = Math.max(from.x1 - from.x0, from.y1 - from.y0, 1e-6);
  const sizeThen = Math.max(to.x1 - to.x0, to.y1 - to.y0, 1e-6);
  return Math.abs(Math.log2(sizeThen / sizeNow)) > LONG_ZOOM_LEVELS;
}

/** The motion rules: reduced motion and Cut jump; a short move is quick under any setting; Fly flies a long one. */
export function chooseMotion(setting: CameraMotion, reducedMotion: boolean, long: boolean): MotionChoice {
  if (reducedMotion || setting === "cut") return { kind: "cut" };
  if (!long) return { kind: "move", maxDuration: SHORT_MOVE_MS };
  return setting === "quick" ? { kind: "move", maxDuration: QUICK_MOVE_MS } : { kind: "move" };
}

/** Recolor timing: a level change takes longer than a swap at the same level, and reduced motion is instant. */
export function recolorDuration(levelChanged: boolean, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return levelChanged ? 400 : 200;
}

/** Detachment runs about 280ms, instant under reduced motion. */
export function detachDuration(reducedMotion: boolean): number {
  return reducedMotion ? 0 : 280;
}
