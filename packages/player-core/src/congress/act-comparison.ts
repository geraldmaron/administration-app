import type { EffectPacket } from "@admin/engine";
import type { MetricStance } from "../format/figures.js";
import type { ChoiceOutcome } from "../choice/choice-outcome.js";

// The shape the Washington rooms compare an act in: one column per option,
// read across the same rows, each line its change from today. There is no
// column for doing nothing (DECISIONS §8.13); a wait with its own consequence
// is the comparison's `waiting` line. Each column
// carries the engine's own refusal where the act is not open today, and each
// line is built from the same call the commit makes, so the price on the
// matrix is the price charged.

/**
 * The one number a cell is said from, where the producer holds it, so a screen
 * can draw it instead of reading the lines. `share` and `scale` are 0..1; a
 * `signed` value is a change in the same units as its subject; an `amount`
 * names its unit (money in USD millions). `from` is where it stood before the
 * act, for a figure that moves.
 */
export type ActFigure = {
  readonly kind: "share" | "amount" | "scale" | "signed";
  readonly value: number;
  readonly from?: number;
  readonly unit?: string;
  readonly stance?: MetricStance;
};

export type ActCell = {
  readonly lines: readonly string[];
  readonly stance?: MetricStance;
  readonly figure?: ActFigure;
};

export type ActColumn = {
  readonly id: string;
  readonly label: string;
  /** The one named verb that authorizes this option. */
  readonly verb: string;
  /** The engine's reason this option cannot be authorized today. */
  readonly refusal?: string;
  /** One line of what authorizing it will do, for the review above the verb. */
  readonly review: string;
  readonly cells: Readonly<Record<string, ActCell>>;
  /** The option drawn as one row of the results list, where the producer holds its numbers. */
  readonly outcome?: ChoiceOutcome;
};

export type ActRow = { readonly key: string; readonly label: string };

export type ActComparison = {
  readonly rows: readonly ActRow[];
  readonly columns: readonly ActColumn[];
  /** What happens on its own if nothing is approved, where that has a clock. */
  readonly waiting?: string;
};

export const actCell = (lines: string | readonly string[], stance?: MetricStance, figure?: ActFigure): ActCell => ({
  lines: typeof lines === "string" ? [lines] : lines,
  ...(stance ? { stance } : {}),
  ...(figure ? { figure } : {}),
});

/** What a packet sets Congress's disposition to, where it writes one. */
export function congressAfter(packet: EffectPacket): number | undefined {
  for (const effect of packet.effects) if (effect.kind === "congress") return effect.set.disposition;
  return undefined;
}

/** "From 56% to 59%", or "No change", for the room's disposition. */
export function dispositionMove(before: number, after: number | undefined): ActCell {
  if (after === undefined || Math.round(after * 100) === Math.round(before * 100)) return actCell("No change", undefined, { kind: "share", value: before, from: before });
  const up = after > before;
  const stance = up ? "favorable" : "caution";
  return actCell(`${up ? "Warms" : "Cools"} from ${Math.round(before * 100)}% to ${Math.round(after * 100)}%`, stance, { kind: "share", value: after, from: before, stance });
}
