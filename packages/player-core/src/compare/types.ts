import type { NationId, StateId } from "@admin/world";

/** Who or what a reading is taken of. */
export type Subject =
  | { readonly kind: "self" }
  | { readonly kind: "self-at"; readonly turn: number }
  | { readonly kind: "nation"; readonly id: NationId }
  | { readonly kind: "state"; readonly id: StateId }
  | { readonly kind: "history"; readonly benchmarkId: string };

export type CompareSubjectKind = Subject["kind"];

/**
 * How a value is written. The engine's own scales throughout: `share` and
 * `percent` are fractions (0.42 reads "42%"; `percent` keeps a decimal because
 * rates move in tenths), `index` is a 0..1 score, `usd-millions` is money in the
 * dataset's unit.
 */
export type FormatKind = "share" | "percent" | "index" | "usd-millions";

export type Better = "up" | "down";

/** Matches the chart's benchmark kinds, so a screen hands these over unchanged. */
export type CompareBenchmarkKind = "historical" | "gate" | "target" | "danger";

export type CompareBenchmark = {
  readonly id: string;
  readonly label: string;
  readonly value?: number;
  readonly band?: readonly [number, number];
  readonly kind: CompareBenchmarkKind;
  /** Where the figure comes from or what reads it, one sentence. */
  readonly note?: string;
};

/** A dated reading on a recorded course. */
export type CoursePoint = { readonly turn: number; readonly value: number };

/** A reading, or why there is none. Never a stand-in figure. */
export type Reading =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: string };

/** A window of weeks ending this week, or the whole term from the oath. */
export type CompareWindow = number | "term";
