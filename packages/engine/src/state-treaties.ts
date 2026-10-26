import type { NationId, TreatyId } from "@admin/world";
import type { ChamberVote } from "./state-legislature.js";

// --- Treaties: what the president signs and the Senate decides about ---
//
// Congress arrived with confirmation and appropriation, both of them simple
// majorities. Ratification is neither: two thirds of the Senate is a different
// arithmetic and a genuinely different constraint, and it is the one that makes
// the top of the diplomatic ladder a promise a president may not be able to
// keep. A signed treaty that is never ratified is a real outcome of a real
// presidency, so the record keeps both halves.
//
// Not every international commitment is an Article II treaty, and modeling
// only that kind taught the inverse of how the office actually works: most of
// what the United States concludes abroad is a congressional-executive or sole
// executive agreement (Case-Zablocki Act, 1 U.S.C. section 112b) that binds
// the moment it is signed and never goes near the Senate. `TreatyTerms.bindsOn`
// in treaties.ts is what tells the two apart; the record shape here stays one
// type either way, because both are the same kind of promise on paper, only
// backed by a different branch of the government.

export type TreatyKind = "alliance" | "trade" | "arms-control" | "executive-agreement";

export type TreatyStatus = "signed" | "ratified" | "in-force-by-signature" | "rejected" | "withdrawn";

export type TreatyRecord = {
  readonly id: string; // "treaty:<kind>:<counterpart>:<signedTurn>"
  /** The instrument as the relationship graph names it once it is in force. */
  readonly treaty: TreatyId;
  readonly title: string;
  readonly kind: TreatyKind;
  readonly counterpart: NationId;
  readonly signedTurn: number;
  readonly status: TreatyStatus;
  /** The Senate's count, once it has taken one. Absent for an instrument that never goes up. */
  readonly vote?: ChamberVote;
  readonly resolvedTurn?: number;
};
