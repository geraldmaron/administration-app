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

export type LabelSlot = { readonly id: string; readonly x: number; readonly y: number };

/** End-of-line labels moved apart vertically so no two that sit near each other in x overlap; each stays as close to its line as the others allow. */
export function spreadLabels(slots: readonly LabelSlot[], gap: number, near: number, top: number, bottom: number): ReadonlyMap<string, number> {
  const placed = new Map<string, number>();
  const ordered = [...slots].sort((a, b) => a.y - b.y);
  const kept: { slot: LabelSlot; y: number }[] = [];
  for (const slot of ordered) {
    let y = Math.min(bottom, Math.max(top, slot.y));
    for (const other of kept) {
      if (Math.abs(other.slot.x - slot.x) < near && y - other.y < gap) y = other.y + gap;
    }
    kept.push({ slot, y: Math.min(bottom, y) });
  }
  for (const entry of kept) placed.set(entry.slot.id, entry.y);
  return placed;
}
