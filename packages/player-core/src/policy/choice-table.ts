import type { AlignmentVector, MetricSet } from "@admin/engine";
import { METRIC_LABELS, formatSignedPoints } from "../format/figures";
import { formatMoney } from "../format/money";

// The table a domestic act is compared in: every column read on the same rows,
// each a change from today. There is no column that does nothing (DECISIONS
// §8.13); a wait with its own consequence on a clock is the table's `waiting`
// line. The screen draws it; this file only
// decides what each cell says and whether it reads well or badly for the
// President, so a column is never judged by a color the screen guessed.

export type ChoiceTone = "favorable" | "adverse" | "neutral";

/**
 * One signed movement inside a cell, kept as a number beside its words so a
 * screen can draw it against the same movement in every other column.
 * Movements that share a label on a row are on the same scale.
 */
export type ChoiceMove = { readonly label?: string; readonly value: number; readonly text: string; readonly tone: ChoiceTone };

export type ChoiceCell = { readonly text: string; readonly tone: ChoiceTone; readonly moves?: readonly ChoiceMove[] };

export type ChoiceColumn = {
  readonly id: string;
  readonly label: string;
  /** Why it cannot be authorized today, in the engine's words. */
  readonly locked?: string;
};

export type ChoiceRow = {
  readonly id: string;
  readonly label: string;
  /** `lead` is what the column is, in its own words: read before any reading. */
  readonly kind?: "lead";
  /** One cell per column, in column order. */
  readonly cells: readonly ChoiceCell[];
};

export type ChoiceTable = {
  readonly columns: readonly ChoiceColumn[];
  readonly rows: readonly ChoiceRow[];
  /** What happens on its own if nothing is approved, where that has a clock: said beside the options, never as one. */
  readonly waiting?: string;
};

export const cell = (text: string, tone: ChoiceTone = "neutral", moves?: readonly ChoiceMove[]): ChoiceCell => (moves && moves.length > 0 ? { text, tone, moves } : { text, tone });

/** Every player metric is better higher, money included. */
function metricTone(delta: number): ChoiceTone {
  if (delta === 0) return "neutral";
  return delta > 0 ? "favorable" : "adverse";
}

function metricMove(key: keyof MetricSet, delta: number): ChoiceMove {
  if (key === "treasury") return { label: "Treasury", value: delta, text: `${delta < 0 ? "−" : "+"}${formatMoney(Math.abs(delta))}`, tone: metricTone(delta) };
  return { label: METRIC_LABELS[key], value: delta, text: `${formatSignedPoints(delta)} pts`, tone: metricTone(delta) };
}

function metricPhrase(key: keyof MetricSet, delta: number): string {
  if (key === "treasury") return delta < 0 ? `${formatMoney(-delta)} spent` : `${formatMoney(delta)} raised`;
  return `${METRIC_LABELS[key]} ${formatSignedPoints(delta)} pts`;
}

/**
 * A set of metric movements as one cell: each movement in words, the cell's
 * tone the sign of the heaviest one. `none` is what an empty set reads, so a
 * column with nothing to say on a row says so rather than leaving a blank.
 */
export function metricCell(deltas: Partial<MetricSet>, none: string): ChoiceCell {
  const moved = (Object.entries(deltas) as [keyof MetricSet, number][]).filter(([, delta]) => delta !== undefined && delta !== 0);
  if (moved.length === 0) return cell(none);
  const words = moved.map(([key, delta]) => metricPhrase(key, delta)).join("; ");
  const negatives = moved.filter(([, delta]) => delta < 0).length;
  const tone = negatives === moved.length ? "adverse" : negatives === 0 ? "favorable" : metricTone(moved[0]![1]);
  return cell(words, tone, moved.map(([key, delta]) => metricMove(key, delta)));
}

const AXIS_WORDS: Readonly<Record<keyof AlignmentVector, readonly [string, string]>> = {
  economicLeftRight: ["left on the economy", "right on the economy"],
  authLibertarian: ["toward personal liberty", "toward state authority"],
  nationalistGlobalist: ["toward the world", "toward the nation first"],
};

/** Below this an alignment pull is a rounding, not a reputation. */
const ALIGNMENT_FLOOR = 0.01;
/** At or past this, the pull is one the press will name. */
const ALIGNMENT_SHARP = 0.2;

/**
 * Where an act moves the President's politics, in the words a voter would use.
 * The engine's axes run negative to positive as left, libertarian and globalist
 * to right, authoritarian and nationalist.
 */
export function alignmentShiftWords(pull: Partial<AlignmentVector>): string {
  const moves = (Object.entries(pull) as [keyof AlignmentVector, number][])
    .filter(([, value]) => Math.abs(value) >= ALIGNMENT_FLOOR)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([axis, value]) => `${Math.abs(value) >= ALIGNMENT_SHARP ? "sharply " : ""}${AXIS_WORDS[axis][value < 0 ? 0 : 1]}`);
  if (moves.length === 0) return "No change to where you stand";
  return `Pulls you ${moves.join(", and ")}`;
}

const AXIS_NAMES: Readonly<Record<keyof AlignmentVector, string>> = {
  economicLeftRight: "On the economy",
  authLibertarian: "Liberty or authority",
  nationalistGlobalist: "World or nation first",
};

const AXIS_ENDS: Readonly<Record<keyof AlignmentVector, readonly [string, string]>> = {
  economicLeftRight: ["left", "right"],
  authLibertarian: ["toward liberty", "toward authority"],
  nationalistGlobalist: ["toward the world", "toward the nation"],
};

/**
 * Where an act moves the President's politics as a cell: the words a voter
 * would use, and each pull as a movement whose side is the side it pulls to.
 * A lean is neither good nor bad, so every movement is neutral.
 */
export function alignmentCell(pull: Partial<AlignmentVector>): ChoiceCell {
  const moves = (Object.entries(pull) as [keyof AlignmentVector, number][])
    .filter(([, value]) => Math.abs(value) >= ALIGNMENT_FLOOR)
    .map(([axis, value]): ChoiceMove => ({ label: AXIS_NAMES[axis], value, text: `${Math.abs(value) >= ALIGNMENT_SHARP ? "Sharply " : ""}${AXIS_ENDS[axis][value < 0 ? 0 : 1]}`, tone: "neutral" }));
  return cell(alignmentShiftWords(pull), "neutral", moves);
}

/** A signed share of output as points: growth, inflation and jobs move in these. */
export function ratePoints(delta: number): string {
  return `${formatSignedPoints(delta)} pts`;
}

/** Weeks, said the way a calendar says them. */
export function weeksWords(weeks: number): string {
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}
