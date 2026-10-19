import type { LensRow } from "./lenses/contract";

/**
 * How far each region's value sits from the middle of the lens's ranking, 0 at
 * the median and 1 at either end, by position rather than by value so one
 * outlier does not flatten everyone else. Tied ranks share their average
 * position, so a category is salient or not as a whole.
 */
export function rankSalience(rows: readonly LensRow[]): ReadonlyMap<string, number> {
  const ordered = [...rows].sort((a, b) => b.rank - a.rank);
  const last = ordered.length - 1;
  if (last <= 0) return new Map(ordered.map((row) => [row.ref, 0]));
  const result = new Map<string, number>();
  let start = 0;
  while (start <= last) {
    let end = start;
    while (end < last && ordered[end + 1]?.rank === ordered[start]?.rank) end += 1;
    const position = (start + end) / 2 / last;
    for (let index = start; index <= end; index += 1) {
      const row = ordered[index];
      if (row) result.set(row.ref, Math.abs(position - 0.5) * 2);
    }
    start = end + 1;
  }
  return result;
}
