import { selectRelationship } from "./state.js";
import { campaignDay } from "./nomination.js";
import { IC_ELEMENTS, icElement } from "./ic-elements.js";
// Collection feeds analysis and analysis reads how well the collectors are
// running, so these two modules genuinely depend on each other. Every crossing
// in both directions is a call made at turn time rather than a value read while
// the module is being evaluated, which is what keeps the cycle inert.
import { draftCollectionProduct } from "./collection-report.js";
import { COLLECTION_FOCUS_QUESTIONS, collectionFocusUnavailable } from "./collection-focus.js";
import { domesticPersonRefusal, foreignPersonRefusal, personRequestProblem, subjectRevalidationPackets, subjectTaskingProblem } from "./intel-authority.js";
import { unpromptedIntentPackets } from "./intel-unprompted.js";
import { surveillanceCompliancePackets, surveillancePackets } from "./surveillance-incident.js";
export { IC_ELEMENTS, icElement };
export const PUBLIC_STATE_QUESTION = COLLECTION_FOCUS_QUESTIONS["domestic-public-conditions"];
export function foundingIntelligence() {
    return { taskings: {}, products: {}, archive: [], shares: [], refusals: [], pressure: [], referrals: [] };
}
// --- Reading the community -------------------------------------------------
function clamp01(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}
function round3(value) {
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
export function elementCapability(campaign, id) {
    const def = icElement(id);
    if (!def)
        return 0;
    const runtime = def.institution ? campaign.institutions[def.institution] : undefined;
    const institutional = runtime ? runtime.implementationQuality : UNMODELED_ELEMENT_FLOOR;
    const national = campaign.nations[campaign.founding.nation]?.stats.security.intelCapability ?? 0.5;
    // The national capability is the collection the community has to work with
    // and the institution is what it does with it; neither alone is the product.
    return round3(clamp01(institutional * 0.65 + national * 0.35));
}
/** How far this element has been bent toward the administration's politics, 0..1. */
export function elementPoliticization(campaign, id) {
    const def = icElement(id);
    const runtime = def?.institution ? campaign.institutions[def.institution] : undefined;
    return runtime ? runtime.politicization : 0;
}
/** The community's aggregate standing, weighted by how much a judgment leans on each element. */
export function selectCommunityHealth(campaign) {
    let weighted = 0;
    let weight = 0;
    for (const def of IC_ELEMENTS) {
        weighted += elementCapability(campaign, def.id) * def.analyticWeight;
        weight += def.analyticWeight;
    }
    return weight === 0 ? 0 : round3(weighted / weight);
}
export function selectRefusals(campaign) {
    return campaign.security.intelligence.refusals;
}
export function selectOpenReferrals(campaign) {
    return campaign.security.intelligence.referrals.filter((referral) => referral.stage !== "closed");
}
export function selectAgReferrals(campaign) {
    return campaign.security.intelligence.agReferrals ?? [];
}
export function selectStandingTaskings(campaign) {
    return Object.values(campaign.security.intelligence.taskings)
        .filter((tasking) => tasking.closedDay === undefined)
        .sort((a, b) => a.openedDay - b.openedDay || a.id.localeCompare(b.id));
}
/** What standing collection has filed, most recent first. */
export function selectCollectionProducts(campaign) {
    return [...(campaign.security.intelligence.archive ?? Object.values(campaign.security.intelligence.products))].sort((a, b) => b.day - a.day || a.id.localeCompare(b.id));
}
export function selectCollectionShares(campaign) {
    return campaign.security.intelligence.shares ?? [];
}
/** A recipient may use only the dated finding actually disclosed to it. */
function sharedDirectedWarning(campaign, recipient, subject, covertOnly = false) {
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
export function sharedCovertThreat(campaign, recipient, subject) {
    return sharedDirectedWarning(campaign, recipient, subject, true);
}
/** A dated disclosed warning aimed at this government, usable in its diplomatic assessment. */
export function sharedPressureWarning(campaign, recipient) {
    return sharedDirectedWarning(campaign, recipient);
}
/** The current product of one standing tasking, if it has filed at all yet. */
export function productFor(campaign, tasking) {
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
export function collectionAgainst(campaign, target, elements) {
    return Object.entries(campaign.security.intelligence.products).filter(([id, product]) => campaign.security.intelligence.taskings[id]?.closedDay === undefined &&
        product.targetKind === "foreign-nation" && product.target === target &&
        product.status === "findings" && campaignDay(campaign) - product.day < PRODUCT_CYCLE_DAYS &&
        elements.includes(product.element)).map(([, product]) => product);
}
// What an attempted tasking costs the agency that had to write the memorandum,
// and what a matter reaching the Hill costs the administration. Both are
// written as absolute values because the institution writer takes the field it
// is given rather than a delta, and two callers adding to the same dial from
// different weeks is how a pressure reading ends up meaning nothing.
export const REFUSAL_OVERSIGHT_RISE = 0.08;
const REFERRAL_DISPOSITION_COST = 0.06;
const REFERRAL_STANDING_COST = -0.02;
function oversightRise(campaign, institution, rise) {
    if (!institution)
        return [];
    const runtime = campaign.institutions[institution];
    if (!runtime)
        return [];
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
function committeeCost(campaign, matters) {
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
/**
 * Why nobody can carry this out, or nothing.
 *
 * Ordered so the answer a player gets is the most fundamental one: a request
 * aimed at American politics is refused before anyone asks whether the agency
 * does that discipline, because the second question would imply there is an
 * agency that does.
 */
export function boundaryRefusalReason(def, request) {
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
    if (request.targetKind === "domestic-person")
        return domesticPersonRefusal(def);
    if (request.targetKind === "foreign-person") {
        const lacking = foreignPersonRefusal(def, request);
        if (lacking)
            return lacking;
    }
    if (!def.disciplines.includes(request.discipline)) {
        return `${def.abbr} does not run ${request.discipline}. ${def.boundary}`;
    }
    if (def.collection === "overt-only" && request.targetKind !== "foreign-nation") {
        return `${def.abbr} collects overtly or from publicly available sources. It cannot be pointed at a person.`;
    }
    return undefined;
}
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
export function taskCollection(campaign, request) {
    const def = icElement(request.element);
    if (!def)
        return { ok: false, reason: "No such element of the intelligence community." };
    const question = request.focus ? COLLECTION_FOCUS_QUESTIONS[request.focus] : request.question;
    if (!question?.trim())
        return { ok: false, reason: "A tasking has to ask something." };
    if (!request.target.trim() && !request.subject)
        return { ok: false, reason: "A tasking needs a target." };
    const personProblem = personRequestProblem(campaign, request);
    if (personProblem)
        return { ok: false, reason: personProblem };
    if (request.targetKind === "foreign-nation" && (!campaign.nations[request.target] || request.target === campaign.founding.nation)) {
        return { ok: false, reason: "Choose a foreign government on the board." };
    }
    if (request.targetKind === "domestic-state" && !campaign.states[request.target]) {
        return { ok: false, reason: "Choose a state on the board for public homeland analysis." };
    }
    if (request.targetKind === "foreign-nation" || request.targetKind === "domestic-state") {
        const focusProblem = collectionFocusUnavailable(request.discipline, request.focus, request.targetKind);
        if (focusProblem)
            return { ok: false, reason: focusProblem };
    }
    const day = campaignDay(campaign);
    if (campaign.security.intelligence.taskings[`tasking:${request.element}:${day}`] ||
        campaign.security.intelligence.refusals.some((entry) => entry.id === `refusal:${request.element}:${day}`)) {
        return { ok: false, reason: "This element has already received a tasking today." };
    }
    const refusal = boundaryRefusalReason(def, request);
    if (refusal) {
        const priorAtElement = campaign.security.intelligence.refusals.filter((record) => record.element === request.element).length;
        const reportable = request.targetKind === "domestic-politics" || priorAtElement + 1 >= REFUSALS_BEFORE_REFERRAL;
        const record = {
            id: `refusal:${request.element}:${day}`,
            element: request.element,
            request: question,
            day,
            date: campaign.calendar,
            reason: refusal,
            reportable,
            ...(request.subject ? { subject: request.subject } : {}),
        };
        const referral = reportable
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
    const tasking = {
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
export function collectionShareRefusal(campaign, reportId, recipient) {
    const report = selectCollectionProducts(campaign).find((entry) => entry.id === reportId);
    if (!report)
        return "No such issued report.";
    if (report.targetKind !== "foreign-nation" && report.targetKind !== "foreign-person")
        return "A domestic report cannot be shared with a foreign government.";
    const subjectBasis = report.subject?.basis;
    const targetGovernment = report.targetKind === "foreign-person" ? (subjectBasis?.kind === "pursuit" ? subjectBasis.actor : undefined) : report.target;
    if (!targetGovernment)
        return "This report names no government that can be excluded from receiving it.";
    if (!campaign.nations[recipient] || recipient === campaign.founding.nation)
        return "Choose a foreign recipient on the board.";
    if (recipient === targetGovernment)
        return "The target cannot receive this report through intelligence cooperation.";
    const relation = selectRelationship(campaign, campaign.founding.nation, recipient);
    if (!relation || (relation.trust < 0.4 && relation.treaties.length === 0))
        return "There is no allied or trusted channel to this government.";
    return undefined;
}
export function shareCollectionReport(campaign, reportId, recipients, findingIndexes) {
    if (recipients.length === 0 || new Set(recipients).size !== recipients.length)
        return { ok: false, reason: "Choose distinct recipients." };
    for (const recipient of recipients) {
        const reason = collectionShareRefusal(campaign, reportId, recipient);
        if (reason)
            return { ok: false, reason };
    }
    const report = selectCollectionProducts(campaign).find((entry) => entry.id === reportId);
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
    const effects = recipients.flatMap((recipient) => {
        const prior = selectCollectionShares(campaign).filter((share) => share.reportId === reportId && share.recipient === recipient);
        const held = new Set(prior.flatMap((share) => share.disclosedFindingIndexes ?? findings.map((_, index) => index)));
        const additions = requestedIndexes.filter((index) => !held.has(index));
        if (prior.length > 0 && additions.length === 0)
            return [];
        const snapshot = additions.length === findings.length ? report : {
            ...report, summary: "Selected findings from the issued report.", findings: additions.map((index) => findings[index]), gaps: [],
        };
        return [{ kind: "intelligence", share: { id: `share:${reportId}:${recipient}:${additions.join("-") || "no-result"}`,
                    reportId, recipient, day, date: campaign.calendar, report: snapshot, disclosedFindingIndexes: additions } }];
    });
    return { ok: true, packet: { source: "action", actor: "player", turn: campaign.turn,
            provenance: { origin: "decision", entities: [report.target, ...recipients], systems: ["intelligence"], visibility: "intelligence" },
            narration: { summary: effects.length ? `New findings are shared with ${effects.length} selected government${effects.length === 1 ? "" : "s"}.` : "The selected governments already hold those findings." }, effects } };
}
/** Take an element off a question. */
export function closeTasking(campaign, id) {
    const tasking = campaign.security.intelligence.taskings[id];
    if (!tasking)
        return { ok: false, reason: "No such tasking." };
    if (tasking.closedDay !== undefined)
        return { ok: false, reason: "That tasking is already closed." };
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
function productDue(campaign, tasking, day) {
    const current = campaign.security.intelligence.products[tasking.id];
    return current === undefined || day - current.day >= PRODUCT_CYCLE_DAYS;
}
function fileProduct(campaign, tasking, day) {
    const weight = elementCapability(campaign, tasking.element);
    return draftCollectionProduct(campaign, tasking, day, weight);
}
/** The cycle's products, as one packet: a month of collection is one event. */
function collectionPackets(state, day) {
    const due = selectStandingTaskings(state).filter((tasking) => !subjectTaskingProblem(state, tasking) && productDue(state, tasking, day));
    if (due.length === 0)
        return [];
    const products = due.map((tasking) => fileProduct(state, tasking, day));
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            provenance: { origin: "institution", confidence: "assessed", systems: ["intelligence"], visibility: "intelligence" },
            narration: {
                summary: products.length === 1
                    ? products[0].summary
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
export const intelligencePhase = (state) => {
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
function referralPackets(state, day) {
    const advanced = [];
    for (const referral of state.security.intelligence.referrals) {
        if (referral.stage === "credibility" && day - referral.openedDay >= REFERRAL_CREDIBILITY_DAYS) {
            advanced.push({ id: referral.id, stage: "transmitted", day });
        }
        else if (referral.stage === "transmitted" &&
            referral.transmittedDay !== undefined &&
            day - referral.transmittedDay >= REFERRAL_TRANSMIT_DAYS) {
            advanced.push({ id: referral.id, stage: "closed", day });
        }
    }
    if (advanced.length === 0)
        return [];
    const reaching = advanced.filter((entry) => entry.stage === "transmitted").length;
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn,
            provenance: { origin: "institution", confidence: "observed", systems: ["intelligence"], visibility: "internal" },
            narration: {
                summary: reaching > 0
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
