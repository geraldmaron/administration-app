import { formatMoney, type FormatKind } from "@admin/player-core";

/**
 * A comparison value in its reading's own words. Shares and scores are whole
 * points out of 100; rates keep a tenth because they move in tenths; money is
 * the player's one money format.
 */
export function formatCompare(kind: FormatKind, value: number): string {
  switch (kind) {
    case "share":
      return `${Math.round(value * 100)}%`;
    case "index":
      return `${Math.round(value * 100)}`;
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "usd-millions":
      return formatMoney(value);
  }
}

/** The formatter a chart or a matrix column takes. */
export const formatterFor =
  (kind: FormatKind): ((value: number) => string) =>
  (value) =>
    formatCompare(kind, value);

/** The unit as a reader sees it once the figure is formatted: a 0-to-1 score is printed out of 100. */
export function unitWords(kind: FormatKind, unit: string): string {
  return kind === "index" ? "score out of 100" : unit;
}
