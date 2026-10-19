import type { NationId } from "@admin/world";
import type { CasualtiesBySide, ConflictInheritance } from "./state-world.js";

// --- Conflicts: what two states do to each other once talking has stopped ---
//
// The rules that move a conflict live in conflicts.ts; the shape lives here
// with the rest of the campaign's plain data, so state stays serializable and
// the rules that move it stay in one file.

export type ConflictSide = "aggressor" | "defender";

export type ConflictBeat = {
  readonly turn: number;
  readonly description: string;
};

export type ConflictStatus = "active" | "aggressor-victory" | "defender-victory" | "settled";

export type Conflict = {
  readonly id: string; // "war:<aggressor>:<defender>:<startedTurn>"
  readonly aggressor: NationId;
  readonly defender: NationId;
  // Nations that joined after the opening, per side. The principals are not
  // repeated here.
  readonly joined: Readonly<Record<ConflictSide, readonly NationId[]>>;
  readonly startedTurn: number;
  readonly cause: string;
  readonly intensity: number; // 0..1 — how hot the front is this week
  // Willingness to keep fighting at home, per side. A war nobody at home
  // wants ends regardless of what the map says.
  readonly warSupport: Readonly<Record<ConflictSide, number>>;
  // Cumulative wear. Exhaustion is what makes a long war lose itself.
  readonly exhaustion: Readonly<Record<ConflictSide, number>>;
  readonly status: ConflictStatus;
  readonly beats: readonly ConflictBeat[];
  readonly endedTurn?: number;
  /** Set only on a war the board carried into the oath. Absent on every war this administration saw begin. */
  readonly inherited?: ConflictInheritance;
  /** Cumulative losses per side as bands. Absent until a week of fighting has been counted. */
  readonly casualties?: CasualtiesBySide;
  /** Co-belligerents that joined and then left, in the order they left. Absent means nobody has left. */
  readonly left?: readonly NationId[];
  /**
   * The act that opened the war, where it changes how the war is read: a
   * blockade, or a target answering an attempted act of force with its own.
   * Absent on every war opened the older ways, by an invasion or by a second
   * act of force between the pair.
   */
  readonly opening?: ConflictOpening;
  /** Civilians killed in the defender's country so far, the central estimate. Absent until a week has been counted, and on older saves. */
  readonly civilianDeaths?: number;
};

export type ConflictOpening = "blockade" | "retaliation";
