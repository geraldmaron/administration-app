import {
  daysBetween,
  selectNation,
  type Campaign,
  type CaseKind,
  type CaseStatus,
  type PresidentialCase,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import type { MetricStance } from "../format/figures";
import type { FamilyEntry } from "./family-cases";
import { urgencyForDays } from "../summons/clock-math";

// A plain view model, not `@admin/ui-web`'s own prop types: player-core stays
// renderer-free, and its shape is deliberately the same fields CaseRow reads
// so a web screen's adapter is a rename, not a translation.
export type CaseRowStance = MetricStance;
export type CaseRowClock = {
  readonly urgency: "due" | "closing" | "standing";
  readonly dueLabel: string;
  readonly daysRemaining?: number;
  readonly windowDays?: number;
};

// Every family matter on the Desk, read through one grammar — `ui-web`'s
// CaseRow — regardless of which family raised it. An authored decision is not
// here: its document is the Desk's decision card, and drawing it twice would
// be two claims on one answer.

export type CaseRowViewModel = {
  readonly id: string;
  readonly title: string;
  readonly subject: string;
  /** The family, so a surface can draw its mark without parsing the label. */
  readonly kind: CaseKind;
  readonly kindLabel: string;
  readonly statusLabel: string;
  readonly stance: CaseRowStance;
  readonly ageDays: number;
  readonly delegable: boolean;
  readonly clock?: CaseRowClock;
  /** The family's own document, where its act is taken. */
  readonly href?: string;
  readonly doorLabel?: string;
};

const KIND_LABEL: Readonly<Record<CaseKind, string>> = {
  "authored-scenario": "Decision",
  bill: "Bill",
  nomination: "Nomination",
  budget: "Budget",
  "executive-order": "Executive order",
  emergency: "Emergency",
  "military-authorization": "War authorization",
  "foreign-request": "World request",
  treaty: "Treaty",
  "compact-call": "Alliance call",
  oversight: "Oversight",
  "court-response": "Court response",
  "press-response": "Press response",
  "institution-request": "Agency request",
  "delayed-consequence": "Delayed effect",
};

const STATUS_LABEL: Readonly<Record<CaseStatus, { readonly label: string; readonly stance: CaseRowStance }>> = {
  raised: { label: "New", stance: "adverse" },
  opened: { label: "Open", stance: "caution" },
  considering: { label: "Under review", stance: "caution" },
  deferred: { label: "Put off", stance: "neutral" },
  delegated: { label: "Handed off", stance: "neutral" },
  declined: { label: "Declined", stance: "neutral" },
  acted: { label: "Acted on", stance: "favorable" },
  defaulted: { label: "Ran out of time", stance: "adverse" },
  withdrawn: { label: "Withdrawn", stance: "neutral" },
  superseded: { label: "Replaced", stance: "neutral" },
  resolved: { label: "Resolved", stance: "favorable" },
};

// Who put the matter in front of the President, in the queue's own words.
const RAISED_BY: Partial<Record<CaseKind, string>> = {
  bill: "Congress",
  nomination: "The Senate",
  budget: "Congress",
  emergency: "The states",
};

function caseSubjectLabel(campaign: Campaign, matter: PresidentialCase): string {
  if (matter.kind === "foreign-request") return selectNation(campaign, matter.subject.id as NationId)?.base.identity.name ?? "A foreign government";
  return RAISED_BY[matter.kind] ?? matter.subject.kind.charAt(0).toUpperCase() + matter.subject.kind.slice(1);
}

// The reason the clock runs, in the words the case clock itself uses.
const CLOCK_WORD: Readonly<Record<Exclude<PresidentialCase["clock"]["kind"], "none">, string>> = {
  statutory: "Deadline set by law",
  operational: "Operation on a timer",
  deteriorating: "Worsening",
  opportunity: "Chance closing soon",
};

function clockFor(campaign: Campaign, matter: PresidentialCase): CaseRowClock | undefined {
  if (matter.clock.kind === "none") return undefined;
  const daysRemaining = daysBetween(campaign.calendar, matter.clock.dueAt);
  // The window runs from the day the case was raised, so a drawn clock reads
  // the days left against the days it was given rather than on a scale of its own.
  const windowDays = daysBetween(matter.raisedAt, matter.clock.dueAt);
  return {
    urgency: urgencyForDays(daysRemaining),
    dueLabel: CLOCK_WORD[matter.clock.kind],
    daysRemaining: Math.max(0, daysRemaining),
    ...(windowDays > 0 ? { windowDays } : {}),
  };
}

/** One case, as the row the queue draws — the same shape whatever family raised it. */
export function caseRowViewModel(campaign: Campaign, matter: PresidentialCase): CaseRowViewModel {
  const status = STATUS_LABEL[matter.status];
  return {
    id: matter.id,
    title: matter.title,
    subject: caseSubjectLabel(campaign, matter),
    kind: matter.kind,
    kindLabel: KIND_LABEL[matter.kind],
    statusLabel: status.label,
    stance: status.stance,
    ageDays: Math.max(0, daysBetween(matter.raisedAt, campaign.calendar)),
    delegable: matter.responseRequirement === "delegable",
    clock: clockFor(campaign, matter),
  };
}

/** One queue entry, with the door to the family's own document. */
export function familyRowViewModel(campaign: Campaign, entry: FamilyEntry): CaseRowViewModel {
  const row = caseRowViewModel(campaign, entry.record);
  // A relief request names the emergency it is about, since that emergency has no row of its own.
  const context = entry.source.context;
  return {
    ...row,
    ...(context ? { subject: `${row.subject} · ${context.title}` } : {}),
    href: entry.source.door.href,
    doorLabel: entry.source.door.label,
  };
}
