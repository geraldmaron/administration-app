// Chart arithmetic shared by every drawn reading: round-number axes, end
// labels that do not collide, and values laid into a box. Pure functions, so
// the same scale is tested once and drawn the same on every platform.

/** A step of 1, 2, 2.5 or 5 times a power of ten that spans `range` in about `target` intervals. */
export function niceStep(range: number, target: number): number {
  const raw = (range > 0 ? range : 1) / Math.max(1, target);
  const power = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].map((multiple) => multiple * power).find((step) => step >= raw - 1e-12) ?? 10 * power);
}

const clean = (value: number): number => Math.round(value * 1e9) / 1e9 + 0;

/** Round-number ticks that cover [low, high], so the first and last sit at or beyond the data. */
export function niceTicks(low: number, high: number, target = 4): readonly number[] {
  const step = niceStep(high - low, target);
  const first = Math.floor(low / step + 1e-9) * step;
  const ticks: number[] = [];
  for (let tick = first; tick < high + step - 1e-9; tick += step) ticks.push(clean(tick));
  if (ticks.length < 2) ticks.push(clean(first + step));
  return ticks;
}

/** Round-number ticks inside [low, high] for the shared horizontal axis, endpoints included where they are round. */
export function axisTicks(low: number, high: number, target = 5): readonly number[] {
  if (high <= low) return [low];
  const step = Math.max(1, niceStep(high - low, target));
  const ticks: number[] = [];
  for (let tick = Math.ceil(low / step - 1e-9) * step; tick <= high + 1e-9; tick += step) ticks.push(clean(tick));
  return ticks;
}

/** The index in a sorted list of positions that is nearest `value`. */
export function nearestIndex(positions: readonly number[], value: number): number {
  let best = 0;
  for (let index = 1; index < positions.length; index++) {
    if (Math.abs(positions[index]! - value) < Math.abs(positions[best]! - value)) best = index;
  }
  return best;
}

export type LabelSlot = { readonly id: string; readonly y: number; readonly height: number };

/**
 * Labels in one column moved apart vertically so none overlaps, each as close
 * to its own line as the others allow: pushed down past the one above, then
 * back up from the floor if the column ran over it. Undefined when the column
 * is too short to hold them all, so the caller can say them another way
 * rather than overlap or drop one.
 */
export function stackLabels(slots: readonly LabelSlot[], gap: number, top: number, bottom: number): ReadonlyMap<string, number> | undefined {
  const ordered = [...slots].sort((a, b) => a.y - b.y);
  const room = ordered.reduce((sum, slot) => sum + slot.height, 0) + gap * Math.max(0, ordered.length - 1);
  if (room > bottom - top) return undefined;
  const tops = ordered.map((slot) => Math.min(bottom - slot.height, Math.max(top, slot.y - slot.height / 2)));
  for (let i = 1; i < tops.length; i++) tops[i] = Math.max(tops[i]!, tops[i - 1]! + ordered[i - 1]!.height + gap);
  const last = tops.length - 1;
  if (last >= 0 && tops[last]! + ordered[last]!.height > bottom) tops[last] = bottom - ordered[last]!.height;
  for (let i = last - 1; i >= 0; i--) tops[i] = Math.min(tops[i]!, tops[i + 1]! - ordered[i]!.height - gap);
  return new Map(ordered.map((slot, i) => [slot.id, tops[i]! + slot.height / 2]));
}

export type TickLabel = { readonly id: string; readonly at: number; readonly width: number };
export type PlacedTick = { readonly id: string; readonly left: number; readonly row: number; readonly side: "start" | "end" };

/**
 * Where each tick's name sits under a track `width` wide, its edge on the
 * tick: starting there and running right, or ending there and running left
 * when the right edge is too close. A name that would touch one already in a
 * row drops to the next row, so names stack instead of overlapping. Undefined
 * when some name fits on neither side of its tick, so the caller lists the
 * names instead of setting one where it would point at the wrong tick.
 */
export function tickLabelRows(ticks: readonly TickLabel[], width: number, gap = 12): readonly PlacedTick[] | undefined {
  const rows: { left: number; right: number }[][] = [];
  const placed: PlacedTick[] = [];
  for (const tick of [...ticks].sort((a, b) => a.at - b.at)) {
    const x = Math.max(0, Math.min(1, tick.at)) * width;
    const side = x + tick.width <= width ? "start" : x - tick.width >= 0 ? "end" : undefined;
    if (!side) return undefined;
    const left = side === "start" ? x - 1 : x - tick.width + 1;
    const box = { left, right: left + tick.width };
    let row = rows.findIndex((taken) => taken.every((t) => box.right + gap <= t.left || t.right + gap <= box.left));
    if (row < 0) row = rows.push([]) - 1;
    rows[row]!.push(box);
    placed.push({ id: tick.id, left, row, side });
  }
  return placed;
}

/**
 * The marks worth drawing on a short track: every gate, because the rules act
 * on it, and the nearest mark at or below the reading and the nearest above
 * it, the two it sits between. A longer list on a track a few hundred pixels
 * wide is ticks nobody can tell apart.
 */
export function nearestMarks<T extends { readonly at: number; readonly kind: string }>(marks: readonly T[], value: number): readonly T[] {
  if (marks.length <= 2) return marks;
  const below = marks.filter((mark) => mark.kind !== "gate" && mark.at <= value).sort((a, b) => b.at - a.at)[0];
  const above = marks.filter((mark) => mark.kind !== "gate" && mark.at > value).sort((a, b) => a.at - b.at)[0];
  return marks.filter((mark) => mark.kind === "gate" || mark === below || mark === above);
}

export type PlotPoint = readonly [number, number];

/** The values' own range, padded, so a small move is still seen. */
export function fitDomain(values: readonly number[]): readonly [number, number] {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [0, 1];
  const low = Math.min(...finite);
  const high = Math.max(...finite);
  const pad = Math.max((high - low) * 0.15, Math.abs(high) * 0.02, 1e-6);
  return [low - pad, high + pad];
}

/** Values, oldest first, as points across a `width` by `height` box inset by `pad`. */
export function plotValues(values: readonly number[], domain: readonly [number, number], width: number, height: number, pad: number): readonly PlotPoint[] {
  const [low, high] = domain;
  const span = high - low || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => [pad + i * step, height - pad - ((Math.min(high, Math.max(low, v)) - low) / span) * (height - pad * 2)] as const);
}

export const linePath = (pts: readonly PlotPoint[]): string => pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

/** A conservative width for text drawn at `fontSize`, since the drawing layer has no measuring call: wide enough that a label kept by this estimate never touches its neighbor. */
export function textWidth(text: string, fontSize: number, bold = false): number {
  return text.length * fontSize * (bold ? 0.62 : 0.58);
}

export type XLabel = { readonly index: number; readonly x: number };

/**
 * Which axis labels to draw and where their centers sit. The last and first
 * are claimed first, then the rest by repeated halving so the kept ones are
 * evenly spread; any label that would touch an earlier one is dropped, and a
 * kept one is shifted so it stays inside [minX, maxX].
 */
export function fitXLabels(widths: readonly number[], positions: readonly number[], minX: number, maxX: number, gap = 8): readonly XLabel[] {
  const count = widths.length;
  if (count === 0) return [];
  const order: number[] = [count - 1];
  if (count > 1) order.push(0);
  const queue: (readonly [number, number])[] = [[0, count - 1]];
  while (queue.length) {
    const [a, b] = queue.shift()!;
    if (b - a < 2) continue;
    const mid = Math.floor((a + b) / 2);
    order.push(mid);
    queue.push([a, mid], [mid, b]);
  }
  const kept: { index: number; x: number; w: number }[] = [];
  for (const index of order) {
    const w = widths[index]!;
    const x = Math.min(maxX - w / 2, Math.max(minX + w / 2, positions[index]!));
    if (kept.every((k) => Math.abs(k.x - x) >= (k.w + w) / 2 + gap)) kept.push({ index, x, w });
  }
  return kept.sort((a, b) => a.index - b.index).map(({ index, x }) => ({ index, x }));
}
