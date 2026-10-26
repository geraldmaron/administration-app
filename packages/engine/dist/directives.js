import { selectChairRunner } from "./appointments.js";
import { certifyOrder } from "./order-review.js";
import { stampOf } from "./willingness.js";
import { carryOutDirective, SLOW_WALK_SHARE } from "./execution.js";
import { institutionDef, institutionInProse, institutionOpening } from "./institutions.js";
import { INSPECTED_INSTITUTIONS } from "./oversight.js";
export function foundingDirectives() {
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
export function selectDirectives(campaign) {
    return Object.values(campaign.directives ?? {}).sort((a, b) => a.issuedTurn - b.issuedTurn || a.id.localeCompare(b.id));
}
export function directivesFor(campaign, institution) {
    return selectDirectives(campaign).filter((directive) => directive.institution === institution);
}
export function selectRefusedDirectives(campaign) {
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
const KIND_REQUIRES = {
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
export function directableKinds(institution) {
    const def = institutionDef(institution);
    if (!def)
        return [];
    return Object.keys(KIND_REQUIRES).filter((kind) => holdsFunction(def, kind));
}
function holdsFunction(def, kind) {
    const wanted = KIND_REQUIRES[kind];
    return (def.capabilities.some((capability) => wanted.includes(capability)) ||
        def.authorities.some((authority) => wanted.includes(authority)));
}
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
const STATUTORY_BARS = [
    {
        institutions: ["INST-IRS"],
        kinds: ["investigation", "targeting"],
        authority: "26 U.S.C. § 7217",
        reason: "The President may not request, directly or through any officer or employee of the Executive Office of the President, that the Internal Revenue Service conduct or terminate an audit or other investigation of any particular taxpayer. A request made in violation of this section is not to be carried out, and the Commissioner is required to report it.",
        signedBy: "The Chief Counsel, Internal Revenue Service",
    },
    {
        institutions: ["INST-FED"],
        kinds: ["monetary", "investigation", "targeting", "enforcement-posture", "sanctions-tempo"],
        authority: "the Federal Reserve Act, 12 U.S.C. §§ 241–242",
        reason: "The members of the Board of Governors are appointed to fourteen-year terms and may be removed only for cause. The Board determines monetary policy under its statutory mandate of maximum employment and stable prices, and takes no instruction from the President as to the policy rate, the timing of a decision, or the supervision of any particular institution.",
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
function independenceMemorandum(def) {
    const office = def.offices[0];
    const term = office?.termYears;
    return {
        authority: `the organic statute of the ${def.name}`,
        reason: `The ${def.name} is headed by officers appointed to ` +
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
export function directiveRefusal(def, kind) {
    const bar = STATUTORY_BARS.find((entry) => entry.institutions.includes(def.id) && entry.kinds.includes(kind));
    if (bar)
        return { authority: bar.authority, reason: bar.reason, signedBy: bar.signedBy };
    // Independence is the catch-all rather than the first test: a body can be
    // formally executive and still barred from this one instruction, which is
    // what the Internal Revenue Service is, and testing independence first would
    // have made it take the generic memorandum.
    if (isDirectionBarred(def))
        return independenceMemorandum(def);
    return undefined;
}
/**
 * Whether the body takes no direction on its function at all. Independence is
 * the structure (fixed terms, insulated delivery); direction is barred only
 * while the officer at the head is protected from removal. An executive-power
 * commission whose chair serves at the President's pleasure can be supervised
 * on policy, and an adjudicator or the Federal Reserve cannot.
 */
export function isDirectionBarred(def) {
    return def.independence === "independent" && def.offices[0]?.removal !== "at-will";
}
/** The memorandum as one paragraph, with the statutory reason unaltered inside it. */
export function refusalMemorandumText(directive) {
    const memorandum = directive.memorandum;
    if (!memorandum)
        return "";
    const def = institutionDef(directive.institution);
    return (`${memorandum.signedBy} declines the instruction concerning ${directive.subject}` +
        `${def ? ` at ${institutionInProse(def.name)}` : ""}. Authority: ${memorandum.authority}. ${memorandum.reason}`);
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
export const DIRECTIVE_KIND_WEIGHT = {
    targeting: 1.75,
    investigation: 1.25,
    monetary: 2,
    "sanctions-tempo": 1,
    "enforcement-posture": 0.65,
};
/** The rise a refusal of this instruction actually writes. `pressure` is the particular order; absent, the kind's own weight. */
export function directiveMove(kind, pressure) {
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
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/**
 * The body whose auditor would take this.
 *
 * A bureau does not have an inspector general of its own — its department's
 * auditor covers it — so a file about the Internal Revenue Service is opened at
 * the Treasury and a file about the Bureau is opened at Justice.
 */
export function inspectingBody(def) {
    let current = def;
    while (current) {
        if (INSPECTED_INSTITUTIONS.includes(current.id))
            return current.id;
        current = current.parent ? institutionDef(current.parent) : undefined;
    }
    return def.id;
}
function patternMatter(campaign, def) {
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
// --- Casework: the officer's judgment ----------------------------------------
const CASEWORK_KINDS = ["investigation", "targeting"];
/**
 * How far past ordinary supervision an instruction about a named matter sits,
 * on the scale the Attorney General's order review already uses. Nothing
 * entitles the President to a prosecution, so even opening a file sits near
 * the bar. A commission's named matters are decided by the commission's own
 * vote, so no such instruction is offered to one.
 */
const CASEWORK_REACH = { investigation: 0.4, targeting: 0.7 };
/** Each casework instruction already given at the same body is one more entry on the record the officer weighs. */
const CASEWORK_RECORD_STEP = 0.2;
function isJusticeBody(def) {
    return inspectingBody(def) === "INST-DOJ";
}
function cabinetRoleOver(def) {
    let current = def;
    while (current) {
        if (current.cabinetRole)
            return current.cabinetRole;
        current = current.parent ? institutionDef(current.parent) : undefined;
    }
    return undefined;
}
/** The Attorney General, or whoever is acting in the chair, over any body in the Department. */
function judgingOfficer(campaign, def) {
    const role = cabinetRoleOver(def);
    return role ? selectChairRunner(campaign, role) : undefined;
}
/**
 * Whether the officer over a body will take a named-matter instruction.
 *
 * A DOJ instruction used to be refused as if a statute barred it. What exists
 * is a norm and the Attorney General's own judgment of it, so the answer
 * comes from the person: the weighing is the one an order's legality review
 * uses, decided without a draw so the President reads it before asking. An
 * Attorney General who carries the instruction opens a file, and a grand jury
 * and the courts decide what follows; the President is entitled to no outcome.
 */
function caseworkJudgment(campaign, def, request) {
    if (request.kind !== "investigation" && request.kind !== "targeting")
        return undefined;
    const officer = isJusticeBody(def) ? judgingOfficer(campaign, def) : undefined;
    if (!officer)
        return undefined;
    const inspected = inspectingBody(def);
    const prior = selectDirectives(campaign).filter((entry) => CASEWORK_KINDS.includes(entry.kind) && inspectingBody(institutionDef(entry.institution) ?? def) === inspected).length;
    const input = {
        reach: CASEWORK_REACH[request.kind],
        accumulated: Math.min(1, CASEWORK_RECORD_STEP * prior),
        ground: "silent",
    };
    const willingness = certifyOrder(officer.base, input, true);
    return {
        objects: !willingness.acts,
        officer,
        decision: stampOf(willingness, officer.base.id, `directive:${def.id}:${request.kind}`, "public"),
    };
}
function declinedMemorandum(officer) {
    return {
        authority: "28 U.S.C. § 509 and the Department's standing policy on communications with the White House",
        reason: `${officer.base.name}, the Attorney General, reviewed the request and declined it. Whether to open, close or direct a case is a judgment the law places in the Department, ` +
            "no statute entitles the President to a particular investigation or prosecution, and the Attorney General does not take the instruction.",
        signedBy: "The Attorney General",
    };
}
function refusalEffects(campaign, def, directive) {
    const runtime = campaign.institutions[def.id];
    const priorRefusals = directivesFor(campaign, def.id).filter((entry) => entry.status === "refused").length;
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
        ...(opensMatter ? [{ kind: "oversight", matters: [patternMatter(campaign, def)] }] : []),
    ];
}
/**
 * What a lawful instruction comes to. The body decides first: a
 * semi-autonomous one or a hollowed-out one does not move whoever is asking.
 * Past that, the Secretary over it decides how fast, and one far enough behind
 * the President leaves it on the desk.
 */
function carriedStatus(campaign, def, subject) {
    const runtime = campaign.institutions[def.id];
    if (def.independence === "semi-autonomous" || runtime.implementationQuality < SLOW_WALK_QUALITY)
        return { status: "slow-walked" };
    const carry = carryOutDirective(campaign, def, subject);
    return { status: carry && carry.delayShare >= SLOW_WALK_SHARE ? "slow-walked" : "carried", ...(carry ? { carry } : {}) };
}
/**
 * What carrying a named-matter instruction does to the body that carried it:
 * the same bend and scrutiny a refusal writes, because a department that opens
 * a file at the White House's request is the thing an inspector general
 * describes as a pattern when it happens twice.
 */
function caseworkCarriedEffects(campaign, def, directive) {
    const runtime = campaign.institutions[def.id];
    const move = directiveMove(directive.kind, directive.pressure);
    const inspected = inspectingBody(def);
    const priorCarried = selectDirectives(campaign).filter((entry) => CASEWORK_KINDS.includes(entry.kind) && entry.status !== "refused" && inspectingBody(institutionDef(entry.institution) ?? def) === inspected).length;
    const matter = patternMatter(campaign, def);
    const opens = priorCarried + 1 === REFUSALS_BEFORE_MATTER && !campaign.oversight.matters.some((entry) => entry.id === matter.id);
    return [
        {
            kind: "institution",
            directives: [directive],
            institution: def.id,
            changes: {
                politicization: round3(clamp01(runtime.politicization + move.politicization)),
                oversightPressure: round3(clamp01(runtime.oversightPressure + move.oversight)),
            },
        },
        ...(opens ? [{ kind: "oversight", matters: [matter] }] : []),
    ];
}
function summary(def, directive) {
    if (directive.status === "refused")
        return refusalMemorandumText(directive);
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
export function issueDirective(campaign, request) {
    const def = institutionDef(request.institution);
    if (!def)
        return { ok: false, reason: "No such institution." };
    if (!campaign.institutions[def.id])
        return { ok: false, reason: `${institutionOpening(def.name)} is not standing in this campaign.` };
    if (!request.subject.trim())
        return { ok: false, reason: "A directive has to say what it is about." };
    if (!holdsFunction(def, request.kind)) {
        return { ok: false, reason: `${institutionOpening(def.name)} holds no such function. There is nobody there this could be addressed to.` };
    }
    const barred = directiveRefusal(def, request.kind);
    if (!barred && CASEWORK_KINDS.includes(request.kind) && isJusticeBody(def) && !judgingOfficer(campaign, def)) {
        return { ok: false, reason: "Nobody holds the Attorney General's authority right now, so there is no one at Justice to take or decline the instruction." };
    }
    const judged = barred ? undefined : caseworkJudgment(campaign, def, request);
    const memorandum = barred ?? (judged?.objects ? declinedMemorandum(judged.officer) : undefined);
    const carried = memorandum ? undefined : carriedStatus(campaign, def, `directive:${def.id}:${request.kind}`);
    const directive = {
        id: `directive:${def.id}:${request.kind}:${campaign.turn}${request.key ? `:${request.key}` : ""}`,
        institution: def.id,
        kind: request.kind,
        subject: request.subject.trim(),
        ...(request.pressure !== undefined ? { pressure: request.pressure } : {}),
        issuedTurn: campaign.turn,
        status: carried?.status ?? "refused",
        ...(memorandum ? { memorandum } : {}),
        ...(judged ? { judgment: judged.decision } : {}),
    };
    const decision = judged?.decision ?? carried?.carry?.decision;
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
                ...(decision ? { decision } : {}),
            },
            narration: { summary: summary(def, directive) },
            effects: directiveEffects(campaign, def, directive, memorandum !== undefined, judged !== undefined),
        },
    };
}
function directiveEffects(campaign, def, directive, refused, judged) {
    if (refused)
        return refusalEffects(campaign, def, directive);
    if (judged && directive.status === "carried")
        return caseworkCarriedEffects(campaign, def, directive);
    return [{ kind: "institution", directives: [directive] }];
}
