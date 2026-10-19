import type { AgendaTheme, NationId } from "@admin/world";
import type { CausalId } from "./causality.js";

// --- Pursuits: one nation working on another, week after week ---
//
// A conflict is what two states do to each other once talking has stopped; a
// pursuit is the weeks of pressure before that, and most of them never become
// a war. The rules that move one live in pursuits.ts; the shape lives here with
// the rest of the campaign's plain data, in a module of its own so the
// campaign shape stays inside its size budget.

export type PursuitStatus = "active" | "achieved" | "abandoned";

export type PursuitBeat = {
  readonly turn: number;
  readonly description: string;
};

export type Pursuit = {
  readonly id: string; // "pursuit:<actor>:<target>:<openedTurn>"
  readonly actor: NationId;
  readonly target: NationId;
  readonly aim: AgendaTheme; // what the actor is after, from its own agendas
  readonly openedTurn: number;
  readonly commitment: number; // 0..1 — how much of itself the actor has put in
  readonly progress: number; // -1..1 — toward the aim, or away from it
  // The highest rung this campaign has used. A pursuit does not step back down
  // the ladder: what has been done has been done.
  readonly rungReached: number;
  // Whether any part of it has been run in the open. A campaign conducted
  // entirely by covert means is not something third parties can read.
  readonly overt: boolean;
  readonly lastActedTurn: number;
  readonly status: PursuitStatus;
  readonly beats: readonly PursuitBeat[];
  readonly closedTurn?: number;
  /**
   * The ledger event this record first appeared on.
   *
   * Written once by the record writer, from the event being folded, and
   * inherited by every later write of the same id. It is what lets the week
   * this record changes point back at the week it began, across a phase
   * boundary that carries nothing else.
   */
  readonly causedBy?: CausalId;
};
