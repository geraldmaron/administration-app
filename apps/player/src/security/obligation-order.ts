import type { WarPowersRow } from "@admin/player-core";

/** Whether the row's clock has run out or its report is overdue. */
export const isOverdue = (row: WarPowersRow): boolean => row.missed || (row.clock !== undefined && row.clock.left < 0);

/** Most pressing first: overdue, then the fewest days left on a clock, then the rows that run no clock. */
export function byUrgency(rows: readonly WarPowersRow[]): readonly WarPowersRow[] {
  const rank = (row: WarPowersRow): number => (isOverdue(row) ? Number.NEGATIVE_INFINITY : (row.clock?.left ?? Number.POSITIVE_INFINITY));
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.target.localeCompare(b.target));
}
