import type { DecisionFraming } from "./press-framing.js";
import type { NationId, PersonId, StateId } from "@admin/world";
import type { AcuteCondition } from "./condition-kinds.js";
import type { PolicyStatPath } from "./policy-stats.js";
import type { GameDate } from "./state-campaign.js";
import type { LocaleActId } from "./locale-acts.js";
import type { InsurrectionGround } from "./locale-missions.js";

// The president's own instrument, and what happens to it afterwards.
//
// Split out of state-campaign.ts rather than living beside the rest of the
// campaign's shape, for the reason the legislative branch is: an order is a
// small self-contained vocabulary with three separate lives — the signature,
// the court case, and the rulemaking proceeding — and state-campaign.ts had
// grown past the point where a reader could find any of them. Every type here
// is re-exported from state.ts, which stays the single import path for
// campaign state.

// --- Executive orders: what this administration has done at home ---
//
// Kept as a record rather than a count because the count is not the fact that
// matters: which orders were contested is what raises the odds on the next one,
// and a retrospective has to be able to say what the government knew when it
// signed. The rules that read it live in orders.ts.

export type ExecutiveOrderRecord = {
  readonly id: string; // "<orderId>:<turn>" — an order may be signed again later
  readonly order: string;
  /** A modeled supplier identified on an already-funded federal replenishment order. Index units are not physical counts. */
  readonly defenseContract?: { readonly supplier: string; readonly munitionClass: "precision-fires";
    readonly initialIndex: number; readonly due: GameDate;
    readonly provenance: "planning value" };
  readonly subject?: { readonly kind: "foreign"; readonly nation: NationId; readonly declarationId: string }
    | { readonly kind: "ports-of-entry"; readonly scope: "all-federal-ports" }
    | { readonly kind: "entry-class"; readonly nation: NationId; readonly pursuitId: string }
    | { readonly kind: "rule-review"; readonly ruleId: string }
    | { readonly kind: "lease-planning"; readonly areaId: string }
    | { readonly kind: "federal-site"; readonly institutionId: string }
    | { readonly kind: "state"; readonly state: StateId; readonly cause: AcuteCondition;
      readonly declarationId: string; readonly billId: string; readonly amount: number }
    | { readonly kind: "grant"; readonly billId: string }
    | { readonly kind: "construction"; readonly sourceId: string; readonly declarationId: string; readonly amount: number }
    | { readonly kind: "locale-mission"; readonly state: StateId; readonly act: LocaleActId;
      readonly ground?: InsurrectionGround; readonly mission?: string };
  /** The Defense Secretary's §2808 notice received by the congressional defense committees. */
  readonly constructionNotice?: { readonly receivedDay: number; readonly mayContractDay: number;
    readonly destinationState: StateId; readonly destinationProject: string; readonly directSupport: string;
    readonly sourceImpact: string; readonly estimatedCost: number; readonly contractId: string };
  readonly turn: number;
  /** A statutory or player end stops future operation; the signature and any court injury remain on record. */
  readonly rescindedTurn?: number;
  readonly endReason?: "rescinded" | "sunset";
  /** Absolute campaign day when a time-limited order must cease. */
  readonly sunsetDay?: number;
  // Whether the charter's own institutions refused it. Only a contested order
  // establishes that this government reaches too far, which is why this and not
  // the raw count is what compounds.
  readonly contested: boolean;
  // The odds it was signed against, stored rather than recomputed: reading them
  // back later would use the record this very signature added to.
  readonly challengeChance: number;
  /** The government lawyer who gave case-specific legality advice before signature. */
  readonly legalReviewer?: { readonly person: PersonId; readonly reviewedDay: number };
  /**
   * The court case a challenge becomes.
   *
   * A challenge goes to a bench that rules weeks later, and a struck-down order
   * is undone, which is what makes signing one a decision instead of a
   * purchase. If `contested` were the end of the story, the government would
   * pay a bill the week it signed and the order would stand forever regardless,
   * making an executive order the cheapest durable instrument on the board and
   * "reversible by the courts" a label rather than a fact.
   *
   * Absent on an uncontested order, and on an order signed before there was a
   * bench to hear one.
   */
  readonly review?: {
    readonly dueTurn: number;
    readonly status: "pending" | "upheld" | "struck-down";
    readonly ruledTurn?: number;
  };
  /** Actual non-debt movement that landed at signature, after bounds; absent on old saves and rules not yet final. */
  readonly nationContribution?: Partial<Record<PolicyStatPath, number>>;
  /** One remedy attempt has run; an unknown legacy contribution remains explicitly unquantified. */
  readonly remedyApplied?: boolean;
  readonly remedyContribution?: Partial<Record<PolicyStatPath, number>>;
  readonly remedyUnquantified?: boolean;
  /**
   * How the administration explained this act at the podium, if it did.
   *
   * On the act's own ledger entry rather than in a communications log, because
   * a framing is a claim about *this order* and the record has to be able to
   * show the two together — the president who called a withdrawal resolve said
   * it about something, and press-framing.ts reads the order's authored
   * alignment back against the framing to decide whether it was true.
   *
   * Written once and never rewritten: an administration does not get to
   * re-explain an order until a desk agrees.
   */
  readonly framing?: DecisionFraming;
};

/** Relative policy movements on one stat, kept only while its arithmetic is attributable. */
export type OrderStatLineage = {
  readonly base: number;
  readonly events: readonly { readonly delta: number; readonly ownerId?: string; readonly lower?: number; readonly upper?: number }[];
  readonly weights: Readonly<Record<string, number>>;
};

/** A named project funded by enacted law; cancellation releases only its unobligated remainder. */
export type MilitaryConstructionProject = {
  readonly id: string;
  readonly name: string;
  readonly hostState?: StateId;
  readonly appropriationBill: string;
  readonly appropriated: number;
  readonly obligated: number;
  /** Cash paid against the source project's enacted commitments. */
  readonly sourceSpent?: number;
  readonly enactedTurn: number;
  readonly status: "active" | "canceled";
  /** Amount redirected by the §2808 order, never paid again from Treasury. */
  readonly redirected?: number;
  /** Of the transferred authority, the amount committed to the emergency project. */
  readonly redirectedObligated?: number;
  /** Outlays against those commitments; a later injunction does not unwind them. */
  readonly redirectedSpent?: number;
  /** Cash paid this week from both source and redirected commitments. */
  readonly lastCashOutlay?: number;
  readonly lastWorkTurn?: number;
  /** The first contract signed against this transferred source, after notice and wait. */
  readonly redirectedFirstContractDay?: number;
  readonly redirectedContractId?: string;
  readonly redirectedLastTurn?: number;
};

/**
 * An order whose substance is a rule, waiting out the process a rule has to go
 * through before it binds anybody.
 *
 * A president does not change what the country may sell, cross or print by
 * signing a page. An order that directs an agency to write a rule sets a
 * proceeding in motion — notice, comment, a final rule — and the country is
 * unchanged until that finishes, which is months. Modeling every order as
 * effective on signature made the unilateral track not merely faster than
 * legislation but instantaneous, which is the largest single distortion the
 * simulation carried.
 *
 * What is stored is the clock and nothing else: which order, when it was
 * signed, when it takes effect, and where it got to. What it does to the
 * country stays in the catalogue, for the reason the acts and the stances do.
 */
export type PendingRuleStatus =
  /** The proceeding is running. Nothing has reached the country yet. */
  | "pending"
  /** A lower court has paused an unimplemented rule pending merits review. */
  | "stayed"
  /** The rule is final and its effects have landed. */
  | "in-effect"
  /** Struck down before it landed, so there was nothing to undo. */
  | "canceled"
  /** The court invalidated a rule after it had taken effect. */
  | "struck-down"
  /** Congress passed a resolution of disapproval, and what it did was undone. */
  | "disapproved"
  /** Withdrawn prospectively by the administration or a statutory sunset. */
  | "rescinded";

export type PendingRule = {
  readonly id: string; // the signing order record's own id
  readonly order: string;
  readonly signedTurn: number;
  readonly effectiveTurn: number;
  readonly status: PendingRuleStatus;
  /** The agency's contemporaneous record for a leasing-rule procedural challenge. */
  readonly process?: { readonly noticeWeeks: number; readonly commentsAnswered: boolean; readonly siteReviewPreserved: boolean };
  /** Completed review of a named existing rule; this finding never repeals it by itself. */
  readonly reviewFinding?: { readonly targetRuleId: string;
    readonly disposition: "retain" | "recommend-revision" | "closed-without-action" };
  /** The week it landed, was canceled, or was disapproved. */
  readonly resolvedTurn?: number;
  /** Actual non-debt movement when the rule took effect, after bounds. */
  readonly nationContribution?: Partial<Record<PolicyStatPath, number>>;
  readonly remedyApplied?: boolean;
  readonly remedyContribution?: Partial<Record<PolicyStatPath, number>>;
  readonly remedyUnquantified?: boolean;
};
