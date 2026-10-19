import type { GameDate } from "@admin/engine";
import type { FormatKind } from "@admin/player-core";

// The term drawn as lines and columns: approval across the kept history with
// the predecessor's quarter split off as its own line, and the Record's
// entries counted by month, the administration's against the world's.

export type TermCourse = {
  readonly x: readonly string[];
  /** The predecessor's weeks, null from the oath on. */
  readonly inherited: readonly (number | null)[];
  /** This administration's weeks, null before the oath; the oath week is on both so the lines join. */
  readonly own: readonly (number | null)[];
  readonly inheritedWeeks: number;
};

/**
 * One reading across the kept history, split at the oath. `inherited(i)` is
 * player-core's `isInheritedRow`, the one predicate for which rows are the
 * predecessor's; `lastWeek` is the week number of the newest row.
 */
export function termCourse(values: readonly number[], inherited: (index: number) => boolean, lastWeek: number): TermCourse {
  const count = values.filter((_, i) => inherited(i)).length;
  const x = values.map((_, i) => {
    const week = lastWeek - (values.length - 1 - i);
    return inherited(i) ? `${count - i}w before` : `W${week}`;
  });
  return {
    x,
    inherited: values.map((value, i) => (inherited(i) || i === count ? value : null)),
    own: values.map((value, i) => (inherited(i) ? null : value)),
    inheritedWeeks: count,
  };
}

export type MonthActivity = { readonly key: string; readonly label: string; readonly player: number; readonly world: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Entries per month, oldest first, every month between the first and the last kept even when empty. */
export function monthlyActivity(rows: readonly { readonly date: GameDate; readonly actor: string }[]): readonly MonthActivity[] {
  if (rows.length === 0) return [];
  const index = (date: GameDate) => date.year * 12 + (date.month - 1);
  const counts = new Map<number, { player: number; world: number }>();
  for (const row of rows) {
    const at = index(row.date);
    const tally = counts.get(at) ?? { player: 0, world: 0 };
    counts.set(at, row.actor === "player" ? { ...tally, player: tally.player + 1 } : { ...tally, world: tally.world + 1 });
  }
  const first = Math.min(...counts.keys());
  const last = Math.max(...counts.keys());
  return Array.from({ length: last - first + 1 }, (_, offset) => {
    const at = first + offset;
    const tally = counts.get(at) ?? { player: 0, world: 0 };
    const year = Math.floor(at / 12);
    return { key: String(at), label: `${MONTHS[at % 12]} ${String(year).slice(2)}`, ...tally };
  });
}

const DAY = 86_400_000;
const dayOf = (date: GameDate): number => Math.floor(Date.UTC(date.year, date.month - 1, date.day) / DAY);
/** Up to this many weeks the term reads week by week; past it, month by month. */
const WEEKLY_UP_TO = 26;

/** Entries per week from the first kept entry, oldest first, labeled by each week's first day. */
export function weeklyActivity(rows: readonly { readonly date: GameDate; readonly actor: string }[]): readonly MonthActivity[] {
  if (rows.length === 0) return [];
  const first = Math.min(...rows.map((row) => dayOf(row.date)));
  const counts = new Map<number, { player: number; world: number }>();
  for (const row of rows) {
    const week = Math.floor((dayOf(row.date) - first) / 7);
    const tally = counts.get(week) ?? { player: 0, world: 0 };
    counts.set(week, row.actor === "player" ? { ...tally, player: tally.player + 1 } : { ...tally, world: tally.world + 1 });
  }
  return Array.from({ length: Math.max(...counts.keys()) + 1 }, (_, week) => {
    const start = new Date((first + week * 7) * DAY);
    return { key: `w${week}`, label: `${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}`, ...(counts.get(week) ?? { player: 0, world: 0 }) };
  });
}

/** The term's pace at the grain its length reads best at: weeks for a young term, months after. */
export function termActivity(rows: readonly { readonly date: GameDate; readonly actor: string }[]): { readonly grain: "week" | "month"; readonly columns: readonly MonthActivity[] } {
  const weekly = weeklyActivity(rows);
  return weekly.length <= WEEKLY_UP_TO ? { grain: "week", columns: weekly } : { grain: "month", columns: monthlyActivity(rows) };
}

/** A reading in its own unit: a share or an index as a percent, money in the dataset's millions. */
export function formatReading(format: FormatKind, value: number): string {
  if (format === "usd-millions") {
    const size = Math.abs(value);
    const text = size >= 1_000_000 ? `$${(size / 1_000_000).toFixed(1)}T` : size >= 1000 ? `$${(size / 1000).toFixed(1)}B` : `$${Math.round(size)}M`;
    return value < 0 ? `−${text}` : text;
  }
  const decimals = format === "percent" ? 1 : 0;
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Signed rates retain their negative observations; positions on a bar are 0..1. */
export function legacyDomain(values: readonly number[], full = false): readonly [number, number] {
  if (full) return [0, 100];
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const padding = Math.max(1, (high - low) * 0.2);
  return [low < 0 ? low - padding : 0, high + padding];
}

export function legacyPosition(value: number, domain: readonly [number, number]): number {
  return Math.min(1, Math.max(0, (value - domain[0]) / (domain[1] - domain[0])));
}
