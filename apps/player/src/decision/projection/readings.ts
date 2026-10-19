import { formatMoney, formatRatio, type ModelingBand, type ModelingChoice, type ModelingDelta, type ModelingUnit, type ModelingView } from "@admin/player-core";

// The projection's readings as words and positions: pure, so a cell, a chart
// and a screen reader all say the same figure.

export type Valence = "good" | "bad" | "neutral";

export const formatFor = (unit: ModelingUnit) => (value: number): string => (unit === "money" ? formatMoney(value) : formatRatio(value));

/** A figure that printed as zero has no direction, whatever its sign underneath. */
const moved = (delta: ModelingDelta): boolean => /^[+−]/.test(delta.text);

/** Good or bad for the President, but only when every run agrees on the direction. */
export function deltaValence(delta: ModelingDelta): Valence {
  if (delta.agreement === "same" || delta.agreement === "mixed" || !moved(delta)) return "neutral";
  return (delta.agreement === "higher") === (delta.better === "higher") ? "good" : "bad";
}

export const glyph = (text: string): string => (text.startsWith("+") ? "▲" : text.startsWith("−") ? "▼" : "▬");

/** One symmetric axis for a set of moves, never narrower than a floor, so near-zero moves are not stretched into drama. */
export function axisOf(spreads: readonly ModelingBand[], unit: ModelingUnit): number {
  return Math.max(unit === "money" ? 1 : 0.005, ...spreads.flatMap((spread) => [Math.abs(spread.low), Math.abs(spread.high)]));
}

/** Where a value sits on a symmetric axis about zero, as a share 0..1, clipped at the ends. */
export function onAxis(value: number, scale: number): number {
  return 0.5 + (Math.max(-scale, Math.min(scale, value)) / scale) * 0.5;
}

export type CellScale = { readonly scale: number; readonly baselineId: string };

/** The shared scale every option's approval cell is drawn on, and which option is the comparison. */
export function cellScale(view: ModelingView, choice: ModelingChoice): CellScale {
  const baselineId = choice.alternatives.find((entry) => entry.baseline)?.id ?? "";
  const approvals = view.alternatives.flatMap((alternative) => (alternative.deltas[0] ? [alternative.deltas[0]] : []));
  return { scale: axisOf(approvals, "points"), baselineId };
}
