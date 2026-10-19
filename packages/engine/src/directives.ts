import type { Campaign } from "./state.js";
import { carryOutDirective, SLOW_WALK_SHARE, type CarryOut } from "./execution.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { InstitutionDef, InstitutionId } from "./institutions.js";
import { institutionDef, institutionInProse, institutionOpening } from "./institutions.js";
import type { OversightMatter } from "./oversight.js";
import { INSPECTED_INSTITUTIONS } from "./oversight.js";

// What the President told a body to do, and what it did about being told.
//
// The executive branch already had capacity, a leader and a backlog. What it
// did not have was an instruction: `InstitutionRuntime.directives` was a list
// of sentences written by nobody and read by nobody, so the single most
// consequential fact in the American executive branch — that some bodies take
// direction and some do not — existed only as a word in a catalog.
//
// Three rules, and they are the intelligence community's rules generalized off
// one agency and onto the rest of the government.
//
// **A refusal is a missing executor, not a difficulty check.** When a president
// tells the IRS to audit a named person, nothing rolls against a hidden number.
// The instruction has nobody who could lawfully carry it out, and what comes
// back is a memorandum that prints the statute it rests on.
//
// **The asking is the event.** A refused directive is kept forever and costs
// the administration at the body it was pointed at. An instruction that could
// be retried until it stopped being logged would be a difficulty setting
// wearing a statute's clothes.
//
// **The contrast is the lesson.** The same function that refuses the Federal
// Reserve carries the EPA, because the EPA is an executive agency and the
// Federal Reserve is not. A player learns which is which by being told no by
// one of them and yes by the other, with the reason attached to each.

export type DirectiveId = string;

/**
 * What kind of thing the President is telling a body to do.
 *
 * Cut at the joint the statutes are cut at rather than by department. Directing
 * the general posture of enforcement is lawful nearly everywhere; pointing that
 * enforcement at a named party is barred nearly everywhere it matters, and the
 * two are one word apart in ordinary speech.
 */
export type DirectiveKind =
  /** Open, close or direct a case on a named subject. */
  | "investigation"
  /** Point an existing enforcement function at a named party. */
  | "targeting"
  /** How hard the body enforces what it already enforces, across the board. */
  | "enforcement-posture"
  /** The pace at which designations are made. */
  | "sanctions-tempo"
  /** The policy rate. */
  | "monetary";

/**
 * What became of the instruction.
 *
 * `slow-walked` is the honest middle and the common one: the body did not
 * refuse, it is simply not going to do this quickly, because it is
 * semi-autonomous or because it is not currently capable of much. Nothing in
 * the world moves for a slow-walked directive either, but no memorandum was
 * written and nobody outside the building has anything to read.
 */
export type DirectiveStatus = "carried" | "refused" | "slow-walked";

/**
 * The paper that comes back instead of the thing that was asked for.
 *
 * `reason` is printed unaltered wherever the memorandum is shown. It is the
 * whole of what makes a refusal legible rather than a shrug: the player is not
 * told the request failed, they are told which statute answers it and in what
 * words.
 */
export type RefusalMemorandum = {
  /** The authority the refusal rests on, as counsel cites it. */
  readonly authority: string;
  /** The statutory reason, in the words the memorandum uses. Never summarized. */
  readonly reason: string;
  /** Who signed it. */
  readonly signedBy: string;
};

export type Directive = {
  readonly id: DirectiveId;
  readonly institution: InstitutionId;
  readonly kind: DirectiveKind;
  /** Who or what the body was told to point at, in the words the record keeps. */
  readonly subject: string;
  /** How hard this order leaned. Absent on a directive issued before weights existed; the kind's own weight applies. */
  readonly pressure?: number;
  readonly issuedTurn: number;
  readonly status: DirectiveStatus;
  /** Present on a refusal and only on a refusal. */
  readonly memorandum?: RefusalMemorandum;
};

/** Keyed by id. Refused directives are kept forever, for the reason a refusal is. */
export type DirectiveStore = Readonly<Record<DirectiveId, Directive>>;

export function foundingDirectives(): DirectiveStore {
  return {};
}

// --- Reading ---------------------------------------------------------------

/**
 * Every instruction this administration has given, oldest first.
 *
 * Defaulted rather than required on the campaign, because an administration
 * that has never told anybody to do anything genuinely has no record — the same
 * reading `godMode` gets, and the reason the save step for this layer fills
 * nothing.
 */
export function selectDirectives(campaign: Campaign): readonly Directive[] {
  return Object.values(campaign.directives ?? {}).sort(
    (a, b) => a.issuedTurn - b.issuedTurn || a.id.localeCompare(b.id),
  );
}

export function directivesFor(campaign: Campaign, institution: InstitutionId): readonly Directive[] {
  return selectDirectives(campaign).filter((directive) => directive.institution === institution);
}

export function selectRefusedDirectives(campaign: Campaign): readonly Directive[] {
  return selectDirectives(campaign).filter((directive) => directive.status === "refused");
}

// --- What a body would have to already do for the instruction to mean anything

/**
 * The functions an instruction of each kind needs somebody to hold.
 *
 * Matched against the catalog's own capabilities and authorities rather than
 * listed per body, so an instruction to the Department of Education to change
 * the policy rate is not refused as unlawful — it is rejected as addressed to
 * nobody, which is a different and more honest answer.
 */
const KIND_REQUIRES: Readonly<Record<DirectiveKind, readonly string[]>> = {
  investigation: ["investigation", "federal-investigation", "prosecution", "audit", "fugitive-apprehension"],
  targeting: [
    "investigation",
    "federal-investigation",
    "prosecution",
    "audit",
    "fugitive-apprehension",
    "sanctions-designation",
    "immigration-enforcement",
  ],
  "enforcement-posture": [
    "enforcement",
    "investigation",
    "federal-investigation",
    "prosecution",
    "tax-administration",
    "immigration-enforcement",
    "border-control",
  ],
  "sanctions-tempo": ["sanctions", "sanctions-designation"],
  monetary: ["monetary-policy", "policy-rate"],
};

/**
 * The instructions this body holds a function for, in the order they are
 * offered.
 *
 * A screen offers these and nothing else. An instruction addressed to a body
 * that holds no such function is not refused by anybody — there is nobody there
 * it could be addressed to — so a control that can only ever come back with
 * that is a control drawn over an absence. Whether an instruction the body
 * could carry is one it may lawfully be given is a different question, and it
 * is answered after the fact, by the memorandum.
 */
export function directableKinds(institution: InstitutionId): readonly DirectiveKind[] {
  const def = institutionDef(institution);
  if (!def) return [];
  return (Object.keys(KIND_REQUIRES) as DirectiveKind[]).filter((kind) => holdsFunction(def, kind));
}

function holdsFunction(def: InstitutionDef, kind: DirectiveKind): boolean {
  const wanted = KIND_REQUIRES[kind];
  return (
    def.capabilities.some((capability) => wanted.includes(capability)) ||
    def.authorities.some((authority) => wanted.includes(authority))
  );
}

// --- The one refusal function ----------------------------------------------

type StatutoryBar = {
  readonly institutions: readonly InstitutionId[];
  readonly kinds: readonly DirectiveKind[];
  readonly authority: string;
  readonly reason: string;
  readonly signedBy: string;
};

/**
 * Why an instruction of this kind cannot be carried at this body.
 *
 * A table rather than a function per agency, and that is the design rather than
 * a convenience. The Bureau, the Service, the Board and the commissions all
 * refuse for the same structural reason — somebody other than the President was
 * given the decision by statute — and writing five refusal paths would have
 * meant five places for that fact to drift out of agreement, and five different
 * registers for the one thing the player is supposed to learn.
 */
const STATUTORY_BARS: readonly StatutoryBar[] = [
  {
    institutions: ["INST-DOJ", "INST-FBI", "INST-DEA", "INST-ATF", "INST-USMS"],
    kinds: ["investigation", "targeting"],
    authority: "28 U.S.C. § 509 and the Department's standing policy on communications with the White House",
    reason:
      "The functions of the Department of Justice are vested in the Attorney General. Communications between the White House and the Department about a pending or contemplated investigation or case are limited to the Attorney General and the Deputy Attorney General, and the Department does not open, close or direct a case at the request of the President.",
    signedBy: "The Office of Legal Counsel",
  },
  {
    institutions: ["INST-IRS"],
    kinds: ["investigation", "targeting"],
    authority: "26 U.S.C. § 7217",
    reason:
      "The President may not request, directly or through any officer or employee of the Executive Office of the President, that the Internal Revenue Service conduct or terminate an audit or other investigation of any particular taxpayer. A request made in violation of this section is not to be carried out, and the Commissioner is required to report it.",
    signedBy: "The Chief Counsel, Internal Revenue Service",
  },
  {
    institutions: ["INST-FED"],
    kinds: ["monetary", "investigation", "targeting", "enforcement-posture", "sanctions-tempo"],
    authority: "the Federal Reserve Act, 12 U.S.C. §§ 241–242",
    reason:
      "The members of the Board of Governors are appointed to fourteen-year terms and may be removed only for cause. The Board determines monetary policy under its statutory mandate of maximum employment and stable prices, and takes no instruction from the President as to the policy rate, the timing of a decision, or the supervision of any particular institution.",
    signedBy: "The General Counsel, Board of Governors of the Federal Reserve System",
  },
];

/**
 * The generic refusal an independent body writes, built from its own catalog
 * entry rather than authored per commission.
 *
 * Eight commissions with eight hand-written memoranda would be eight chances to
 * say the same thing eight ways. What makes them independent is one fact, and
 * it is a fact the catalog already carries: fixed terms, removal for cause.
 */
function independenceMemorandum(def: InstitutionDef): RefusalMemorandum {
  const office = def.offices[0];
  const term = office?.termYears;
  return {
    authority: `the organic statute of the ${def.name}`,
    reason:
      `The ${def.name} is headed by officers appointed to ` +
      (term ? `fixed ${term}-year terms` : "fixed statutory terms") +
      " and removable only for cause. It exercises its statutory functions on its own judgment and takes no direction from the President as to how, against whom, or how vigorously they are exercised.",
    signedBy: `The General Counsel, ${def.name}`,
  };
}

/**
 * The refusal, or nothing.
 *
 * The one function the whole layer turns on. It serves the Bureau, the Service,
 * the Board and every independent regulator, and a sixth family added to the
 * table is served by it too without a line changing here.
 */
export function directiveRefusal(def: InstitutionDef, kind: DirectiveKind): RefusalMemorandum | undefined {
  const bar = STATUTORY_BARS.find(
    (entry) => entry.institutions.includes(def.id) && entry.kinds.includes(kind),
  );
  if (bar) return { authority: bar.authority, reason: bar.reason, signedBy: bar.signedBy };
  // Independence is the catch-all rather than the first test: a body can be
  // formally executive and still barred from this one instruction, which is
  // exactly what the Department of Justice and the Internal Revenue Service
  // are, and testing independence first would have made both of them take it.
  if (def.independence === "independent") return independenceMemorandum(def);
  return undefined;
}

/** The memorandum as one paragraph, with the statutory reason unaltered inside it. */
export function refusalMemorandumText(directive: Directive): string {
  const memorandum = directive.memorandum;
  if (!memorandum) return "";
  const def = institutionDef(directive.institution);
  return (
    `${memorandum.signedBy} declines the instruction concerning ${directive.subject}` +
    `${def ? ` at ${institutionInProse(def.name)}` : ""}. Authority: ${memorandum.authority}. ${memorandum.reason}`
  );
}

// --- What a directive costs ------------------------------------------------

/**
 * What being leaned on does to the body that had to write the memorandum.
 *
 * Politicization rather than a dial of its own, and it is worth being plain
 * about why: politicization is already the branch's reading of how far a body
 * has been bent toward the administration's politics rather than its mandate,
 * it already drags implementation quality, and the inspectors general already
 * open audits off it. A refusal that raised a new counter instead would be a
 * consequence with nowhere to land.
 */
export const REFUSAL_POLITICIZATION_RISE = 0.06;

/** What it does to how closely the body is being watched. */
export const DIRECTIVE_OVERSIGHT_RISE = 0.08;

/**
 * How loud a kind of instruction is, against the base refusal cost.
 *
 * Pointing enforcement at a person, and telling the central bank where to set
 * the rate, are louder than changing how fast a body works. A held pace is
 * the quietest thing a president can still put on paper.
 */
export const DIRECTIVE_KIND_WEIGHT: Readonly<Record<DirectiveKind, number>> = {
  targeting: 1.75,
  investigation: 1.25,
  monetary: 2,
  "sanctions-tempo": 1,
  "enforcement-posture": 0.65,
};

/** The rise a refusal of this instruction actually writes. `pressure` is the particular order; absent, the kind's own weight. */
export function directiveMove(kind: DirectiveKind, pressure?: number): { readonly politicization: number; readonly oversight: number } {
  const scale = Math.min(2.5, Math.max(0.4, pressure ?? DIRECTIVE_KIND_WEIGHT[kind]));
  return {
    politicization: round3(REFUSAL_POLITICIZATION_RISE * scale),
    oversight: round3(DIRECTIVE_OVERSIGHT_RISE * scale),
  };
}

/**
 * How many refused instructions at one body before somebody opens a file.
 *
 * Two, and the second one is the point. A president who tries once and is told
 * no has done something a general counsel wrote down; a president who tries
 * twice at the same building has done something an inspector general can
 * describe as a pattern, which is the only word that makes it a matter.
 */
export const REFUSALS_BEFORE_MATTER = 2;

/**
 * A lawful directive still has to reach a body that will act on it.
 *
 * Below this, or at a body whose statute puts a norm between it and the
 * President, the instruction is recorded and not carried. The reading is the
 * branch's own delivery figure rather than a new one, so a hollowed-out agency
 * slow-walks the President for the same reason it delivers policy badly.
 */
export const SLOW_WALK_QUALITY = 0.6;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

/**
 * The body whose auditor would take this.
 *
 * A bureau does not have an inspector general of its own — its department's
 * auditor covers it — so a file about the Internal Revenue Service is opened at
 * the Treasury and a file about the Bureau is opened at Justice.
 */
export function inspectingBody(def: InstitutionDef): InstitutionId {
  let current: InstitutionDef | undefined = def;
  while (current) {
    if (INSPECTED_INSTITUTIONS.includes(current.id)) return current.id;
    current = current.parent ? institutionDef(current.parent) : undefined;
  }
  return def.id;
}

function patternMatter(campaign: Campaign, def: InstitutionDef): OversightMatter {
  const inspected = inspectingBody(def);
  const subject = `whether the White House has been directing casework at ${institutionInProse(def.name)}`;
  return {
    id: `matter:ig:${inspected}:directives:${campaign.turn}`,
    origin: { kind: "inspector-general", institution: inspected },
    // Pointed at the administration rather than at the agency that refused. The
    // agency did its job; what there is to look into is the asking.
    direction: "received",
    subject,
    openedTurn: campaign.turn,
    stage: "opened",
    public: false,
    obstructed: false,
    beats: [
      {
        turn: campaign.turn,
        description: `The inspector general opens a file on instructions ${institutionInProse(def.name)} has declined to carry.`,
      },
    ],
  };
}

// --- Issuing ---------------------------------------------------------------

export type DirectiveRequest = {
  readonly institution: InstitutionId;
  readonly kind: DirectiveKind;
  readonly subject: string;
  /** How hard this particular order leans. Absent, the kind's own weight. */
  readonly pressure?: number;
};

export type DirectiveResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

function refusalEffects(campaign: Campaign, def: InstitutionDef, directive: Directive): readonly Effect[] {
  const runtime = campaign.institutions[def.id]!;
  const priorRefusals = directivesFor(campaign, def.id).filter(
    (entry) => entry.status === "refused",
  ).length;
  const opensMatter = priorRefusals + 1 === REFUSALS_BEFORE_MATTER;
  return [
    {
      kind: "institution",
      directives: [directive],
      institution: def.id,
      changes: {
        politicization: round3(clamp01(runtime.politicization + directiveMove(directive.kind, directive.pressure).politicization)),
        oversightPressure: round3(clamp01(runtime.oversightPressure + directiveMove(directive.kind, directive.pressure).oversight)),
      },
    },
    ...(opensMatter ? [{ kind: "oversight" as const, matters: [patternMatter(campaign, def)] }] : []),
  ];
}

/**
 * What a lawful instruction comes to. The body decides first: a
 * semi-autonomous one or a hollowed-out one does not move whoever is asking.
 * Past that, the Secretary over it decides how fast, and one far enough behind
 * the President leaves it on the desk.
 */
function carriedStatus(campaign: Campaign, def: InstitutionDef, subject: string): { readonly status: DirectiveStatus; readonly carry?: CarryOut } {
  const runtime = campaign.institutions[def.id]!;
  if (def.independence === "semi-autonomous" || runtime.implementationQuality < SLOW_WALK_QUALITY) return { status: "slow-walked" };
  const carry = carryOutDirective(campaign, def, subject);
  return { status: carry && carry.delayShare >= SLOW_WALK_SHARE ? "slow-walked" : "carried", ...(carry ? { carry } : {}) };
}

function summary(def: InstitutionDef, directive: Directive): string {
  if (directive.status === "refused") return refusalMemorandumText(directive);
  if (directive.status === "slow-walked") {
    return `${institutionOpening(def.name)} acknowledges the instruction on ${directive.subject} and does not move on it.`;
  }
  return `${institutionOpening(def.name)} is directed on ${directive.subject}, and carries it.`;
}

/**
 * Tell a body to do something.
 *
 * A barred instruction is not rejected by this function. It succeeds, and what
 * succeeds is the refusal: a memorandum, a body that is now measurably more
 * politicized than it was, and — on the second one at the same building — a
 * file somebody outside this administration has opened on it. Rejecting here
 * would let a president try every agency for free until one of them said yes.
 */
export function issueDirective(campaign: Campaign, request: DirectiveRequest): DirectiveResult {
  const def = institutionDef(request.institution);
  if (!def) return { ok: false, reason: "No such institution." };
  if (!campaign.institutions[def.id]) return { ok: false, reason: `${institutionOpening(def.name)} is not standing in this campaign.` };
  if (!request.subject.trim()) return { ok: false, reason: "A directive has to say what it is about." };
  if (!holdsFunction(def, request.kind)) {
    return { ok: false, reason: `${institutionOpening(def.name)} holds no such function. There is nobody there this could be addressed to.` };
  }

  const memorandum = directiveRefusal(def, request.kind);
  const carried = memorandum ? undefined : carriedStatus(campaign, def, `directive:${def.id}:${request.kind}`);
  const directive: Directive = {
    id: `directive:${def.id}:${request.kind}:${campaign.turn}`,
    institution: def.id,
    kind: request.kind,
    subject: request.subject.trim(),
    ...(request.pressure !== undefined ? { pressure: request.pressure } : {}),
    issuedTurn: campaign.turn,
    status: carried?.status ?? "refused",
    ...(memorandum ? { memorandum } : {}),
  };

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [def.id],
        systems: ["institutions"],
        visibility: memorandum ? "internal" : "public",
        ...(carried?.carry ? { decision: carried.carry.decision } : {}),
      },
      narration: { summary: summary(def, directive) },
      effects: memorandum
        ? refusalEffects(campaign, def, directive)
        : [{ kind: "institution", directives: [directive] }],
    },
  };
}
