// Durable presidential cases. Plain data the engine can store without
// importing content or a screen. A case says what is waiting. An effect says
// what changed.
import type { EffectActor, GameDate } from "./state-campaign.js";

export type CaseStatus =
  | "raised"
  | "opened"
  | "considering"
  | "deferred"
  | "delegated"
  | "declined"
  | "acted"
  | "defaulted"
  | "withdrawn"
  | "superseded"
  | "resolved";

export type CaseKind =
  | "authored-scenario"
  | "bill"
  | "nomination"
  | "budget"
  | "executive-order"
  | "emergency"
  | "military-authorization"
  | "foreign-request"
  | "treaty"
  | "compact-call"
  | "oversight"
  | "court-response"
  | "press-response"
  | "institution-request"
  | "delayed-consequence";

export type CaseDisposition =
  | { readonly kind: "act"; readonly actionId: string }
  | { readonly kind: "defer"; readonly until: GameDate }
  | { readonly kind: "delegate"; readonly institution: string }
  | { readonly kind: "decline" }
  | { readonly kind: "allow-default" };

export type CaseClock =
  | { readonly kind: "none" }
  | { readonly kind: "statutory" | "operational" | "deteriorating" | "opportunity"; readonly dueAt: GameDate };

export type CaseDefault =
  | { readonly kind: "none" }
  | { readonly kind: "declined" | "legal-default" | "failed"; readonly outcomeId: string }
  | { readonly kind: "delegated"; readonly institution: string; readonly outcomeId: string }
  | { readonly kind: "escalated"; readonly successorFactory: string };

export type CaseSubject = { readonly kind: string; readonly id: string };

export type CaseContentPin = { readonly scenarioId: string; readonly digest: string };

export type CaseTransition = {
  readonly at: GameDate;
  readonly from: CaseStatus;
  readonly to: CaseStatus;
  readonly disposition?: CaseDisposition;
  readonly actor: EffectActor;
  readonly causeId?: string;
  readonly narration: string;
};

export type PresidentialCase = {
  readonly id: string;
  readonly kind: CaseKind;
  readonly status: CaseStatus;
  readonly title: string;
  readonly subject: CaseSubject;
  readonly raisedAt: GameDate;
  readonly lastTouchedAt: GameDate;
  readonly clock: CaseClock;
  readonly defaultOutcome: CaseDefault;
  readonly urgency: "hard" | "soft";
  readonly responseRequirement: "president" | "delegable" | "optional";
  readonly allowedDispositions: readonly CaseDisposition["kind"][];
  readonly contentPin?: CaseContentPin;
  /** JSON the content package can read back. The engine does not interpret it. */
  readonly authoredSnapshot?: string;
  readonly story?: import("./story-subject.js").StoryBinding;
  readonly deferredUntil?: GameDate;
  readonly causeIds: readonly string[];
  readonly history: readonly CaseTransition[];
};

/** What a raise effect carries. Status, history and causes are written by apply(). */
export type CaseRaise = {
  readonly id: string;
  readonly kind: CaseKind;
  readonly title: string;
  readonly subject: CaseSubject;
  readonly clock: CaseClock;
  readonly defaultOutcome: CaseDefault;
  readonly urgency: "hard" | "soft";
  readonly responseRequirement: "president" | "delegable" | "optional";
  readonly allowedDispositions: readonly CaseDisposition["kind"][];
  readonly contentPin?: CaseContentPin;
  readonly authoredSnapshot?: string;
  readonly story?: import("./story-subject.js").StoryBinding;
};

/** A player-authored rule. Hard cases cannot match: the urgency ceiling is soft. */
export type CaseAutomationRule = {
  readonly id: string;
  readonly name: string;
  readonly kinds: readonly CaseKind[];
  readonly maxUrgency: "soft";
  readonly disposition: CaseDisposition;
  readonly enabled: boolean;
};

export type CaseMove = {
  readonly id: string;
  readonly disposition: CaseDisposition;
  readonly narration: string;
};

export type CaseEffect = {
  readonly kind: "case";
  readonly actor: EffectActor;
  readonly raise?: CaseRaise;
  readonly transition?: CaseMove;
};
