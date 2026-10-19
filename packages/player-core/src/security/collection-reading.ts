import {
  IC_ELEMENTS,
  COLLECTION_FOCUS_LABELS,
  collectionTopics,
  PRODUCT_CYCLE_DAYS,
  REFERRAL_CREDIBILITY_DAYS,
  REFERRAL_TRANSMIT_DAYS,
  apply,
  boundaryRefusalReason,
  campaignDay,
  closeTasking,
  icElement,
  productFor,
  referToAttorneyGeneral,
  selectAgReferrals,
  selectSubjectLeads,
  selectNation,
  selectOpenReferrals,
  selectRefusals,
  selectStandingTaskings,
  taskCollection,
  type Campaign,
  type CollectionTasking,
  type CollectionFocus,
  type Discipline,
  type EffectPacket,
  type IcElementDef,
  type IcElementId,
  type IntelSubject,
  type TaskingRequest,
  type TaskingTargetKind,
} from "@admin/engine";
import type { NationId } from "@admin/world";
import { formatDate, formatSignedPoints } from "../format/figures.js";
import { place } from "../navigation/places.js";
import { cell, weeksWords, type ChoiceTable } from "../policy/choice-table.js";

// Standing collection: what the President has pointed the community at, what
// it has filed, and the boundary a request meets. A request outside an
// element's lawful reach is not refused by the engine; what succeeds is the
// refusal, so the table says what the community will do, not whether it is
// allowed to be asked.

export const TARGET_KINDS: readonly { readonly id: TaskingTargetKind; readonly label: string; readonly detail: string }[] = [
  { id: "foreign-nation", label: "A foreign government", detail: "What it plans, its military, or how stable it is." },
  { id: "domestic-state", label: "Public conditions in a state", detail: "DHS I&A, Homeland Security's intelligence office, can sum up public reports and governors' requests. It can't investigate the people who live there." },
  { id: "foreign-person", label: "A foreign person", detail: "Only the leader of a government that's pressuring the United States, and only through CIA informants." },
  { id: "domestic-person", label: "A person in the United States", detail: "You can't send the intelligence agencies after anyone here. If an inspector general's public report names someone, you can pass the matter to the Attorney General, who decides what to do." },
  { id: "domestic-politics", label: "American politics", detail: "Elections, public opinion, policy, or the press. No intelligence agency is allowed to look into these." },
];

const DISCIPLINE_WORDS: Readonly<Record<Discipline, string>> = {
  humint: "informants",
  sigint: "intercepted signals",
  geoint: "imagery and mapping",
  masint: "technical sensors",
  osint: "public sources",
  finint: "financial records",
  "all-source": "everything it already has",
};

export const disciplineWords = (discipline: Discipline): string => DISCIPLINE_WORDS[discipline];

export type TaskingRow = {
  readonly id: string;
  readonly element: string;
  readonly elementName: string;
  readonly discipline: string;
  readonly kind: string;
  readonly target: string;
  /** The government or state file the tasking is aimed at, where it has one. */
  readonly href?: string;
  readonly question: string;
  readonly focus?: string;
  readonly note?: string;
  readonly closedReason?: string;
  readonly opened: string;
  /** Whole weeks the tasking has stood. */
  readonly weeks: number;
  readonly product?: { readonly summary: string; readonly filed: string; readonly status?: "findings" | "no-result"; readonly confidence?: "low" | "moderate" | "high" };
};

export type CollectionReading = {
  readonly taskings: readonly TaskingRow[];
  /** Requests the community has declined, kept forever. */
  readonly declined: number;
  /** Matters an inspector general has open about a declined request. */
  readonly referred: number;
};

const nameOf = (campaign: Campaign, id: string): string => selectNation(campaign, id as NationId)?.base.identity.name ?? id;

function targetName(campaign: Campaign, tasking: CollectionTasking): string {
  if (tasking.subject) return campaign.people[tasking.subject.personId]?.base.name ?? tasking.target;
  if (tasking.targetKind === "foreign-nation") return nameOf(campaign, tasking.target);
  if (tasking.targetKind === "domestic-state") return campaign.states[tasking.target as keyof Campaign["states"]]?.base.name ?? tasking.target;
  return tasking.target;
}

function targetHref(tasking: CollectionTasking): string | undefined {
  if (tasking.subject) return place.person(tasking.subject.personId);
  if (tasking.targetKind === "foreign-nation") return place.country(tasking.target);
  return tasking.targetKind === "domestic-state" ? place.state(tasking.target) : undefined;
}

function rowOf(campaign: Campaign, tasking: CollectionTasking): TaskingRow {
  const element = icElement(tasking.element);
  const product = productFor(campaign, tasking.id);
  return {
    id: tasking.id,
    element: element?.abbr ?? tasking.element,
    elementName: element?.name ?? tasking.element,
    discipline: DISCIPLINE_WORDS[tasking.discipline],
    kind: TARGET_KINDS.find((kind) => kind.id === tasking.targetKind)?.label ?? tasking.targetKind,
    target: targetName(campaign, tasking),
    ...(targetHref(tasking) ? { href: targetHref(tasking) } : {}),
    question: tasking.question,
    ...(tasking.focus ? { focus: COLLECTION_FOCUS_LABELS[tasking.focus] } : {}),
    ...(tasking.note ? { note: tasking.note } : {}),
    ...(tasking.closedReason ? { closedReason: tasking.closedReason } : {}),
    opened: formatDate(tasking.openedDate),
    weeks: Math.max(0, Math.floor((campaignDay(campaign) - tasking.openedDay) / 7)),
    ...(product ? { product: { summary: product.summary, filed: formatDate(product.date), ...(product.status ? { status: product.status } : {}), ...(product.confidence ? { confidence: product.confidence } : {}) } } : {}),
  };
}

export function collectionReading(campaign: Campaign): CollectionReading {
  return {
    taskings: selectStandingTaskings(campaign).map((tasking) => rowOf(campaign, tasking)),
    declined: selectRefusals(campaign).length,
    referred: selectOpenReferrals(campaign).length,
  };
}

/** Every element of the community, with the disciplines it runs. */
export function collectionElements(): readonly IcElementDef[] {
  return IC_ELEMENTS;
}

export type TaskingDraft = { readonly element: IcElementId; readonly discipline: Discipline; readonly kind: TaskingTargetKind; readonly target: string; readonly question: string; readonly focus?: CollectionFocus; readonly note?: string; readonly subject?: IntelSubject };

const requestOf = (draft: TaskingDraft): TaskingRequest => ({ element: draft.element, discipline: draft.discipline, targetKind: draft.kind, target: draft.target.trim(), question: draft.question.trim(),
  ...(draft.focus ? { focus: draft.focus } : {}), ...(draft.note?.trim() ? { note: draft.note.trim() } : {}), ...(draft.subject ? { subject: draft.subject } : {}) });

const TOPIC_WORDS = { "external-intent": "actions abroad", "military-readiness": "forces and readiness",
  "financial-pressure": "economic pressure", stability: "stability", "domestic-security": "conditions in the state" } as const;

export function collectionScopeWords(draft: Pick<TaskingDraft, "discipline" | "kind" | "focus">): string {
  return collectionTopics(draft.discipline, draft.focus, draft.kind).map((topic) => TOPIC_WORDS[topic]).join(", ");
}

function oversightMove(campaign: Campaign, packet: EffectPacket, element: IcElementDef): string {
  const institution = element.institution;
  if (!institution) return "Nothing";
  const move = (apply(campaign, packet).institutions[institution]?.oversightPressure ?? 0) - (campaign.institutions[institution]?.oversightPressure ?? 0);
  return Math.abs(move) < 0.0005 ? "Nothing" : `Scrutiny of ${element.abbr} ${formatSignedPoints(move)} pts`;
}

const WEEKS_TO_COMMITTEES = Math.round((REFERRAL_CREDIBILITY_DAYS + REFERRAL_TRANSMIT_DAYS) / 7);

/** Whether the request would be declined: the engine files it and the community says no. */
export function taskingRefusal(draft: TaskingDraft): string | undefined {
  const element = icElement(draft.element);
  return element ? boundaryRefusalReason(element, requestOf(draft)) : undefined;
}

/** Pointing an element at a question, read as what it starts. */
export function taskChoices(campaign: Campaign, draft: TaskingDraft): ChoiceTable | undefined {
  const element = icElement(draft.element);
  if (!element) return undefined;
  const result = taskCollection(campaign, requestOf(draft));
  const refusal = taskingRefusal(draft);
  const asked = (draft.focus !== undefined || draft.question.trim() !== "") && draft.target.trim() !== "";
  const sameDay = !refusal && campaign.security.intelligence.taskings[`tasking:${draft.element}:${campaignDay(campaign)}`] !== undefined;
  const unavailable = sameDay ? `Not available right now. You already gave ${element.abbr} a job today, and a second one would replace it. Try again tomorrow.` : !asked ? "Not available right now. Write the question you want answered first." : !result.ok ? `Not available right now. ${result.reason}` : undefined;
  const referral = result.ok && result.packet.effects.some((effect) => effect.kind === "intelligence" && "referral" in effect && effect.referral !== undefined);
  return {
    columns: [
      { id: "task", label: `Task ${element.abbr}`, ...(unavailable ? { locked: unavailable } : {}) },
    ],
    rows: [
      { id: "does", label: "What the intelligence agencies do", cells: [refusal ? cell(`${element.abbr}'s lawyers say no. ${refusal}`, "adverse") : cell(draft.kind === "domestic-state" ? `${element.abbr} sums up public reports and governors' requests from the state about every ${weeksWords(Math.round(PRODUCT_CYCLE_DAYS / 7))}. It doesn't investigate anyone who lives there.` : `${element.abbr} uses ${disciplineWords(draft.discipline)} to report on ${collectionScopeWords(draft) || "what it usually covers"} about every ${weeksWords(Math.round(PRODUCT_CYCLE_DAYS / 7))}. Your note is kept on file, but it doesn't change what they collect.`, "favorable")] },
      { id: "record", label: "On the record", cells: [refusal ? cell("The refusal is kept forever. Asking again won't change the answer", "adverse") : cell("An ongoing assignment, until you call it off")] },
      { id: "watched", label: "How closely it is watched", cells: [result.ok ? cell(oversightMove(campaign, result.packet, element), refusal ? "adverse" : "neutral") : cell("Nothing")] },
      { id: "inspector", label: "An inspector general", cells: [referral ? cell(`Opens an investigation. Congress's intelligence committees hear about it in about ${weeksWords(WEEKS_TO_COMMITTEES)}, and you can't control when`, "adverse") : cell("None opened")] },
      { id: "now", label: "Cost now", cells: [cell("Nothing")] },
    ],
  };
}

export function taskOrder(campaign: Campaign, draft: TaskingDraft): EffectPacket {
  const result = taskCollection(campaign, requestOf(draft));
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}

/** Taking an element off a question, read as what it stops. */
export function closeTaskingChoices(campaign: Campaign, id: string): ChoiceTable | undefined {
  const tasking = campaign.security.intelligence.taskings[id];
  if (!tasking) return undefined;
  const result = closeTasking(campaign, id);
  return {
    columns: [
      { id: "close", label: "Call it off", ...(result.ok ? {} : { locked: `Not available right now. ${result.reason}` }) },
    ],
    rows: [
      { id: "product", label: "What it reports", cells: [cell("No new reports. The last one stays on file")] },
      { id: "judgments", label: "Judgments about that government", cells: [cell("Their judgments become less sure")] },
      { id: "now", label: "Cost now", cells: [cell("Nothing")] },
    ],
  };
}

export function closeTaskingOrder(campaign: Campaign, id: string): EffectPacket {
  const result = closeTasking(campaign, id);
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}

export type PersonLeadRow = {
  readonly caseId: string;
  readonly name: string;
  readonly headline: string;
  readonly href: string;
  readonly subject: IntelSubject;
  /** A foreign person can be tasked; a person in the United States can only be referred. */
  readonly pathway: "task" | "refer";
  readonly referred: boolean;
};

/** The only people the desk may name: those an open case already binds to a person on record. */
export function personLeadRows(campaign: Campaign): readonly PersonLeadRow[] {
  const referred = new Set(selectAgReferrals(campaign).map((entry) => `${entry.subject.basis.caseId}:${entry.subject.personId}`));
  return selectSubjectLeads(campaign).map((lead) => ({
    caseId: lead.subject.basis.caseId, name: lead.name, headline: lead.headline, href: place.person(lead.subject.personId), subject: lead.subject,
    pathway: lead.jurisdiction === "foreign" ? "task" : "refer",
    referred: referred.has(`${lead.subject.basis.caseId}:${lead.subject.personId}`),
  }));
}

/** Referring a matter to the Attorney General, read as what it starts. */
export function referChoices(campaign: Campaign, subject: IntelSubject): ChoiceTable {
  const result = referToAttorneyGeneral(campaign, subject);
  return {
    columns: [
      { id: "refer", label: "Refer to the Attorney General", ...(result.ok ? {} : { locked: `Not available right now. ${result.reason}` }) },
    ],
    rows: [
      { id: "does", label: "What happens", cells: [cell("The Attorney General gets the matter and decides whether to act. You don't direct anything, and no intelligence agency is assigned.", "neutral")] },
      { id: "record", label: "On the record", cells: [cell("A referral naming the person and the case")] },
      { id: "now", label: "Cost now", cells: [cell("Nothing")] },
    ],
  };
}

export function referOrder(campaign: Campaign, subject: IntelSubject): EffectPacket {
  const result = referToAttorneyGeneral(campaign, subject);
  if (!result.ok) throw new Error(result.reason);
  return result.packet;
}
