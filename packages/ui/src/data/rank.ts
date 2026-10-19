/** A row's place in one column: 1 is best. Rows with no reading are unranked. */
export type Ranked = { readonly rank: number; readonly of: number; readonly percentile: number };

/**
 * Ranks every row in one column by which direction is better. Ties share the
 * better rank; the percentile is the share of ranked rows this one beats or
 * equals, so the best is 1 and a lone row is 1.
 */
export function rankColumn(values: readonly (number | null | undefined)[], better: "up" | "down"): readonly (Ranked | undefined)[] {
  const present = values.flatMap((value, index) => (value === null || value === undefined || !Number.isFinite(value) ? [] : [{ value, index }]));
  const sorted = [...present].sort((a, b) => (better === "up" ? b.value - a.value : a.value - b.value));
  const out: (Ranked | undefined)[] = values.map(() => undefined);
  sorted.forEach((entry, position) => {
    const first = sorted.findIndex((other) => other.value === entry.value);
    const rank = (first === -1 ? position : first) + 1;
    const beaten = sorted.length - rank;
    out[entry.index] = { rank, of: sorted.length, percentile: sorted.length <= 1 ? 1 : (beaten + 1) / sorted.length };
  });
  return out;
}

const SUFFIX: Readonly<Record<number, string>> = { 1: "st", 2: "nd", 3: "rd" };

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th, 21st. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? "th" : (SUFFIX[n % 10] ?? "th")}`;
}
