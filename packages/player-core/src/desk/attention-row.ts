import type { AttentionSource, AttentionUrgency, Campaign, GameDate } from "@admin/engine";
import type { MetricStance } from "../format/figures";
import type { SummonsKind } from "../summons/types";

/**
 * One row of "what needs the President", in the shape a surface draws it.
 *
 * The types live apart from the builders because both halves of the attention
 * layer produce them — the Desk's standing conditions and the summons layer's
 * statutory clocks — and a shared type in one producer's module would make the
 * other import its rival at runtime to describe its own output.
 */

/**
 * Where an attention row opens.
 *
 * A plain href rather than a hand-written union of the urls this list happens
 * to reach: every door comes from `place` or `subjectHref`, so spelling those
 * pathnames out here would be the same routes kept in a second place.
 * Consumers that need to know which door a row opens narrow the href
 * structurally.
 */
export type AttentionRoute = string;

/**
 * The clock a matter is running on, in the shape `ClockDial` draws it.
 *
 * Two variants and no third, because there are exactly two honest cases. A rule
 * that sets a window gives the ring a denominator — sixty days, the bench's own
 * return date — and the arc says how much of it is gone. A matter no rule puts
 * a clock on has an elapsed count and nothing to measure it against, and it is
 * drawn as a dashed ring rather than as a statutory one with a denominator this
 * app made up. An item with neither carries no clock at all; a dial with
 * nothing behind it is worse than no dial.
 */
export type AttentionClock =
  | {
      readonly kind: "statutory";
      readonly name: string;
      readonly window: number;
      readonly consumed: number;
      readonly unit: string;
      readonly unitPlural?: string;
      /** The rule that set the window, already capitalized. Omitted where the window is a schedule rather than a statute. */
      readonly statute?: string;
    }
  | {
      readonly kind: "elapsed";
      readonly name: string;
      readonly elapsed: number;
      readonly unit: string;
      readonly unitPlural?: string;
    };

export type AttentionItem = {
  readonly id: string;
  /**
   * Which of the engine's sources of presidential attention raised this.
   *
   * Every row used to be handed to the engine as an `agency-request`, which
   * made a war, a flood and an empty chair the same kind of demand at the one
   * seam where they are ranked against each other. It is declared per builder
   * because only the builder knows what raised it.
   */
  readonly source: AttentionSource;
  /**
   * Whether time may keep running past this row, in the engine's own three
   * words (`AttentionUrgency`).
   *
   * It is declared per builder rather than inferred from `stance` because the
   * two answer different questions. Stance is how badly a thing is going;
   * urgency is whether the presidency can continue without answering it. A
   * cabinet vacancy can be adverse and still wait a fortnight; a bill on the
   * desk becomes law by inaction whether or not anyone is worried about it.
   *
   * This is also what makes the chapter's promise true. NEEDS YOU tells the
   * player its rows are "worst first" and this list used to be ten builders
   * concatenated in source order with no sort anywhere, so the row a player
   * read as the worst thing happening to their presidency frequently was not.
   */
  readonly urgency: AttentionUrgency;
  /**
   * What the row is materially about. Two rows sharing a subject are the same
   * problem told twice, and the composer shows one of them.
   */
  readonly subject: string;
  readonly title: string;
  readonly reason: string;
  readonly href: AttentionRoute;
  readonly stance: MetricStance;
  readonly figure?: string;
  /** Visual mark for alert rows from the shared executive icon set. */
  readonly icon?: string;
  /** The matter's own clock, where the engine holds one. */
  readonly clock?: AttentionClock;
  /** The day it stops being deferrable, where a rule sets one. */
  readonly dueDate?: GameDate;
  /**
   * The institutional clock behind this row, where one is running.
   *
   * Carried so that the interruption sheet can open the clock's own folio off
   * the one composed stop. It survives a collapse: when a standing condition
   * and a statutory clock name the same subject, the row that is drawn keeps
   * the other's clock rather than losing the door to it.
   */
  readonly summons?: SummonsKind;
  /**
   * When the wait began, where the record keeps it. With `dueDate` it is what
   * lets a countdown say how much of the wait is gone, not only what is left.
   */
  readonly opened?: GameDate;
  /** Who the President is waiting on, in a few words ("Commerce", "the Senate"). */
  readonly waitingOn?: string;
  /**
   * Every page this row belongs on, as subject keys (`nation:CN`, `person:…`,
   * `treaty:…`). Wider than `subject`, which names the one problem for the
   * collapse: a steel investigation is one problem and belongs on the file of
   * every country that sells the United States steel.
   */
  readonly about?: readonly string[];
};

/**
 * Whether a turn-stamped record belongs to the week that just ran, so a
 * standing row can stop being loud the moment it stops being new.
 *
 * Beside the row shape rather than inside one builder's module, because the
 * Desk's standing conditions and the scandal and cabinet builders all need the
 * same answer, and a second copy of it would let two rows disagree about what
 * "new" means.
 *
 * A record written inside a tick's own phase carries the turn that was
 * closing when the phase ran (`state.turn`, read before `advanceTurn` rolls it
 * forward), so by the time the resulting campaign is read its `turn` field is
 * already one ahead. A record written by a direct action carries the turn
 * that is still current, no roll-forward involved. Both conventions are real
 * and live side by side in this engine, so a record reads as fresh under
 * either: this turn, or the one just before it.
 */
export function justHappened(campaign: Campaign, turn: number | undefined): boolean {
  if (turn === undefined) return false;
  const age = campaign.turn - turn;
  return age >= 0 && age <= 1;
}
