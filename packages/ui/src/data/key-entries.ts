import type { Urgency } from "../calendar/types";
import type { InkRole } from "../icons/Icon";

/**
 * The vocabulary every drawn reading keys itself in. An entry is one encoding
 * a reader has to decode (a fill, a line, a dash, a dot, a tick, a ring, a
 * shape), its ink and the words for it, so the key under a chart is drawn
 * from the same table the chart is.
 */
export type KeyKind = "swatch" | "line" | "dash" | "dot" | "tick" | "ring" | "shape";
export type KeyShape = "square" | "circle" | "diamond" | "triangleUp" | "triangleDown";

/** A theme role, or an exact color for a mark whose color is computed (a lens ramp, a categorical series). */
export type KeyInk = InkRole | { readonly color: string };

export type KeyEntry = {
  readonly id: string;
  readonly kind: KeyKind;
  readonly label: string;
  readonly ink: KeyInk;
  /** A count or a figure printed beside the words. */
  readonly figure?: string | number;
  /** Drawn as an outline: a nay, a seat no record fills, a date already passed. */
  readonly hollow?: boolean;
  /** Stroke dash for a line, dash or tick ("6 3"). A `dash` entry without one gets the standard dash. */
  readonly dash?: string;
  /** Stroke width for a line, dash or tick. */
  readonly weight?: number;
  readonly shape?: KeyShape;
  /** A see-through band behind the line: a range, not a single value. */
  readonly band?: boolean;
  /** Drawn faint, the way the chart draws a mark with no reading. */
  readonly faint?: boolean;
};

export const STANDARD_DASH = "4 3";

/**
 * The kinds of reference line, each drawn its own way everywhere so a reader
 * can tell a landmark from a rule without color: a landmark thin solid gold, a
 * target heavier solid green, a gate red dashes, a danger level red dots, the
 * term's own record neutral. `tick` is the width of the same mark drawn
 * across a track rather than along a chart.
 */
export type MarkKind = "historical" | "gate" | "target" | "danger" | "record";

export const MARK_STYLE: Readonly<Record<MarkKind, { readonly ink: "gold" | "danger" | "successInk" | "colorSecondary"; readonly width: number; readonly tick: number; readonly dash?: string; readonly word: string }>> = {
  historical: { ink: "gold", width: 1.25, tick: 2, word: "From the historical record" },
  target: { ink: "successInk", width: 2, tick: 3, word: "A goal to reach" },
  gate: { ink: "danger", width: 1.5, tick: 2, dash: "6 3", word: "A line where the rules act" },
  danger: { ink: "danger", width: 1.5, tick: 2, dash: "2 3", word: "A danger level" },
  record: { ink: "colorSecondary", width: 1.5, tick: 2, word: "Your own term so far" },
};

const MARK_ORDER: readonly MarkKind[] = ["record", "historical", "target", "gate", "danger"];

/** One tick entry per kind of mark a track draws, in a fixed order, so the key never lists a kind the track does not show. */
export function markKeyEntries(marks: readonly { readonly kind: MarkKind }[], drawn: "tick" | "line" = "tick"): readonly KeyEntry[] {
  const kinds = new Set(marks.map((mark) => mark.kind));
  return MARK_ORDER.filter((kind) => kinds.has(kind)).map((kind) => {
    const style = MARK_STYLE[kind];
    return { id: `mark:${kind}`, kind: drawn, label: style.word, ink: style.ink, weight: drawn === "tick" ? style.tick : style.width, ...(style.dash ? { dash: style.dash } : {}) };
  });
}

/** Parts of a whole as filled swatches, each with its count. */
export function swatchEntries(parts: readonly { readonly key: string; readonly label: string; readonly ink: KeyInk; readonly figure?: string | number }[]): readonly KeyEntry[] {
  return parts.map((part) => ({ id: part.key, kind: "swatch", label: part.label, ink: part.ink, ...(part.figure !== undefined ? { figure: part.figure } : {}) }));
}

export type Direction = "up" | "down" | "flat";

/**
 * Which way a path moved over the stretch that counts: from the first point
 * after `splitAt` (the administration's own) to the last. A move under 2% of
 * the drawn range reads as flat, so noise never gets an arrow.
 */
export function pathDirection(values: readonly number[], splitAt = 0): Direction {
  const own = values.slice(Math.max(0, splitAt - 1));
  if (own.length < 2) return "flat";
  const first = own[0]!;
  const last = own[own.length - 1]!;
  const range = Math.max(...values) - Math.min(...values);
  if (range === 0 || Math.abs(last - first) < range * 0.02) return "flat";
  return last > first ? "up" : "down";
}

/** The key for a sparkline: its own line, the inherited stretch when one is drawn, and the end arrow. */
export function sparklineKeyEntries({ ink, inherited, own = "Your term", before = "Before you took office" }: { readonly ink: InkRole; readonly inherited: boolean; readonly own?: string; readonly before?: string }): readonly KeyEntry[] {
  return [
    { id: "own", kind: "line", label: own, ink, weight: 2 },
    ...(inherited ? [{ id: "before", kind: "dash" as const, label: before, ink: "colorTertiary" as const, weight: 1.5, dash: "3 3" }] : []),
    { id: "arrow", kind: "shape", shape: "triangleUp", label: "Arrow: which way it moved", ink },
  ];
}

/** A dated matter's urgency as a shape and an ink, never the ink alone. The words match the agenda's badges. */
export const URGENCY_KEY: Readonly<Record<Urgency, KeyEntry>> = {
  hard: { id: "hard", kind: "shape", shape: "square", label: "Stops time", ink: "danger" },
  soft: { id: "soft", kind: "dot", label: "Needs you", ink: "warningInk" },
  ambient: { id: "ambient", kind: "ring", label: "On the calendar", ink: "accent" },
};

/** The term track's key: how far the term has run, and a milestone still ahead (filled) or already passed (hollow). */
export const TERM_KEY: readonly KeyEntry[] = [
  { id: "run", kind: "swatch", label: "The term so far", ink: "goldRule" },
  { id: "ahead", kind: "dot", label: "Still ahead", ink: "accent" },
  { id: "passed", kind: "ring", label: "Already passed", ink: "colorTertiary" },
];
