import type { CommitmentLocation } from "./state-world.js";
import type { ConditionKind } from "./condition-kinds.js";
import type { CausalId } from "./causality.js";
import type { ForceAssetId, MilitaryBranch, NationId, UnitSpec } from "@admin/world";

// What an administration has promised, and the fiscal vocabulary a promise is
// written against.
//
// Split out of state-campaign.ts for the reason state-feed.ts was: it is a
// vocabulary and one record shape rather than the campaign's own shape, and the
// shapes file has to stay inside the size budget as the Campaign grows.

/**
 * What the state spends money *on*, as a budget is actually written.
 *
 * The vocabulary lives here with the plain data rather than in fiscal.ts
 * because a stored `Commitment` names one of these, and a saved campaign must
 * not depend on a module that computes. `fiscal.ts` is what turns the
 * vocabulary into a statement.
 */
// Only the types live here, never the arrays. `state.ts` is held to exporting
// nothing but selectors, types and the diff — a rule with a test behind it —
// and the iterable form of each vocabulary is what `fiscal.ts` exports.
export type OutlayFunction = "defense" | "entitlements" | "discretionary" | "foreignAffairs" | "debtService";

/** Where the money comes from, on the same footing. */
export type RevenueSource = "income" | "corporate" | "tariff" | "other";

export type CommitmentKind = "aid" | "arms" | "deployment" | "basing" | "sustainment" | "program";

/** What the commitment is *to*. The id is a nation, a conflict, an organization or one of the President's own states. */
export type CommitmentTarget = {
  readonly kind: "nation" | "conflict" | "org" | "state";
  readonly id: string;
};

/**
 * What the commitment draws down, which is the whole reason it is not merely a
 * note on a screen. A money commitment is charged against a named outlay
 * function of the fiscal statement; a force commitment takes a stated number of
 * a stated unit type out of a branch's order of battle, where the availability
 * arithmetic then finds it missing.
 */
export type CommitmentSource =
  | { readonly kind: "budgetLine"; readonly line: OutlayFunction }
  | { readonly kind: "orderOfBattle"; readonly branch: MilitaryBranch; readonly unitType: ForceAssetId; readonly count: number };

/**
 * When it comes back up for decision. `standing` is the promise with no end
 * date, which is the kind that actually binds a successor.
 */
export type CommitmentReview = "standing" | { readonly endsTurn: number };

export type CommitmentStatus = "proposed" | "active" | "suspended" | "wound-down";

export type Commitment = {
  readonly id: string; // "commitment:<kind>:<actor>:<target>:<startedTurn>"
  readonly kind: CommitmentKind;
  readonly actor: NationId;
  readonly target: CommitmentTarget;
  /**
   * What it costs per turn, carrying the unit it is counted in. The spec
   * travels with the figure rather than being looked up by a screen, because a
   * commitment can be money, materiel or people and nothing about the number
   * says which.
   */
  readonly resource: { readonly spec: UnitSpec; readonly amountPerTurn: number };
  readonly source: CommitmentSource;
  readonly startedTurn: number;
  readonly review: CommitmentReview;
  readonly status: CommitmentStatus;
  /** Why it exists, in the words the document that created it used. */
  readonly rationale: string;
  readonly endedTurn?: number;
  /**
   * The live `NationCondition` this commitment was opened to answer, if it
   * was opened as a direct response to one. Named at open time rather than
   * read off the target's condition list when the commitment's term runs
   * out, because a commitment's own target nation can be suffering something
   * it never promised to fix — reading its whole condition list at lapse
   * would credit a grudge to an unrelated crisis. Most commitments (aid that
   * is not disaster relief, arms, basing, standing programs) name nothing
   * here and that is the honest answer for them too: whether the need they
   * addressed still stands is then unknowable from the commitment alone, not
   * false, and `commitmentPhase` treats "unknowable" and "resolved" the same
   * way — neither charges the recipient anything when the term runs out.
   */
  readonly addressedCondition?: { readonly kind: ConditionKind; readonly nation: NationId };
  /**
   * The ledger event this record first appeared on.
   *
   * Written once by the record writer, from the event being folded, and
   * inherited by every later write of the same id. It is what lets the week
   * this record changes point back at the week it began, across a phase
   * boundary that carries nothing else.
   */
  readonly causedBy?: CausalId;
  /** Where the force stands, for a commitment positioned at a base or in a theater. Absent means unplaced. */
  readonly location?: CommitmentLocation;
  /**
   * The order record a mission at home was sent under. The forces stay only
   * while that order operates: a court pause, a rescission or a strike-down
   * brings them home the next week, and the bill stops with them.
   */
  readonly authorizedBy?: string;
};
