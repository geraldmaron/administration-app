import { createElement, type ReactElement, type ReactNode } from "react";
import type { MetricStance } from "@admin/player-core";
import type { GaugeTone } from "@admin/ui-web";

/** Whether a reading is in the President's favor, as the shared cue scale draws it. */
export type Valence = "good" | "watch" | "bad" | "neutral";

const FROM_STANCE: Readonly<Record<MetricStance, Valence>> = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad" };

/** A reading with no stance is plain data, which is neutral rather than an error. */
export function valenceOf(stance: MetricStance | undefined): Valence {
  return stance === undefined ? "neutral" : FROM_STANCE[stance];
}

/** The reading tone for a stance: a neutral stance stays plain data rather than borrowing a color. */
export function toneOf(stance: MetricStance | undefined): GaugeTone {
  const valence = valenceOf(stance);
  return valence === "neutral" ? "reading" : valence;
}

/** A reading's move as the President feels it: every national reading is better higher, so a rise is good and a fall bad. */
export function moveValence(delta: number): "good" | "bad" | "neutral" {
  return delta > 0 ? "good" : delta < 0 ? "bad" : "neutral";
}

/** The move's sign as a glyph, so the ink is never the only cue. */
export function moveGlyph(delta: number): string {
  return delta > 0 ? "▲" : delta < 0 ? "▼" : "▬";
}

/** A move's words in the ink of whether it helped, with its sign. */
export function MoveText({ delta, valence, children }: { readonly delta: number; readonly valence?: Valence; readonly children: ReactNode }): ReactElement {
  return createElement("span", { className: "ui-valence-ink", "data-valence": valence ?? moveValence(delta) }, `${moveGlyph(delta)}\u00a0`, children);
}
