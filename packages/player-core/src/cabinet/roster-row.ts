import type { ActingAuthority, AppointmentClass, RemovalConstraint } from "@admin/engine";
import type { Person } from "@admin/world";
import { loyaltyWord, stanceForRatio, type MetricStance } from "../format/figures";

/**
 * What one chair's row in the cabinet roster says, as data rather than as a
 * render.
 *
 * A person is on this roster because the President can do something about them
 * or through them, so the row carries four things and nothing else: who they
 * are, where they stand with a figure on it, what they actually move, and the
 * lever. The roster retains every department so its status and management
 * path stay discoverable even when no current action is required.
 *
 * The row used to close on a sentence composed from the holder's competence,
 * which meant every inherited chair in a founding cabinet printed the same
 * words. Seventeen officers, one sentence, in the slot reserved for what each
 * of them is doing to the government. Every branch below names a figure the
 * engine computed for this seat and no other.
 */

/** How a chair breaks when the week goes against it. The engine picks exactly one per officer. */
export type SeatBreak = {
  readonly rate: number;
  /** The chance of at least one break before the term ends, at this week's rate. */
  readonly restOfTerm: number;
  readonly outcome: "leak" | "challenge" | "resignation";
};

/** The counsel this chair has given and how it was taken. Absent before they have been asked. */
export type SeatCounsel = {
  readonly contested: number;
  readonly right: number;
  readonly overruled: number;
};

export type SeatOfficeSummary = {
  readonly id: string;
  readonly name: string;
  readonly abbr: string;
  readonly commandLabel: string;
  readonly componentCount: number;
  readonly unledComponentCount: number;
  readonly activeOrderCount: number;
  readonly chairTitle?: string;
  readonly vacancyDays?: number;
};

export type Seat = {
  readonly role: string;
  readonly holder: Person | undefined;
  readonly isPlayer: boolean;
  readonly candidates: readonly Person[];
  readonly rival?: boolean;
  readonly portraitUri?: string;
  /**
   * The department as a president names it — "Defense", "Homeland Security".
   * A face is drawn small enough that its full office title would be either
   * three ellipsized characters or a caption four times the width of the
   * portrait, so the seating draws this instead.
   */
  readonly shortLabel?: string;
  readonly loyaltyMovedPoints?: number;
  /**
   * What this chair currently delivers, 0..1 with a formatted value.
   *
   * For a chair that runs a legislable domain this is the program execution
   * multiplier; for a department secretary who chairs none it is what their
   * department can carry. Both are "how much of what you ask for actually
   * happens", which is why they share a row rather than being two figures with
   * ten of the fifteen secretaries showing neither. A vacant chair carries it
   * too: the building keeps running with nobody at the top of it, and how
   * badly it runs is the whole cost of leaving the seat empty.
   */
  readonly deliversQuality?: number;
  readonly deliversFraction?: number;
  /**
   * The reading in the one unit the row prints it in.
   *
   * One unit, never two. A program chair's row said "+34% delivery x1.34":
   * the same fact twice, in a percentage the player can read and a multiplier
   * they cannot, so neither one was the reading and the row had a spare figure
   * in it.
   */
  readonly deliversValue?: string;
  /** The department the reading is about, where it is a department rather than a program. */
  readonly deliversLabel?: string;
  /**
   * Which of the two readings this is, because they are not on the same scale.
   *
   * A program multiplier is centered on 1.0 and reads as a shortfall or a
   * surplus against what was ordered. A department's capacity is a share of
   * 1.0 and reads as how much of its mandate it can carry. Rendering the
   * second through the first's words put "−25% delivery" beside a department
   * running at a perfectly ordinary 75%, which is a sentence that is not true.
   */
  readonly deliversKind?: "program" | "department";
  /** Work queued behind this seat's department, where there is any. */
  readonly departmentBacklog?: number;
  /** Component bureaus under it with nobody confirmed. */
  readonly departmentUnledBureaus?: number;
  /** The odds this chair breaks in a bad week, and the way it breaks. */
  readonly breaks?: SeatBreak;
  /** What their advice has been worth, once they have given any. */
  readonly counsel?: SeatCounsel;
  /**
   * What the office's own statute permits the President to do to it. Read off
   * the catalog rather than assumed: the lever on a row is only honest if it
   * is the lever this particular chair actually carries.
   */
  readonly removal?: RemovalConstraint;
  /**
   * How the chair is filled, and what may run the building while it is empty.
   *
   * From the catalog's own `OfficeDef` like the removal rule beside them. They
   * decide whether filling this chair is a Senate fight and whether the
   * department has anyone at the top of it in the meantime, which is the whole
   * cost of a vacancy — and until now no surface said either.
   */
  readonly appointment?: AppointmentClass;
  readonly acting?: ActingAuthority;
  readonly actingLimitDays?: number;
  readonly office?: SeatOfficeSummary;
  /** Where a name already sent up for this chair stands, in a player's words. */
  readonly nomination?: string;
  /**
   * A holder serving out an announced departure: the weeks until they go if
   * nobody is named, and whether a successor is already before the Senate.
   */
  readonly departing?: { readonly weeksLeft: number; readonly successorPending: boolean };
};

export type SeatScan = {
  readonly word: string;
  readonly figure: string;
  readonly stance: MetricStance;
};

/** One fact the row's sentence cannot carry, as a word and at most one figure. */
export type SeatFact = {
  readonly word: string;
  readonly figure?: string;
  readonly stance: MetricStance;
};

/**
 * The act this row carries, named in the office's own terms.
 *
 * `kind` is what the surface draws; `label` is what it says. A chair the
 * President may not empty says so in the slot where the act would be, because
 * an absent lever is a fact about the office and not a blank.
 */
export type SeatLever =
  | { readonly kind: "shortlist"; readonly label: string; readonly stance: MetricStance }
  | { readonly kind: "waiting"; readonly label: string; readonly stance: MetricStance }
  | { readonly kind: "stranded"; readonly label: string; readonly stance: MetricStance }
  | { readonly kind: "dismiss"; readonly label: string; readonly stance: MetricStance }
  | { readonly kind: "for-cause"; readonly label: string; readonly stance: MetricStance }
  | { readonly kind: "protected"; readonly label: string; readonly stance: MetricStance }
  | { readonly kind: "none" };

// The disposition with its figure, which is the trailing column's whole job.
// A vacant chair the cast can still fill is a decision, not a crisis — amber,
// not the red of one already gone wrong.
export function seatScan(seat: Seat): SeatScan {
  if (seat.isPlayer) return { word: "You", figure: "", stance: "favorable" };
  if (seat.holder === undefined) {
    const stance: MetricStance = seat.candidates.length === 0 ? "adverse" : "caution";
    // No figure. The bench count belongs to the `Eligible` chip, where it is
    // labeled: a bare numeral under the word "Vacant" reads as a count of
    // vacancies, and the row's spoken label said "Vacant 3 … Eligible 3".
    return { word: "Vacant", figure: "", stance };
  }
  // The disposition word, and only that. The column is the disposition with its
  // figure, so "Watch" printed over a green 79 was a word disagreeing with the
  // ink beside it — and saying nothing the "Watch: Ambition" chip below did not
  // already say with its subject named. A rival faction and a watch reading are
  // cautions; they belong in the caution chip, which is where they now are.
  //
  // The figure is never the stored percentage — nobody in the fiction of the
  // office is handed a minister's loyalty as a number. It is the signed
  // movement since this chair took the seat (`loyaltyMovedPoints`, the same
  // trend `cautionFact` below already flags when it turns negative), which is
  // the one loyalty figure a president can actually observe happening, and it
  // is blank for a chair that has not moved yet rather than a reading with
  // nothing behind it.
  const loyalty = stanceForRatio(seat.holder.loyalty);
  const moved = seat.loyaltyMovedPoints;
  const figure = moved === undefined || moved === 0 ? "" : `${moved > 0 ? "+" : ""}${moved} pts`;
  return { word: loyaltyWord(loyalty), figure, stance: loyalty };
}

/**
 * The act the row carries, priced in the only currency this surface can state
 * honestly: the statutory rule. The engine charges a dismissal against
 * standing by the officer's own charisma, but it exposes no projection of that
 * charge, so the row names the rule and sends the player to the file that runs
 * the act rather than printing a figure nothing computed.
 */
export function seatLever(seat: Seat): SeatLever {
  if (seat.isPlayer) return { kind: "none" };
  if (seat.holder === undefined) {
    if (seat.nomination !== undefined) {
      return { kind: "waiting", label: `${seat.nomination}. The seat stays empty until they're sworn in`, stance: "caution" };
    }
    if (seat.candidates.length === 0) {
      return { kind: "stranded", label: "Nobody available can fill this seat, so it stays empty.", stance: "adverse" };
    }
    const count = seat.candidates.length;
    return {
      kind: "shortlist",
      label: `Fill the seat (${count} available)`,
      stance: "caution",
    };
  }
  if (seat.departing !== undefined) return departingLever(seat, seat.departing);
  switch (seat.removal) {
    case "for-cause":
      return { kind: "for-cause", label: "You can remove them only for a serious reason", stance: "caution" };
    case "term-protected":
      return { kind: "protected", label: "They serve a fixed term you can't cut short", stance: "neutral" };
    case "at-will":
      return { kind: "dismiss", label: "You can fire them at any time from their profile", stance: "neutral" };
    default:
      return { kind: "none" };
  }
}

/** A chair whose holder has announced they are going: the act is naming who follows. */
function departingLever(seat: Seat, departing: NonNullable<Seat["departing"]>): SeatLever {
  const name = seat.holder?.name ?? "The Secretary";
  if (departing.successorPending && seat.nomination !== undefined) {
    return { kind: "waiting", label: `${seat.nomination}. ${name} serves until they're sworn in`, stance: "neutral" };
  }
  const when = departing.weeksLeft <= 0 ? "this week" : departing.weeksLeft === 1 ? "in a week" : `in ${departing.weeksLeft} weeks`;
  return {
    kind: "shortlist",
    label: `Name a successor. ${name} leaves ${when}, and their deputy fills in if you don't`,
    stance: departing.weeksLeft <= 1 ? "adverse" : "caution",
  };
}
