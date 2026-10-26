import { selectActivePursuits } from "./state.js";
import { issueDirective } from "./directives.js";
import { elementCapability } from "./intelligence.js";
import { executiveOrder, projectOrder } from "./orders.js";
import { playerCharter } from "./locale-acts.js";
import { INSURRECTION_SEVERITY, liveLocaleMissions, unrestReaching } from "./locale-missions.js";
import { districtForumFor } from "./lower-bench.js";
import { markedFlags } from "./marked-flags.js";
import { createRngStreams } from "./rng.js";
import { turnsFor } from "./pace.js";
import { COURT_ORDER_KINDS, courtApplicationFlag, courtApplicationOutcome, courtApplications, courtOrderDecideTurn, courtOrderStatus, courtOrderTermWeeks, courtRulingFlag, recentlySurveilled, RENEWAL_WINDOW_WEEKS, } from "./court-order-records.js";
// Seeking a court order: the President asks, the Attorney General decides
// whether Justice files, and a court decides whether to grant it.
//
// The asking goes through `issueDirective` as an enforcement instruction to
// Justice about the disorder or the threat in one state, the same kind the
// investigative priority is: it names a matter, never a person, so it is not
// the casework the Attorney General weighs as a named-matter request. Justice
// can still slow-walk it, and only a carried instruction files; a carried one
// is the Attorney General's approval that no FISA application reaches the
// court without (50 U.S.C. §1805(a)(1)). The application keeps the odds the
// desk showed, and the court's answer is drawn against them on the court's own
// clock, the week it gives it.
//
// The odds read evidence the record holds: the FBI's capability, the strength
// of the kind's own predicate, a carried investigative priority on the state,
// and collection already run under an order there; and for the injunction, the
// district bench. FISA's anchor is the Foreign Intelligence Surveillance
// Court's own record: the Director of the Administrative Office's report for
// 2025 lists, for applications under §1805 alone or with §1824, 153 orders
// granted, 79 modified, 15 denied in part and 4 denied. Every other number
// here is a planning value.
/** §1805 dispositions in 2025 approved in whole or in part: (153 + 79 + 15) of 251. */
export const FISC_APPROVAL_2025 = 247 / 251;
/** Of those approved, the share the court modified or denied in part: (79 + 15) of 247. */
export const FISC_NARROWED_2025 = 94 / 247;
/** How much of the district bench's appointer mix reaches an injunction's odds, the same bounded assumption a challenge to an order uses. */
const BENCH_WEIGHT = 0.04;
/** The chance a sealed denial reaches the press, by kind. Planning values; an injunction is ruled on in open court. */
const LEAK_CHANCE = {
    "search-warrant": 0.1, "title-iii-order": 0.15, "fisa-order": 0.1, "injunction-enforcement": 1,
};
/** What a denial costs at home once it is known. A planning value. */
const DENIAL_STANDING = 0.01;
/** How hard each application leans on Justice, against the directive layer's weights. */
const APPLICATION_PRESSURE = {
    "search-warrant": 0.5, "title-iii-order": 0.8, "fisa-order": 0.8, "injunction-enforcement": 0.6,
};
const ENFORCEMENT_MISSIONS = new Set(["property-surge", "task-force", "immigration-operation"]);
/** The text after "This needs " for an application the record cannot support. */
export const COURT_ORDER_REFUSALS = {
    "fisa-order": "probable cause that the target is a foreign power or its agent (50 U.S.C. §1805(a)(2)). No United States person is one solely for activities the First Amendment protects, so protest or unrest alone never supplies it",
    "title-iii-order": "probable cause of an offense the wiretap statute lists, such as riot (18 U.S.C. §2516(1)(a), chapter 102): violent disorder here, not a protest",
    "search-warrant": "probable cause of a crime here to search for (Fed. R. Crim. P. 41(c), (d)(1)): unrest in the state",
    "injunction-enforcement": "federal law obstructed here: a federal law-enforcement mission in the state, still in force, meeting unrest the state has not ended (28 U.S.C. §1345)",
};
const round4 = (value) => Math.round(value * 10000) / 10000 + 0;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
/** The foreign government pressing the United States hardest, as a FISA predicate: a covert campaign reads stronger. */
function foreignPowerStrength(campaign) {
    const us = campaign.founding.nation;
    return Math.max(0, ...selectActivePursuits(campaign)
        .filter((pursuit) => pursuit.target === us && pursuit.actor !== us)
        .map((pursuit) => Math.min(1, pursuit.commitment + (pursuit.overt ? 0 : 0.2))));
}
/** The live federal law-enforcement mission in this state whose order the injunction would enforce, the strongest on the merits. */
function enforcedMission(campaign, state) {
    const charter = playerCharter(campaign);
    if (!charter)
        return undefined;
    return liveLocaleMissions(campaign, state)
        .filter((mission) => ENFORCEMENT_MISSIONS.has(mission.act) && mission.status === "operative" && mission.recordId)
        .flatMap((mission) => {
        const record = campaign.orders.find((entry) => entry.id === mission.recordId);
        const order = record && executiveOrder(record.order);
        return record && order ? [{ recordId: record.id, strength: round4(1 - projectOrder(campaign, charter, order, record.subject).meritsChance) }] : [];
    })
        .sort((a, b) => b.strength - a.strength)[0];
}
function predicateStrength(campaign, state, kind) {
    const severity = unrestReaching(campaign, state)?.severity ?? 0;
    if (kind === "fisa-order")
        return foreignPowerStrength(campaign);
    if (kind === "title-iii-order")
        return severity >= INSURRECTION_SEVERITY.request ? round4(severity) : 0;
    if (kind === "search-warrant")
        return severity > 0 ? round4(Math.min(1, severity * 1.5)) : 0;
    return severity > 0 ? enforcedMission(campaign, state)?.strength ?? 0 : 0;
}
export function courtOrderEvidence(campaign, state, kind) {
    const capability = elementCapability(campaign, "IC-FBI");
    const predicate = predicateStrength(campaign, state, kind);
    const priority = liveLocaleMissions(campaign, state).some((mission) => mission.act === "priority");
    const surveillance = recentlySurveilled(campaign, state);
    // A foreign-intelligence case rests on the counterintelligence record, not on a domestic priority or a wiretap.
    const score = kind === "fisa-order" ? 0.45 * capability + 0.55 * predicate
        : 0.35 * capability + 0.35 * predicate + (priority ? 0.15 : 0) + (surveillance ? 0.15 : 0);
    return { capability, predicate, priority, surveillance, score: round4(predicate > 0 ? score : 0) };
}
/** The district bench an injunction suit draws: its appointer mix, read toward or away from the administration. */
function injunctionBench(campaign, state) {
    const forum = districtForumFor(state, `court-application:injunction-enforcement:${state}:${campaign.turn}`, campaign.seed);
    const active = forum.activeRepublican + forum.activeDemocratic;
    const mix = active ? (forum.activeDemocratic - forum.activeRepublican) / active : 0;
    const anchor = campaign.congress.caucusAnchor;
    const toward = anchor === "democrat" ? mix : anchor === "republican" ? -mix : 0;
    return { court: forum.court, shift: round4(toward * BENCH_WEIGHT) };
}
function approvalAndNarrowing(kind, evidence, bench) {
    const e = evidence.score;
    if (kind === "fisa-order")
        return [FISC_APPROVAL_2025 * (0.6 + 0.4 * e), FISC_NARROWED_2025 + 0.25 * (1 - e)];
    if (kind === "title-iii-order")
        return [0.97 * (0.55 + 0.45 * e), 0.15 + 0.2 * (1 - e)];
    if (kind === "search-warrant")
        return [0.97 * (0.6 + 0.4 * e), 0.1 + 0.15 * (1 - e)];
    return [clamp(0.2 + 0.3 * evidence.predicate + 0.35 * e + bench, 0.1, 0.9), 0.35];
}
export function courtOrderOdds(kind, evidence, bench = 0) {
    if (evidence.predicate <= 0)
        return { granted: 0, narrowed: 0, denied: 1 };
    const [approval, narrowing] = approvalAndNarrowing(kind, evidence, bench);
    const granted = round4(approval * (1 - narrowing));
    const narrowed = round4(approval - granted);
    return { granted, narrowed, denied: round4(1 - granted - narrowed) };
}
/** Whether this application can go in this week: the predicate, then the record of earlier ones. */
function availability(campaign, state, kind, evidence) {
    if (!campaign.states[state])
        return { ok: false, missing: "a state the order would cover" };
    if (evidence.predicate <= 0)
        return { ok: false, missing: COURT_ORDER_REFUSALS[kind] };
    const last = courtOrderStatus(campaign, state, kind);
    if (last?.status === "pending")
        return { ok: false, missing: "the court's answer to the application already filed" };
    if (last?.status === "denied" && last.cooldownEndsTurn !== undefined && campaign.turn < last.cooldownEndsTurn)
        return { ok: false, missing: `a new showing: the court denied this application, and Justice will not file it again for ${last.cooldownEndsTurn - campaign.turn} more week${last.cooldownEndsTurn - campaign.turn === 1 ? "" : "s"}` };
    if ((last?.status === "granted" || last?.status === "narrowed") && last.termEndsTurn !== undefined
        && last.termEndsTurn - campaign.turn > RENEWAL_WINDOW_WEEKS)
        return { ok: false, missing: "the order already in force to near its end before it is renewed" };
    return { ok: true };
}
function directiveRequest(campaign, state, kind) {
    const def = COURT_ORDER_KINDS[kind];
    return { institution: "INST-DOJ", kind: "enforcement-posture", key: `court:${kind}:${state}`, pressure: APPLICATION_PRESSURE[kind],
        subject: `An application to ${def.court} for ${def.noun} covering ${campaign.states[state]?.base.name ?? state}` };
}
function directiveStatusOf(packet) {
    for (const effect of packet.effects) {
        if (effect.kind === "institution" && effect.directives?.length)
            return effect.directives[0].status;
    }
    return undefined;
}
/** Everything the desk shows before the application is made, out of the same reads the application takes. */
export function courtOrderProjection(campaign, state, kind) {
    const def = COURT_ORDER_KINDS[kind];
    const evidence = courtOrderEvidence(campaign, state, kind);
    const bench = kind === "injunction-enforcement" && campaign.states[state] ? injunctionBench(campaign, state) : undefined;
    const asked = campaign.states[state] ? issueDirective(campaign, directiveRequest(campaign, state, kind)) : undefined;
    const last = courtOrderStatus(campaign, state, kind);
    return {
        kind, def, state,
        availability: asked && !asked.ok ? { ok: false, missing: "an Attorney General in the chair to approve the application" } : availability(campaign, state, kind, evidence),
        evidence,
        ...(bench ? { bench } : {}),
        odds: courtOrderOdds(kind, evidence, bench?.shift ?? 0),
        decisionWeeks: { min: turnsFor(def.decisionDays.min), max: turnsFor(def.decisionDays.max) },
        termWeeks: courtOrderTermWeeks(kind),
        ...(asked?.ok && directiveStatusOf(asked.packet) ? { attorneyGeneral: directiveStatusOf(asked.packet) } : {}),
        renewal: last?.status === "granted" || last?.status === "narrowed",
    };
}
/**
 * Ask Justice to apply for a court order covering one state. Justice declining
 * or slow-walking the instruction is still an answer: the packet carries the
 * directive's record and nothing is filed.
 */
export function requestCourtOrder(campaign, state, kind) {
    const projection = courtOrderProjection(campaign, state, kind);
    if (!projection.availability.ok)
        return { ok: false, reason: `This needs ${projection.availability.missing}.` };
    const asked = issueDirective(campaign, directiveRequest(campaign, state, kind));
    if (!asked.ok)
        return { ok: false, reason: asked.reason };
    const filed = directiveStatusOf(asked.packet) === "carried";
    const def = projection.def;
    const name = campaign.states[state].base.name;
    const decideTurn = courtOrderDecideTurn(campaign, kind, state, campaign.turn);
    const flag = filed
        ? [{ kind: "flag", set: markedFlags([courtApplicationFlag(kind, state, projection.odds)], campaign.turn) }] : [];
    const weeks = decideTurn - campaign.turn;
    const summary = filed
        ? `Justice applies to ${def.court} for ${def.noun} covering ${name}; the court answers within ${weeks} week${weeks === 1 ? "" : "s"}.`
        : `${asked.packet.narration.summary} No application is filed.`;
    return { ok: true, filed, packet: { ...asked.packet, narration: { summary }, effects: [...asked.packet.effects, ...flag] } };
}
// --- The court's answer, on its own clock ---
function rulingHeadline(kind, outcome, name) {
    const def = COURT_ORDER_KINDS[kind];
    const court = def.court.charAt(0).toUpperCase() + def.court.slice(1);
    if (outcome === "granted")
        return `${court} grants Justice ${def.noun} covering ${name}.`;
    if (outcome === "narrowed")
        return `${court} grants Justice ${def.noun} covering ${name}, narrower than it asked.`;
    return `${court} refuses Justice ${def.noun} covering ${name}.`;
}
function rulingEffects(campaign, record) {
    const def = COURT_ORDER_KINDS[record.kind];
    const name = campaign.states[record.state]?.base.name ?? record.state;
    const outcome = courtApplicationOutcome(campaign, record);
    const known = outcome === "denied"
        && createRngStreams(campaign.seed).stream("court-order-leak", record.id).next() < LEAK_CHANCE[record.kind];
    const item = { turn: record.decideTurn, kind: "governance", visibility: def.public || known ? "public" : "intelligence",
        headline: rulingHeadline(record.kind, outcome, name),
        facts: { instrument: def.name, stake: def.authority.limit, topicTags: ["judiciary", ...(def.public ? [] : ["surveillance"])] } };
    const scandal = known && !def.public ? [`scandal:court-refused-${record.kind}-${record.state.toLowerCase()}`] : [];
    return [
        { kind: "flag", set: markedFlags([courtRulingFlag(record.kind, record.state, outcome), ...scandal], record.decideTurn) },
        { kind: "feed", items: [item] },
        ...(known ? [{ kind: "metric", deltas: { standing: -DENIAL_STANDING } }] : []),
    ];
}
/** Every application the court answers next week, drawn the week before so the answer lands with the week it is dated. */
export function courtOrderRulingEffects(campaign) {
    const next = campaign.turn + 1;
    return courtApplications(campaign)
        .filter((application) => application.decideTurn === next)
        .sort((a, b) => a.id.localeCompare(b.id))
        .flatMap((application) => rulingEffects(campaign, application));
}
