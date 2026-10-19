import type { Rect } from "./camera";

/** Where the Alaska and Hawaii insets sit on the US home view, and how much height the contiguous states give up for them. */
export interface InsetLayout {
  readonly alaska: Rect;
  readonly hawaii: Rect;
  /** Height taken off the bottom of the area the contiguous states are framed in. */
  readonly reserve: number;
}

const GAP = 8;

/**
 * The two insets share one band along the bottom left of the visible area,
 * Alaska first, the way the printed national map places them. The band
 * scales with the area and is held between a size a phone can still read
 * and one that does not crowd a desktop, and the contiguous states give up
 * a little over half of it: the insets sit over the Pacific and Mexico, which
 * the states' own framing leaves empty in that corner.
 */
export function insetLayout(area: Rect): InsetLayout {
  const width = area.x1 - area.x0;
  const height = area.y1 - area.y0;
  const band = Math.max(56, Math.min(150, height * 0.24, width * 0.2));
  const y1 = area.y1 - GAP;
  const y0 = y1 - band;
  const alaska: Rect = { x0: area.x0 + GAP, y0, x1: area.x0 + GAP + band * 1.35, y1 };
  const hawaiiHeight = band * 0.62;
  const hawaii: Rect = { x0: alaska.x1 + GAP, y0: y1 - hawaiiHeight, x1: alaska.x1 + GAP + band * 0.95, y1 };
  return { alaska, hawaii, reserve: Math.round(band * 0.55) };
}
