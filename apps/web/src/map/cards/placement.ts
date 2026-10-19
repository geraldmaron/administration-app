import type { Rect } from "../camera";

/** A card waiting to be placed: its anchor on screen and its measured size. Lower priority numbers place first. */
export interface CardRequest {
  readonly key: string;
  readonly ax: number;
  readonly ay: number;
  readonly width: number;
  readonly height: number;
  readonly priority: number;
}

export interface CardPlacement {
  readonly key: string;
  /** Top-left of the card, or null when it found no room and is held back. */
  readonly at: readonly [number, number] | null;
  /** Where the leader line meets the card, nearest corner to the anchor. */
  readonly joint: readonly [number, number] | null;
}

/** Gap between an anchor and its card, and between two cards. */
const GAP = 16;
/** Cards on the map at once; the rest stay in the panel, where every card has its twin. */
export const MAX_CARDS = 3;
/** The pin under an anchor is kept clear of every card. */
const PIN_CLEAR = 12;

function overlaps(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function inside(r: Rect, area: Rect): boolean {
  return r.x0 >= area.x0 && r.y0 >= area.y0 && r.x1 <= area.x1 && r.y1 <= area.y1;
}

function rectAt(x: number, y: number, w: number, h: number): Rect {
  return { x0: x, y0: y, x1: x + w, y1: y + h };
}

/** Up-right first, the way a label reads off a pin, then the other three corners. */
function candidates(req: CardRequest): readonly Rect[] {
  const { ax, ay, width: w, height: h } = req;
  return [
    rectAt(ax + GAP, ay - h - GAP, w, h),
    rectAt(ax + GAP, ay + GAP, w, h),
    rectAt(ax - w - GAP, ay - h - GAP, w, h),
    rectAt(ax - w - GAP, ay + GAP, w, h),
  ];
}

function nearestCorner(r: Rect, ax: number, ay: number): readonly [number, number] {
  return [Math.min(Math.max(ax, r.x0), r.x1), Math.min(Math.max(ay, r.y0), r.y1)];
}

/**
 * Place cards beside their anchors without covering each other, any anchor's
 * pin, or anything outside the visible map. An anchor off the visible map
 * places nothing: a card pointing at a place you cannot see says nothing.
 */
export function placeCards(requests: readonly CardRequest[], area: Rect): readonly CardPlacement[] {
  const pins = requests.map((r) => ({ x0: r.ax - PIN_CLEAR, y0: r.ay - PIN_CLEAR, x1: r.ax + PIN_CLEAR, y1: r.ay + PIN_CLEAR }));
  const placed: Rect[] = [];
  const order = [...requests].sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key));
  const result = new Map<string, CardPlacement>();
  for (const req of order) {
    const anchorVisible = req.ax >= area.x0 && req.ax <= area.x1 && req.ay >= area.y0 && req.ay <= area.y1;
    const free = (r: Rect): boolean => inside(r, area) && !placed.some((p) => overlaps(p, r)) && !pins.some((p) => overlaps(p, r));
    const spot = anchorVisible && placed.length < MAX_CARDS ? candidates(req).find(free) : undefined;
    if (!spot) {
      result.set(req.key, { key: req.key, at: null, joint: null });
      continue;
    }
    placed.push(spot);
    result.set(req.key, { key: req.key, at: [spot.x0, spot.y0], joint: nearestCorner(spot, req.ax, req.ay) });
  }
  return requests.map((r) => result.get(r.key) ?? { key: r.key, at: null, joint: null });
}
