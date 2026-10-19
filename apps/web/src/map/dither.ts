/**
 * Proportional dither: a region with a mixed value shows its dots in the same
 * proportion. A 28-of-52 House delegation is a 54/46 mix, a split Senate pair
 * is 1:1.
 *
 * The dots are ranked by their stable lattice hash and the first share of the
 * ranking takes the first color, so the mix is exact to one dot (largest
 * remainder over the weights) and never flickers: the same lattice point
 * keeps its color for as long as the lattice and the value hold.
 */
export function slotCounts(weights: readonly number[], dots: number): number[] {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (total <= 0 || dots <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (Math.max(0, w) / total) * dots);
  const counts = exact.map(Math.floor);
  const order = exact.map((value, slot) => ({ slot, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest || a.slot - b.slot);
  let left = dots - counts.reduce((sum, c) => sum + c, 0);
  for (const { slot } of order) {
    if (left <= 0) break;
    counts[slot] = (counts[slot] ?? 0) + 1;
    left--;
  }
  return counts;
}

/**
 * Assigns a slot to each dot of one region. `keys` are the dots' lattice
 * hashes; the result is the slot index per dot, in the input order.
 */
export function assignDither(keys: readonly number[], weights: readonly number[]): Uint8Array {
  const counts = slotCounts(weights, keys.length);
  const order = keys.map((key, index) => ({ key, index })).sort((a, b) => a.key - b.key || a.index - b.index);
  const slots = new Uint8Array(keys.length);
  let slot = 0;
  let used = 0;
  for (const { index } of order) {
    while (slot < counts.length - 1 && used >= (counts[slot] ?? 0)) {
      slot++;
      used = 0;
    }
    slots[index] = slot;
    used++;
  }
  return slots;
}
