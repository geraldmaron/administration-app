import type { NationId, StateId } from "@admin/world";
import { selectRelationship, type Campaign, type GameDate } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { campaignDay } from "./nomination.js";
import { IC_ELEMENTS, icElement, type Discipline, type IcElementDef, type IcElementId } from "./ic-elements.js";
// Collection feeds analysis and analysis reads how well the collectors are
// running, so these two modules genuinely depend on each other. Every crossing
// in both directions is a call made at turn time rather than a value read while
// the module is being evaluated, which is what keeps the cycle inert.
import { draftCollectionProduct } from "./collection-report.js";
import { COLLECTION_FOCUS_QUESTIONS, collectionFocusUnavailable, type CollectionFocus } from "./collection-focus.js";
import { domesticPersonRefusal, foreignPersonRefusal, personRequestProblem, subjectRevalidationPackets, subjectTaskingProblem, type AgReferral, type IntelSubject } from "./intel-authority.js";
import { unpromptedIntentPackets } from "./intel-unprompted.js";
import { surveillanceCompliancePackets, surveillancePackets, type SurveillanceIncident } from "./surveillance-incident.js";

export { IC_ELEMENTS, icElement };
export type { Discipline, IcElementDef, IcElementId };
export type { SurveillanceIncident } from "./surveillance-incident.js";

// The intelligence community as something a president can ask for things and
// be told no by.
//
// The engine already had an intelligence *capability*: a number the covert
// ladder spent and time restored. What it did not have was anybody who holds
// it. So there was no question a president could put to an agency, no answer
// that could come back hedged, and no request that could be refused — which
// meant the one thing this part of the government is actually famous for,
// pressure on the product, could not happen at all.
//
// Three rules run through everything below.
//
// **A boundary is a missing executor, not a hard difficulty check.** When a
// president asks the CIA to investigate an American, nothing secretly fails: the
// request has nobody who could lawfully carry it out, it comes back as a
// memorandum from a general counsel, and the asking is itself an event that
// somebody outside the building now knows about.
//
// **Pressure changes the wording, never the world.** Leaning on an agency
// cannot make an adversary weaker or an ally more compliant. It can move a
// judgment's language, and the record shows the language moved, which is the
// only honest way to model politicization: the cost is real and the benefit is
// imaginary.
//
// **The oversight clocks are short and they do not run through this building.**
// An inspector general makes a credibility determination in fourteen days and
// the committees hear about it seven days later. A president cannot slow that
// down by declining to cooperate with it.

export type TaskingId = string;

/** What the request is pointed at, which is the question the boundary answers. */
export type TaskingTargetKind = "foreign-nation" | "foreign-person" | "domestic-state" | "domestic-person" | "domestic-politics";

export const PUBLIC_STATE_QUESTION = COLLECTION_FOCUS_QUESTIONS["domestic-public-conditions"];

export type CollectionTasking = {
  readonly id: TaskingId;
  readonly element: IcElementId;
  readonly discipline: Discipline;
  readonly targetKind: TaskingTargetKind;
  /** A nation id, a name, or a description. Free-form because the boundary reads `targetKind`, not this. */
  readonly target: string;
  readonly question: string;
  /** Absent on older taskings: their free-text question was never used to choose evidence. */
  readonly focus?: CollectionFocus;
  /** Recorded context only; never parsed to select findings or authorize collection. */
  readonly note?: string;
  readonly openedDay: number;
  readonly openedDate: GameDate;
  /** Standing taskings keep producing; a one-off answers once and closes. */
  readonly standing: boolean;
  /** The person this tasking is about, with the case that named them. Present only on person-level taskings. */
  readonly subject?: IntelSubject;
  readonly closedDay?: number;
  /** Set when the engine closed the tasking because its case no longer held. */
  readonly closedReason?: string;
};

/**
 * A request that had no lawful executor, and what came back instead.
 *
 * Kept forever. The whole point of the mechanism is that asking is on the
 * record: a refusal that could be retried until it stopped being logged would
 * be a difficulty setting wearing a statute's clothes.
 */
export type BoundaryRefusal = {
  readonly id: string;
  readonly element: IcElementId;
  readonly request: string;
  readonly day: number;
  readonly date: GameDate;
  readonly reason: string;
  /** Whether this one went outside the executive branch on its own. */
  readonly reportable: boolean;
  readonly subject?: IntelSubject;
};

export type PressureDirection = "harden" | "soften";

/** An attempt to move a judgment, and what it actually moved. */
export type PoliticizationRecord = {
  readonly id: string;
  readonly element: IcElementId;
  readonly assessmentId?: string;
  readonly day: number;
  readonly date: GameDate;
  readonly ask: string;
  readonly direction: PressureDirection;
  /** True where the workforce would not write it, which is the expensive outcome and the common one. */
  readonly refused: boolean;
};

export type ReferralStage = "credibility" | "transmitted" | "closed";

/**
 * A complaint of urgent concern, on its statutory clock.
 *
 * Fourteen days to a credibility determination, seven more to the committees.
 * Modeled in days rather than turns because that is what makes it faster than
 * the president's own week: a referral opened on a Tuesday reaches the Hill
 * before the third turn after it, whatever the administration does.
 */
export type IgReferral = {
  readonly id: string;
  readonly subject: string;
  readonly element: IcElementId;
  readonly openedDay: number;
  readonly openedDate: GameDate;
  readonly stage: ReferralStage;
  readonly determinedDay?: number;
  readonly transmittedDay?: number;
  readonly credible: boolean;
};

/**
 * What a standing tasking has actually produced.
 *
 * The successful branch of `taskCollection` used to write one row and stop: a
 * president could point the NSA at a foreign government, write the question in
 * their own words, and receive an entry on a list that never answered. The only
 * way to make the community *do* something was to ask it for something
 * unlawful, because the refusal branch was the only one that produced anything.
 *
 * A product is what closes that. It is dated, it names what came back, and the
 * analysis side reads it: a judgment about a country somebody has been
 * collecting against is one the community trusts more.
 */
export type CollectionProduct = {
  readonly id: string;
  readonly tasking: TaskingId;
  readonly element: IcElementId;
  readonly discipline: Discipline;
  /** The same free-form target the tasking carries — a nation id where it is one. */
  readonly target: string;
  readonly targetKind?: "foreign-nation" | "domestic-state" | "foreign-person";
  /** Copied from the tasking, so a shared snapshot keeps the case it was collected under. */
  readonly subject?: IntelSubject;
  readonly question: string;
  readonly focus?: CollectionFocus;
  readonly note?: string;
  readonly day: number;
  readonly date: GameDate;
  /** What the collection is worth to a judgment reading it, 0..1. */
  readonly weight: number;
  readonly summary: string;
  readonly status?: "findings" | "no-result";
  readonly confidence?: "low" | "moderate" | "high";
  readonly findings?: readonly CollectionFinding[];
  readonly gaps?: readonly string[];
  readonly exposed?: boolean;
};

export type CollectionFinding = {
  readonly topic: "military-readiness" | "external-intent" | "domestic-security" | "financial-pressure" | "stability";
  readonly observation: string;
  readonly source: string;
  readonly asOfDay: number;
  /** A typed source snapshot used when a recipient must act on this report. */
  readonly basis?:
    | { readonly kind: "pursuit"; readonly id: string; readonly target: NationId; readonly overt: boolean; readonly lastActedTurn: number }
    | { readonly kind: "border-incident"; readonly id: string; readonly parties: readonly [NationId, NationId]; readonly assessmentTurn: number; readonly finding: "likely-inadvertent" | "undetermined"; readonly confidence: "low" | "moderate" }
    | { readonly kind: "state-condition"; readonly id: string; readonly state: StateId; readonly condition: string; readonly severity: number }
    | { readonly kind: "governor-request"; readonly state: StateId; readonly signature: string; readonly expiresTurn: number; readonly condition?: string };
};

export type CollectionShare = {
  readonly id: string;
  readonly reportId: string;
  readonly recipient: NationId;
  readonly day: number;
  readonly date: GameDate;
  readonly report: CollectionProduct;
  /** Original finding indexes in the issued report; absent on legacy whole-report receipts. */
  readonly disclosedFindingIndexes?: readonly number[];
};

export type IntelligenceState = {
  readonly taskings: Readonly<Record<TaskingId, CollectionTasking>>;
  /**
   * The current product of each standing tasking, keyed by the tasking.
   *
   * One per requirement rather than an append-only stream: a standing
   * requirement's product is the community's current answer to the question,
   * and a save that kept every month of every tasking for two terms would grow
   * without anything ever reading the old ones.
   */
  readonly products: Readonly<Record<TaskingId, CollectionProduct>>;
  readonly archive?: readonly CollectionProduct[];
  readonly shares?: readonly CollectionShare[];
  readonly refusals: readonly BoundaryRefusal[];
  readonly pressure: readonly PoliticizationRecord[];
  readonly referrals: readonly IgReferral[];
  readonly surveillanceIncident?: SurveillanceIncident;
  readonly agReferrals?: readonly AgReferral[];
};

export function foundingIntelligence(): IntelligenceState {
  return { taskings: {}, products: {}, archive: [], shares: [], refusals: [], pressure: [], referrals: [] };
}

// --- Reading the community -------------------------------------------------

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// An element with no institution behind it in the catalog — the five service
// elements — is not modeled as running badly. It is modeled as running at the
// department's own delivery, because that is what a service intelligence staff
// actually is: part of the department, rising and falling with it.
const UNMODELED_ELEMENT_FLOOR = 0.6;

/**
 * How good this element's product is right now, 0..1.
 *
 * Read off the institution rather than kept beside it, so a hollowed-out agency
 * writes worse intelligence by the same fact that makes it deliver policy
 * worse, and there is exactly one place to look when it does.
 */
export function elementCapability(campaign: Campaign, id: IcElementId): number {
  const def = icElement(id);
  if (!def) return 0;
  const runtime = def.institution ? campaign.institutions[def.institution] : undefined;
  const institutional = runtime ? runtime.implementationQuality : UNMODELED_ELEMENT_FLOOR;
  const national = campaign.nations[campaign.founding.nation]?.stats.security.intelCapability ?? 0.5;
  // The national capability is the collection the community has to work with
  // and the institution is what it does with it; neither alone is the product.
  return round3(clamp01(institutional * 0.65 + national * 0.35));
}

/** How far this element has been bent toward the administration's politics, 0..1. */
export function elementPoliticization(campaign: Campaign, id: IcElementId): number {
  const def = icElement(id);
  const runtime = def?.institution ? campaign.institutions[def.institution] : undefined;
  return runtime ? runtime.politicization : 0;
}

/** The community's aggregate standing, weighted by how much a judgment leans on each element. */
export function selectCommunityHealth(campaign: Campaign): number {
  let weighted = 0;
  let weight = 0;
  for (const def of IC_ELEMENTS) {
    weighted += elementCapability(campaign, def.id) * def.analyticWeight;
    weight += def.analyticWeight;
  }
  return weight === 0 ? 0 : round3(weighted / weight);
}

export function selectRefusals(campaign: Campaign): readonly BoundaryRefusal[] {
  return campaign.security.intelligence.refusals;
}

export function selectOpenReferrals(campaign: Campaign): readonly IgReferral[] {
  return campaign.security.intelligence.referrals.filter((referral) => referral.stage !== "closed");
}

export function selectAgReferrals(campaign: Campaign): readonly AgReferral[] {
  return campaign.security.intelligence.agReferrals ?? [];
}

export function selectStandingTaskings(campaign: Campaign): readonly CollectionTasking[] {
  return Object.values(campaign.security.intelligence.taskings)
    .filter((tasking) => tasking.closedDay === undefined)
    .sort((a, b) => a.openedDay - b.openedDay || a.id.localeCompare(b.id));
}

/** What standing collection has filed, most recent first. */
export function selectCollectionProducts(campaign: Campaign): readonly CollectionProduct[] {
  return [...(campaign.security.intelligence.archive ?? Object.values(campaign.security.intelligence.products))].sort(
    (a, b) => b.day - a.day || a.id.localeCompare(b.id),
  );
}

export function selectCollectionShares(campaign: Campaign): readonly CollectionShare[] {
  return campaign.security.intelligence.shares ?? [];
}

/** A recipient may use only the dated finding actually disclosed to it. */
function sharedDirectedWarning(campaign: Campaign, recipient: NationId, subject?: NationId, covertOnly = false): CollectionShare | undefined {
  const day = campaignDay(campaign);
  return selectCollectionShares(campaign).find((share) => {
    const report = share.report;
    return share.recipient === recipient && report.targetKind === "foreign-nation" &&
      (subject === undefined || report.target === subject) && report.target !== recipient &&
      report.status === "findings" && (report.confidence === "moderate" || report.confidence === "high") &&
      report.day <= share.day && share.day <= day && day - report.day < PRODUCT_CYCLE_DAYS &&
      report.findings?.some((finding) => finding.topic === "external-intent" && finding.asOfDay === report.day &&
        finding.basis?.kind === "pursuit" && (!covertOnly || !finding.basis.overt) && finding.basis.target === recipient) === true;
  });
}

/** A selected recipient's current, sourced warning about a covert pursuit aimed at it. */
export function sharedCovertThreat(campaign: Campaign, recipient: NationId, subject: NationId): CollectionShare | undefined {
  return sharedDirectedWarning(campaign, recipient, subject, true);
}

/** A dated disclosed warning aimed at this government, usable in its diplomatic assessment. */
export function sharedPressureWarning(campaign: Campaign, recipient: NationId): CollectionShare | undefined {
  return sharedDirectedWarning(campaign, recipient);
}

/** The current product of one standing tasking, if it has filed at all yet. */
export function productFor(campaign: Campaign, tasking: TaskingId): CollectionProduct | undefined {
  return campaign.security.intelligence.products[tasking];
}

/**
 * What is currently being collected against this country, by these elements.
 *
 * The one thing the analysis side reads out of the collection side. It matches
 * on the tasking's own target string, which is a nation id when the request was
 * pointed at a government, so a tasking written about a person or a theme
 * correctly firms up no country judgment.
 */
export function collectionAgainst(
  campaign: Campaign,
  target: string,
  elements: readonly IcElementId[],
): readonly CollectionProduct[] {
  return Object.entries(campaign.security.intelligence.products).filter(
    ([id, product]) => campaign.security.intelligence.taskings[id]?.closedDay === undefined &&
      product.targetKind === "foreign-nation" && product.target === target &&
      product.status === "findings" && campaignDay(campaign) - product.day < PRODUCT_CYCLE_DAYS &&
      elements.includes(product.element),
  ).map(([, product]) => product);
}


// What an attempted tasking costs the agency that had to write the memorandum,
// and what a matter reaching the Hill costs the administration. Both are
// written as absolute values because the institution writer takes the field it
// is given rather than a delta, and two callers adding to the same dial from
// different weeks is how a pressure reading ends up meaning nothing.
export const REFUSAL_OVERSIGHT_RISE = 0.08;
const REFERRAL_DISPOSITION_COST = 0.06;
const REFERRAL_STANDING_COST = -0.02;

function oversightRise(campaign: Campaign, institution: string | undefined, rise: number): readonly Effect[] {
  if (!institution) return [];
  const runtime = campaign.institutions[institution];
  if (!runtime) return [];
  return [
    {
      kind: "institution",
      institution,
      changes: { oversightPressure: round3(clamp01(runtime.oversightPressure + rise)) },
    },
  ];
}

/**
 * What it costs when a matter the White House would rather have kept inside
 * reaches the committees on somebody else's clock.
 *
 * Priced like an unauthorized use of force, and for the same reason: the Hill
 * does not punish a president for having intelligence problems, it punishes
 * one for being the last to tell them.
 */
function committeeCost(campaign: Campaign, matters: number): readonly Effect[] {
  return [
    {
      kind: "congress",
      set: {
        ...campaign.congress,
        disposition: round3(clamp01(campaign.congress.disposition - REFERRAL_DISPOSITION_COST * matters)),
      },
    },
    { kind: "metric", deltas: { standing: REFERRAL_STANDING_COST * matters } },
  ];
}

// --- The boundary ----------------------------------------------------------

export type TaskingRequest = {
  readonly element: IcElementId;
  readonly discipline: Discipline;
  readonly targetKind: TaskingTargetKind;
  readonly target: string;
  readonly question: string;
  readonly focus?: CollectionFocus;
  readonly note?: string;
  /** Required for the two person kinds, and ignored for every other. */
  readonly subject?: IntelSubject;
};

/**
 * Why nobody can carry this out, or nothing.
 *
 * Ordered so the answer a player gets is the most fundamental one: a request
 * aimed at American politics is refused before anyone asks whether the agency
 * does that discipline, because the second question would imply there is an
 * agency that does.
 */
export function boundaryRefusalReason(def: IcElementDef, request: TaskingRequest): string | undefined {
  const question = request.focus ? COLLECTION_FOCUS_QUESTIONS[request.focus] : request.question;
  if (request.targetKind === "domestic-politics") {
    return "No element of the intelligence community may be pointed at United States political processes, public opinion, policy or media. There is no agency that could take this.";
  }
  if (request.targetKind === "domestic-state") {
    if (def.id !== "IC-DHS" || request.discipline !== "osint") {
      return "Public analysis of a state's recorded conditions and requests belongs to DHS I&A using open sources. This desk cannot direct other collection inside the United States.";
    }
    if (question !== PUBLIC_STATE_QUESTION) {
      return "DHS I&A can answer only the public state conditions and governor requests question from this desk. It cannot investigate residents or domestic politics.";
    }
    return undefined;
  }
  if (request.targetKind === "domestic-person") return domesticPersonRefusal(def);
  if (request.targetKind === "foreign-person") {
    const lacking = foreignPersonRefusal(def, request);
    if (lacking) return lacking;
  }
  if (!def.disciplines.includes(request.discipline)) {
    return `${def.abbr} does not run ${request.discipline}. ${def.boundary}`;
  }
  if (def.collection === "overt-only" && request.targetKind !== "foreign-nation") {
    return `${def.abbr} collects overtly or from publicly available sources. It cannot be pointed at a person.`;
  }
  return undefined;
}

export type IntelligenceResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

const REFUSALS_BEFORE_REFERRAL = 2;

/**
 * Point an element at a question.
 *
 * A request outside the element's boundary is not rejected by this function —
 * it succeeds, and what succeeds is the refusal: a memorandum, a raised
 * oversight pressure, and, for the requests that are flatly unlawful or the
 * second one at the same agency, a matter somebody outside the executive
 * branch now knows about. Refusing here instead would let a player try
 * everything for free until something worked.
 */
export function taskCollection(campaign: Campaign, request: TaskingRequest): IntelligenceResult {
  const def = icElement(request.element);
  if (!def) return { ok: false, reason: "No such element of the intelligence community." };
  const question = request.focus ? COLLECTION_FOCUS_QUESTIONS[request.focus] : request.question;
  if (!question?.trim()) return { ok: false, reason: "A tasking has to ask something." };
  if (!request.target.trim() && !request.subject) return { ok: false, reason: "A tasking needs a target." };
  const personProblem = personRequestProblem(campaign, request);
  if (personProblem) return { ok: false, reason: personProblem };
  if (request.targetKind === "foreign-nation" && (!campaign.nations[request.target as NationId] || request.target === campaign.founding.nation)) {
    return { ok: false, reason: "Choose a foreign government on the board." };
  }
  if (request.targetKind === "domestic-state" && !campaign.states[request.target as StateId]) {
    return { ok: false, reason: "Choose a state on the board for public homeland analysis." };
  }
  if (request.targetKind === "foreign-nation" || request.targetKind === "domestic-state") {
    const focusProblem = collectionFocusUnavailable(request.discipline, request.focus, request.targetKind);
    if (focusProblem) return { ok: false, reason: focusProblem };
  }

  const day = campaignDay(campaign);
  if (campaign.security.intelligence.taskings[`tasking:${request.element}:${day}`] ||
    campaign.security.intelligence.refusals.some((entry) => entry.id === `refusal:${request.element}:${day}`)) {
    return { ok: false, reason: "This element has already received a tasking today." };
  }
  const refusal = boundaryRefusalReason(def, request);

  if (refusal) {
    const priorAtElement = campaign.security.intelligence.refusals.filter(
      (record) => record.element === request.element,
    ).length;
    const reportable = request.targetKind === "domestic-politics" || priorAtElement + 1 >= REFUSALS_BEFORE_REFERRAL;
    const record: BoundaryRefusal = {
      id: `refusal:${request.element}:${day}`,
      element: request.element,
      request: question,
      day,
      date: campaign.calendar,
      reason: refusal,
      reportable,
      ...(request.subject ? { subject: request.subject } : {}),
    };
    const referral: IgReferral | undefined = reportable
      ? {
          id: `referral:${request.element}:${day}`,
          subject: `A tasking of ${def.abbr} that its counsel would not carry.`,
          element: request.element,
          openedDay: day,
          openedDate: campaign.calendar,
          stage: "credibility",
          credible: true,
        }
      : undefined;

    return {
      ok: true,
      packet: {
        source: "action",
        actor: "player",
        turn: campaign.turn,
        provenance: {
          origin: "decision",
          entities: [request.element, ...(def.institution ? [def.institution] : [])],
          systems: ["intelligence"],
          visibility: "internal",
        },
        narration: {
          summary: `${def.abbr}'s general counsel declines the tasking: ${refusal}`,
        },
        effects: [
          { kind: "intelligence", refusal: record, ...(referral ? { referral } : {}) },
          ...oversightRise(campaign, def.institution, REFUSAL_OVERSIGHT_RISE),
        ],
      },
    };
  }

  const tasking: CollectionTasking = {
    id: `tasking:${request.element}:${day}`,
    element: request.element,
    discipline: request.discipline,
    targetKind: request.targetKind,
    target: request.subject?.personId ?? request.target,
    question,
    ...(request.subject ? { subject: request.subject } : {}),
    ...(request.focus ? { focus: request.focus } : {}),
    ...(request.note?.trim() ? { note: request.note.trim() } : {}),
    openedDay: day,
    openedDate: campaign.calendar,
    standing: true,
  };

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [request.element, request.subject?.personId ?? request.target],
        systems: ["intelligence"],
        visibility: "intelligence",
      },
      narration: { summary: `${def.abbr} is tasked: ${question}` },
      effects: [{ kind: "intelligence", tasking }],
    },
  };
}

export function collectionShareRefusal(campaign: Campaign, reportId: string, recipient: NationId): string | undefined {
  const report = selectCollectionProducts(campaign).find((entry) => entry.id === reportId);
  if (!report) return "No such issued report.";
  if (report.targetKind !== "foreign-nation" && report.targetKind !== "foreign-person") return "A domestic report cannot be shared with a foreign government.";
  const subjectBasis = report.subject?.basis;
  const targetGovernment = report.targetKind === "foreign-person" ? (subjectBasis?.kind === "pursuit" ? subjectBasis.actor : undefined) : report.target;
  if (!targetGovernment) return "This report names no government that can be excluded from receiving it.";
  if (!campaign.nations[recipient] || recipient === campaign.founding.nation) return "Choose a foreign recipient on the board.";
  if (recipient === targetGovernment) return "The target cannot receive this report through intelligence cooperation.";
  const relation = selectRelationship(campaign, campaign.founding.nation, recipient);
  if (!relation || (relation.trust < 0.4 && relation.treaties.length === 0)) return "There is no allied or trusted channel to this government.";
  return undefined;
}

export function shareCollectionReport(campaign: Campaign, reportId: string, recipients: readonly NationId[], findingIndexes?: readonly number[]): IntelligenceResult {
  if (recipients.length === 0 || new Set(recipients).size !== recipients.length) return { ok: false, reason: "Choose distinct recipients." };
  for (const recipient of recipients) {
    const reason = collectionShareRefusal(campaign, reportId, recipient);
    if (reason) return { ok: false, reason };
  }
  const report = selectCollectionProducts(campaign).find((entry) => entry.id === reportId)!;
  const findings = report.findings ?? [];
  if (findingIndexes !== undefined && (findingIndexes.length === 0 ||
    new Set(findingIndexes).size !== findingIndexes.length ||
    findingIndexes.some((index) => !Number.isInteger(index) || index < 0 || index >= findings.length))) {
    return { ok: false, reason: "Choose one or more distinct findings from this issued report." };
  }
  const requestedIndexes = findingIndexes === undefined ? findings.map((_, index) => index) : [...findingIndexes].sort((a, b) => a - b);
  // A partial disclosure cannot carry the report's full summary or gaps: either
  // could reveal facts the President chose to withhold. The recipient holds a
  // dated snapshot of exactly the findings sent, not a handle into the archive.
  const day = campaignDay(campaign);
  const effects: Effect[] = recipients.flatMap((recipient) => {
    const prior = selectCollectionShares(campaign).filter((share) => share.reportId === reportId && share.recipient === recipient);
    const held = new Set(prior.flatMap((share) => share.disclosedFindingIndexes ?? findings.map((_, index) => index)));
    const additions = requestedIndexes.filter((index) => !held.has(index));
    if (prior.length > 0 && additions.length === 0) return [];
    const snapshot = additions.length === findings.length ? report : {
      ...report, summary: "Selected findings from the issued report.", findings: additions.map((index) => findings[index]!), gaps: [],
    };
    return [{ kind: "intelligence" as const, share: { id: `share:${reportId}:${recipient}:${additions.join("-") || "no-result"}`,
      reportId, recipient, day, date: campaign.calendar, report: snapshot, disclosedFindingIndexes: additions } }];
  });
  return { ok: true, packet: { source: "action", actor: "player", turn: campaign.turn,
    provenance: { origin: "decision", entities: [report.target, ...recipients], systems: ["intelligence"], visibility: "intelligence" },
    narration: { summary: effects.length ? `New findings are shared with ${effects.length} selected government${effects.length === 1 ? "" : "s"}.` : "The selected governments already hold those findings." }, effects } };
}

/** Take an element off a question. */
export function closeTasking(campaign: Campaign, id: TaskingId): IntelligenceResult {
  const tasking = campaign.security.intelligence.taskings[id];
  if (!tasking) return { ok: false, reason: "No such tasking." };
  if (tasking.closedDay !== undefined) return { ok: false, reason: "That tasking is already closed." };
  const def = icElement(tasking.element);
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: { origin: "decision", confidence: "observed", entities: [tasking.element], systems: ["intelligence"], visibility: "intelligence" },
      narration: { summary: `${def?.abbr ?? tasking.element} is taken off the question.` },
      effects: [{ kind: "intelligence", closeTasking: { id, day: campaignDay(campaign) } }],
    },
  };
}

// --- The weekly tick -------------------------------------------------------

export const REFERRAL_CREDIBILITY_DAYS = 14;
export const REFERRAL_TRANSMIT_DAYS = 7;

/**
 * How often a standing requirement files.
 *
 * A month, not a week. Collection against a hard question is a cycle rather
 * than a feed, and a product every seven days would make the community's list
 * a scroll of identical rows nobody reads.
 */
export const PRODUCT_CYCLE_DAYS = 28;

/** Whether this requirement is due to file, which it is if it never has. */
function productDue(campaign: Campaign, tasking: CollectionTasking, day: number): boolean {
  const current = campaign.security.intelligence.products[tasking.id];
  return current === undefined || day - current.day >= PRODUCT_CYCLE_DAYS;
}

function fileProduct(campaign: Campaign, tasking: CollectionTasking, day: number): CollectionProduct {
  const weight = elementCapability(campaign, tasking.element);
  return draftCollectionProduct(campaign, tasking, day, weight);
}

/** The cycle's products, as one packet: a month of collection is one event. */
function collectionPackets(state: Campaign, day: number): readonly EffectPacket[] {
  const due = selectStandingTaskings(state).filter((tasking) => !subjectTaskingProblem(state, tasking) && productDue(state, tasking, day));
  if (due.length === 0) return [];
  const products = due.map((tasking) => fileProduct(state, tasking, day));
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      provenance: { origin: "institution", confidence: "assessed", systems: ["intelligence"], visibility: "intelligence" },
      narration: {
        summary:
          products.length === 1
            ? products[0]!.summary
            : `${products.length} standing requirements file against their questions.`,
      },
      effects: products.map((product) => ({ kind: "intelligence", product })),
    },
  ];
}

/**
 * The community's week: referrals move along their own clock, standing
 * requirements file, and a government that moved on the United States gets a
 * judgment written about it whether or not anybody asked for one.
 *
 * Referrals move whatever the administration does, which is the design point.
 * There is no lever here that slows one down, because the statute deliberately
 * routes it around the White House.
 */
export const intelligencePhase: TurnPhase = (state: Campaign) => {
  const day = campaignDay(state);
  return [
    ...referralPackets(state, day),
    ...subjectRevalidationPackets(state),
    ...collectionPackets(state, day),
    ...surveillancePackets(state, day),
    ...surveillanceCompliancePackets(state),
    ...unpromptedIntentPackets(state),
  ];
};

function referralPackets(state: Campaign, day: number): readonly EffectPacket[] {
  const advanced: { id: string; stage: ReferralStage; day: number }[] = [];

  for (const referral of state.security.intelligence.referrals) {
    if (referral.stage === "credibility" && day - referral.openedDay >= REFERRAL_CREDIBILITY_DAYS) {
      advanced.push({ id: referral.id, stage: "transmitted", day });
    } else if (
      referral.stage === "transmitted" &&
      referral.transmittedDay !== undefined &&
      day - referral.transmittedDay >= REFERRAL_TRANSMIT_DAYS
    ) {
      advanced.push({ id: referral.id, stage: "closed", day });
    }
  }

  if (advanced.length === 0) return [];

  const reaching = advanced.filter((entry) => entry.stage === "transmitted").length;
  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      provenance: { origin: "institution", confidence: "observed", systems: ["intelligence"], visibility: "internal" },
      narration: {
        summary:
          reaching > 0
            ? `${reaching} ${reaching === 1 ? "matter reaches" : "matters reach"} the intelligence committees.`
            : "The inspector general closes a matter.",
      },
      effects: [
        { kind: "intelligence", advanceReferrals: advanced },
        ...(reaching > 0 ? committeeCost(state, reaching) : []),
      ],
    },
  ];
}
