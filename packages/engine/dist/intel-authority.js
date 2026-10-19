import { selectActivePursuits } from "./state.js";
import { campaignDay } from "./nomination.js";
import { foreignLeaderFor } from "./foreign-leader.js";
import { applyIntelligence } from "./security-effects.js";
// A person-level request is only as good as the case that names the person.
//
// The collection desk used to accept any nonempty string as "a person", which
// implied an identity, a residence and a legal basis the engine never checked.
// A subject is now a person already on the campaign's registry, named by a case
// the engine itself opened from an incident: a foreign government's pursuit of
// the United States (its own leader) or a public inspector-general finding
// about a former or serving officer. Nobody is invented to fit a request and
// nobody becomes a subject because a player typed a name.
//
// Two rules follow. A foreign person can be tasked, but only through an element
// and discipline the authority manifest actually sources. A person in the United
// States cannot be tasked by the President at all: the most this desk can do is
// refer the matter to the Attorney General, who decides, and the referral
// carries no instruction.
/** How long a lead can be acted on after the desk read it; older than this is a stale snapshot. */
export const SUBJECT_FRESH_DAYS = 28;
/**
 * Every legal pathway this desk models, each tied to a source the repository
 * has fetched. A predicate with no entry here is refused, not approximated.
 */
export const INTEL_AUTHORITY = {
    "cia-human-sources-abroad": {
        source: "intelligence",
        cite: "50 U.S.C. §3036(d)(1), (3)",
        quote: "outside the United States through human sources",
    },
    "president-take-care": {
        source: "constitution",
        cite: "U.S. Const. art. II, §3",
        quote: "take Care that the Laws be faithfully executed",
    },
};
const lacksPerson = (kind) => kind !== "foreign-person" && kind !== "domestic-person";
function foreignLeads(campaign, day) {
    return selectActivePursuits(campaign).flatMap((pursuit) => {
        if (pursuit.target !== campaign.founding.nation || pursuit.actor === campaign.founding.nation)
            return [];
        const leader = foreignLeaderFor(campaign, pursuit.actor);
        const runtime = leader && campaign.people[leader.person];
        if (!leader || !runtime?.alive || runtime.base.nationality !== pursuit.actor)
            return [];
        const government = campaign.nations[pursuit.actor]?.base.identity.name ?? "A foreign government";
        return [{
                subject: { personId: leader.person, snapshotDay: day, basis: { kind: "pursuit", caseId: pursuit.id, actor: pursuit.actor, openedTurn: pursuit.openedTurn } },
                name: leader.name,
                jurisdiction: "foreign",
                headline: `${government} is pressing the United States, and ${leader.name} leads that government.`,
            }];
    });
}
function domesticLeads(campaign, day) {
    return campaign.oversight.matters.flatMap((matter) => {
        if (matter.origin.kind !== "inspector-general" || !matter.public || !matter.causeId)
            return [];
        if (matter.stage !== "gathering" && matter.stage !== "reported")
            return [];
        const graft = campaign.ledger.find((entry) => entry.causal?.eventId === matter.causeId)?.causal?.graft;
        const runtime = graft && campaign.people[graft.person];
        if (!graft || !runtime)
            return [];
        return [{
                subject: { personId: graft.person, snapshotDay: day, basis: { kind: "inspector-general-matter", caseId: matter.id, institution: matter.origin.institution, causeId: matter.causeId } },
                name: runtime.base.name,
                jurisdiction: "domestic",
                headline: `An inspector general has opened a public matter on contract steering involving ${runtime.base.name}.`,
            }];
    });
}
/** The people the engine currently has a case for, in a stable order. */
export function selectSubjectLeads(campaign) {
    const day = campaignDay(campaign);
    return [...foreignLeads(campaign, day), ...domesticLeads(campaign, day)]
        .sort((a, b) => a.subject.basis.caseId.localeCompare(b.subject.basis.caseId));
}
/**
 * Whether this subject is still what the engine says it is. `fresh` is the
 * opening test; an already-open tasking is held only to the case staying open.
 */
export function resolveSubject(campaign, subject, fresh) {
    const person = campaign.people[subject.personId];
    if (!person)
        return { ok: false, reason: "No such person is on record." };
    if (!person.alive)
        return { ok: false, reason: "That person is no longer living." };
    const lead = selectSubjectLeads(campaign).find((entry) => entry.subject.basis.caseId === subject.basis.caseId);
    if (!lead)
        return { ok: false, reason: "The case that named this person is closed or no longer current." };
    if (lead.subject.personId !== subject.personId || JSON.stringify(lead.subject.basis) !== JSON.stringify(subject.basis)) {
        return { ok: false, reason: "That person is not the subject of this case as it stands." };
    }
    const age = campaignDay(campaign) - subject.snapshotDay;
    if (fresh && (age < 0 || age >= SUBJECT_FRESH_DAYS))
        return { ok: false, reason: "This case was read too long ago to act on. Reopen it from the desk." };
    return { ok: true, lead };
}
/** Rejections that mean the request is malformed or stale, as opposed to unauthorized. */
export function personRequestProblem(campaign, request) {
    if (lacksPerson(request.targetKind))
        return undefined;
    if (!request.subject)
        return "A request about a person must name a person from an open case.";
    const resolved = resolveSubject(campaign, request.subject, true);
    if (!resolved.ok)
        return resolved.reason;
    const wanted = request.targetKind === "foreign-person" ? "foreign" : "domestic";
    if (resolved.lead.jurisdiction !== wanted)
        return "That person's case does not fall under the kind of request you chose.";
    if (request.targetKind === "foreign-person" && request.focus !== "external-intent") {
        return "Collection against a named foreign person answers one question: what the government they lead intends toward the United States.";
    }
    return undefined;
}
/** The sourced pathway for a foreign person, or the plain reason there is none. */
export function foreignPersonRefusal(def, request) {
    if (def.id === "IC-CIA" && request.discipline === "humint")
        return undefined;
    return `${def.abbr} has no sourced authority on this desk to collect against a named foreign person by ${request.discipline}. Only CIA human-source collection abroad is modeled (${INTEL_AUTHORITY["cia-human-sources-abroad"].cite}).`;
}
/** Why a person in the United States cannot be tasked from here, in the words of the element asked. */
export function domesticPersonRefusal(def) {
    if (def.domestic === "none")
        return `${def.abbr} has no internal security function inside the United States. ${def.boundary}`;
    if (def.domestic === "counterintelligence-under-ag") {
        return `${def.abbr} investigates under the Attorney General's guidelines and at the Attorney General's direction, not the President's. A request from this desk is not an instruction.`;
    }
    return `${def.abbr} does not take an instruction from this desk to investigate a person in the United States. The matter can be referred to the Attorney General, who decides.`;
}
/** Hand a domestic matter to the Attorney General. Nothing is directed and no investigation is opened by this record. */
export function referToAttorneyGeneral(campaign, subject) {
    const resolved = resolveSubject(campaign, subject, true);
    if (!resolved.ok)
        return { ok: false, reason: resolved.reason };
    if (resolved.lead.jurisdiction !== "domestic")
        return { ok: false, reason: "Only a matter inside the United States is referred to the Attorney General." };
    const id = `ag-referral:${subject.basis.caseId}:${subject.personId}`;
    if ((campaign.security.intelligence.agReferrals ?? []).some((entry) => entry.id === id)) {
        return { ok: false, reason: "This matter has already been referred to the Attorney General." };
    }
    const referral = { id, subject, day: campaignDay(campaign), authority: "president-take-care" };
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", entities: [subject.personId, ...(campaign.institutions["INST-DOJ"] ? ["INST-DOJ"] : [])], systems: ["intelligence"], visibility: "internal" },
            narration: { summary: `The matter concerning ${resolved.lead.name} is referred to the Attorney General, who decides whether to act. Nothing is directed.` },
            effects: [{ kind: "intelligence", agReferral: referral }],
        },
    };
}
/** Why an open tasking can no longer stand, or nothing if it still can. */
export function subjectTaskingProblem(campaign, tasking) {
    if (lacksPerson(tasking.targetKind))
        return undefined;
    if (!tasking.subject)
        return "It names no person from an open case; person-level tasking now requires one.";
    const resolved = resolveSubject(campaign, tasking.subject, false);
    return resolved.ok ? undefined : resolved.reason;
}
function staleSubjectTaskings(campaign) {
    return Object.values(campaign.security.intelligence.taskings).flatMap((tasking) => {
        if (tasking.closedDay !== undefined)
            return [];
        const reason = subjectTaskingProblem(campaign, tasking);
        return reason ? [{ id: tasking.id, reason }] : [];
    });
}
/** Closes, with the reason recorded, every open person-level tasking whose case no longer holds. Idempotent. */
export function withSubjectTaskingsRevalidated(campaign) {
    const day = campaignDay(campaign);
    return staleSubjectTaskings(campaign).reduce((state, entry) => applyIntelligence(state, { kind: "intelligence", closeTasking: { id: entry.id, day, reason: entry.reason } }), campaign);
}
/** The weekly form of the same check, so a case closing mid-campaign ends its tasking before it files again. */
export function subjectRevalidationPackets(campaign) {
    const stale = staleSubjectTaskings(campaign);
    if (stale.length === 0)
        return [];
    const day = campaignDay(campaign);
    return [{
            source: "simulate",
            actor: "world",
            turn: campaign.turn,
            provenance: { origin: "institution", confidence: "observed", systems: ["intelligence"], visibility: "intelligence" },
            narration: { summary: `${stale.length} person-level tasking${stale.length === 1 ? " is" : "s are"} closed because the case behind ${stale.length === 1 ? "it" : "them"} no longer holds.` },
            effects: stale.map((entry) => ({ kind: "intelligence", closeTasking: { id: entry.id, day, reason: entry.reason } })),
        }];
}
