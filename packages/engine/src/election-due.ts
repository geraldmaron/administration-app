/**
 * Whether a foreign selection falls in this calendar month.
 *
 * Month-precision rows are due on every day of that month. The table does
 * not name a day, and this module does not invent one. An exact date is due
 * on that day only. Estimated rows and conflict rows are not selections.
 * Nothing here changes who governs.
 */
import { ELECTION_CALENDAR, scheduledSelection } from "@admin/world";
import type { GameDate } from "./state.js";

export function selectionDue(date: GameDate, nationId: string): boolean {
  const when = scheduledSelection(nationId)?.when;
  if (!when || when.year !== date.year || when.month !== date.month) return false;
  return when.day === undefined || when.day === date.day;
}

/** The first scheduled nation, in calendar order, whose selection is due. */
export function selectionDueNation(date: GameDate): string | null {
  for (const row of ELECTION_CALENDAR) {
    if (selectionDue(date, row.nationId)) return row.nationId;
  }
  return null;
}
