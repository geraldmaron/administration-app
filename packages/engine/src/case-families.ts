// One disposition contract per case kind. A blocking kind ends by an act, a
// decline, a legal default, or a deadline that carries one. Bills and force
// authorizations stay with the President.
import type { CaseDefault, CaseDisposition, CaseKind, CaseRaise, CaseSubject } from "./case-types.js";
import type { GameDate } from "./state-campaign.js";

export type FamilyClock = "none" | "statutory" | "operational" | "deteriorating" | "opportunity";

export type FamilyContract = {
  readonly kind: CaseKind;
  readonly urgency: "hard" | "soft";
  readonly responseRequirement: "president" | "delegable" | "optional";
  readonly allowed: readonly CaseDisposition["kind"][];
  readonly clock: FamilyClock;
  readonly defaultKind: CaseDefault["kind"];
};

const TERMINAL: ReadonlySet<CaseDisposition["kind"]> = new Set(["act", "decline", "allow-default"]);

export const CASE_FAMILIES: readonly FamilyContract[] = [
  { kind: "authored-scenario", urgency: "hard", responseRequirement: "president", allowed: ["act", "decline", "defer", "allow-default"], clock: "deteriorating", defaultKind: "declined" },
  { kind: "bill", urgency: "hard", responseRequirement: "president", allowed: ["act", "defer", "allow-default"], clock: "statutory", defaultKind: "legal-default" },
  { kind: "nomination", urgency: "soft", responseRequirement: "president", allowed: ["act", "decline", "defer"], clock: "none", defaultKind: "none" },
  { kind: "budget", urgency: "hard", responseRequirement: "president", allowed: ["act", "defer", "allow-default"], clock: "statutory", defaultKind: "legal-default" },
  { kind: "executive-order", urgency: "soft", responseRequirement: "president", allowed: ["act", "decline"], clock: "none", defaultKind: "none" },
  { kind: "emergency", urgency: "hard", responseRequirement: "president", allowed: ["act", "decline", "defer", "delegate", "allow-default"], clock: "operational", defaultKind: "escalated" },
  { kind: "military-authorization", urgency: "hard", responseRequirement: "president", allowed: ["act", "decline", "allow-default"], clock: "opportunity", defaultKind: "failed" },
  { kind: "foreign-request", urgency: "soft", responseRequirement: "delegable", allowed: ["act", "decline", "defer", "delegate", "allow-default"], clock: "opportunity", defaultKind: "declined" },
  { kind: "treaty", urgency: "hard", responseRequirement: "president", allowed: ["act", "decline", "defer", "allow-default"], clock: "opportunity", defaultKind: "failed" },
  { kind: "compact-call", urgency: "soft", responseRequirement: "delegable", allowed: ["act", "decline", "delegate"], clock: "none", defaultKind: "none" },
  { kind: "oversight", urgency: "hard", responseRequirement: "president", allowed: ["act", "defer", "allow-default"], clock: "statutory", defaultKind: "legal-default" },
  { kind: "court-response", urgency: "hard", responseRequirement: "president", allowed: ["act", "defer", "delegate", "allow-default"], clock: "statutory", defaultKind: "legal-default" },
  { kind: "press-response", urgency: "soft", responseRequirement: "delegable", allowed: ["act", "decline", "defer", "delegate", "allow-default"], clock: "opportunity", defaultKind: "declined" },
  { kind: "institution-request", urgency: "soft", responseRequirement: "delegable", allowed: ["act", "decline", "delegate"], clock: "none", defaultKind: "none" },
  { kind: "delayed-consequence", urgency: "soft", responseRequirement: "president", allowed: ["act", "decline"], clock: "none", defaultKind: "none" },
];

export function familyContract(kind: CaseKind): FamilyContract {
  const found = CASE_FAMILIES.find((row) => row.kind === kind);
  if (found === undefined) throw new Error(`no case family ${kind}`);
  return found;
}

export function familyCanEnd(contract: FamilyContract): boolean {
  if (contract.allowed.some((kind) => TERMINAL.has(kind))) return true;
  return contract.clock !== "none" && contract.defaultKind !== "none";
}

// The words are the Default column of the case-kind contract. Nothing in the engine
// executes them yet. They are stored so a later effect can be checked against
// the sentence the contract already names.
const DEFAULT_PHRASE: Readonly<Record<CaseKind, string>> = {
  "authored-scenario": "authored deterioration/withdrawal or none",
  bill: "constitutional result",
  nomination: "vacancy continues",
  budget: "shutdown/lapse/default law",
  "executive-order": "none",
  emergency: "deterioration/escalation",
  "military-authorization": "target/opportunity changes",
  "foreign-request": "offer withdrawn or relationship inference",
  treaty: "offer expiry/standing obligation",
  "compact-call": "offer expiry/standing obligation",
  oversight: "ruling/enforcement",
  "court-response": "ruling/enforcement",
  "press-response": "story proceeds without response",
  "institution-request": "none",
  "delayed-consequence": "none",
};

function defaultOutcome(contract: FamilyContract): CaseDefault {
  const phrase = DEFAULT_PHRASE[contract.kind];
  switch (contract.defaultKind) {
    case "none":
      return { kind: "none" };
    case "escalated":
      return { kind: "escalated", successorFactory: phrase };
    case "delegated":
      throw new Error(`case family ${contract.kind} has a delegated default and no institution on the raise`);
    case "declined":
    case "legal-default":
    case "failed":
      return { kind: contract.defaultKind, outcomeId: phrase };
  }
}

function familyClock(contract: FamilyContract, id: string, dueAt: GameDate | undefined): CaseRaise["clock"] {
  if (contract.clock === "none") return { kind: "none" };
  if (dueAt === undefined) throw new Error(`case ${id} needs a due date`);
  return { kind: contract.clock, dueAt };
}

/** A raise that already satisfies the family's contract. */
export function raiseForFamily(input: {
  readonly kind: CaseKind;
  readonly id: string;
  readonly title: string;
  readonly subject: CaseSubject;
  readonly dueAt?: GameDate;
}): CaseRaise {
  const contract = familyContract(input.kind);
  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    subject: input.subject,
    clock: familyClock(contract, input.id, input.dueAt),
    defaultOutcome: defaultOutcome(contract),
    urgency: contract.urgency,
    responseRequirement: contract.responseRequirement,
    allowedDispositions: contract.allowed,
  };
}
