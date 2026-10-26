import { sideOf } from "./conflicts.js";
import { conflictsAsParty } from "./war-party.js";
import { selectAuthorizationAgainst, selectNation, } from "./state.js";
import { AUTHORIZATION_TERM_TURNS, CHAMBERS, carried, headOfGovernment, majorityOf, seatedOf, } from "./congress.js";
import { voteOn } from "./congress-votes.js";
import { apply } from "./effects.js";
import { addDays, compareDates } from "./clock.js";
import { confidenceFromEvidence, likelihoodFromUnitInterval } from "./assessments.js";
import { roleTitle } from "./naming.js";
/**
 * Asking Congress for the use of force.
 *
 * The whip arithmetic lives in congress.ts; this file is the issued-act
 * lifecycle around it: send the request, freeze the forecast, Continue brings
 * the floor vote on the due date. Ordinary play reads likelihood and
 * confidence, not the yeas — WhipCount appears only after both chambers act.
 */
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/** Days both chambers hold the request after it is filed. */
export const AUTHORIZATION_DELAY_DAYS = 3;
/**
 * How much a genuine threat is worth on the floor, on top of disposition.
 *
 * Congress authorizes force against a country that is threatening the United
 * States far more readily than against one that is not, whatever it thinks of
 * the president — which is the one route a badly-regarded administration still
 * has to a lawful war.
 */
const THREAT_APPEAL = 0.5;
/**
 * How much the Hill's fear of this government is worth on the floor. A war the
 * country is already fighting against it counts whether the country started it,
 * was attacked, or joined somebody else's; fighting on the same side does not.
 */
function threatAppeal(campaign, target) {
    const us = campaign.founding.nation;
    const towardPlayer = campaign.relationships[`${target}:${us}`];
    const atWar = conflictsAsParty(campaign, us).some((conflict) => {
        const theirs = sideOf(conflict, target);
        return theirs !== undefined && theirs !== sideOf(conflict, us);
    });
    const hostility = towardPlayer ? (towardPlayer.militaryThreat + towardPlayer.tension) / 2 : 0;
    return clamp01(hostility * THREAT_APPEAL + (atWar ? 0.2 : 0));
}
function authorizationTitle(campaign, target) {
    const name = selectNation(campaign, target)?.base.identity.name ?? target;
    return `Authorization for Use of Military Force Against ${name}`;
}
/**
 * Map both chambers' whip arithmetic onto a 0..1 reading without printing the
 * count. The harder chamber dominates: an AUMF needs both houses.
 */
function chanceFromVotes(votes) {
    const chances = votes.map((vote) => {
        if (vote.passed)
            return clamp01(0.62 + (vote.yeas - vote.required) / 80);
        return clamp01(0.45 - (vote.required - vote.yeas) / 80);
    });
    return Math.min(...chances);
}
function authorizationForecast(campaign, appeal, chance) {
    const disposition = Math.abs(campaign.congress.disposition - 0.5);
    const evidence = clamp01(0.3 + disposition * 0.4 + appeal * 0.25);
    const confidence = confidenceFromEvidence(evidence);
    return {
        likelihood: likelihoodFromUnitInterval(chance),
        confidence,
        confidenceBasis: confidence === "high"
            ? "Chamber mood and the threat reading give the whip a clear count."
            : confidence === "moderate"
                ? "The whip is working from disposition, the threat brief, and how this Hill usually answers a use-of-force ask."
                : "Little stable evidence about how both chambers answer this ask.",
        supporting: appeal > 0.25
            ? "A threat the country can see carries votes that standing alone would not."
            : "How the Hill is disposed toward this administration is the strongest available factor.",
        uncertainty: "Members can still move between the ask and the vote, and a missed whip is not a count the office can see in advance.",
        source: "Office of Legislative Affairs",
        asOf: campaign.calendar,
    };
}
/**
 * The whip count before the vote is held. Pure and seed-independent: the engine
 * still uses the exact arithmetic; ordinary play reads likelihood and
 * confidence instead of the yeas.
 */
export function projectForceAuthorization(campaign, target) {
    const appeal = threatAppeal(campaign, target);
    const votes = CHAMBERS.map((chamber) => voteOn(campaign, {
        chamber,
        appeal,
        required: majorityOf(seatedOf(campaign.congress, chamber)),
        // Nobody's measure, for the reason a treaty is not: the question is the
        // threat, which `threatAppeal` prices, and a chamber does not authorize
        // force for the President's party.
        stance: "neutral",
    }));
    const successChance = chanceFromVotes(votes);
    return {
        target,
        title: authorizationTitle(campaign, target),
        votes,
        wouldPass: carried(votes),
        successChance,
        forecast: authorizationForecast(campaign, appeal, successChance),
        reasoning: appeal > 0.25
            ? `Members who will not give this ${roleTitle(campaign.founding.leadRole)} anything will still vote for a war they believe is coming.`
            : "Absent a threat the country can see, the vote tracks how the Hill thinks of this administration.",
    };
}
function pendingAuthorizationAct(campaign, target) {
    return Object.values(campaign.issuedActs ?? {}).find((act) => act.kind === "authorization" &&
        act.target === target &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"));
}
function authorizationActId(target, campaign) {
    return `issued:aumf:${target}:${campaign.turn}:${campaign.calendar.year}-${campaign.calendar.month}-${campaign.calendar.day}`;
}
/**
 * Ask Congress. The floor has not voted; Continue brings the count on the due
 * date. Ordinary play freezes likelihood and confidence, not the yeas.
 */
export function issueForceAuthorization(campaign, target) {
    if (!selectNation(campaign, target))
        return { ok: false, reason: `No such nation: ${target}.` };
    if (selectAuthorizationAgainst(campaign, target)) {
        return { ok: false, reason: "Congress has already authorized force against that government." };
    }
    if (pendingAuthorizationAct(campaign, target)) {
        return { ok: false, reason: "That authorization is already before Congress." };
    }
    const projection = projectForceAuthorization(campaign, target);
    const dueDate = addDays(campaign.calendar, AUTHORIZATION_DELAY_DAYS);
    const act = {
        id: authorizationActId(target, campaign),
        kind: "authorization",
        status: "awaiting-response",
        target,
        title: projection.title,
        issuedTurn: campaign.turn,
        issuedDate: campaign.calendar,
        dueDate,
        chance: projection.successChance,
        forecast: { ...projection.forecast, asOf: campaign.calendar },
    };
    return {
        ok: true,
        projection,
        act,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: {
                summary: `${projection.title} goes to Congress. Both chambers answer in ${AUTHORIZATION_DELAY_DAYS} days.`,
            },
            effects: [{ kind: "issuedAct", set: act }],
            provenance: { origin: "decision", systems: ["congress"] },
        },
    };
}
function authorizationPacket(campaign, projection, act) {
    const authorization = {
        id: `aumf:${projection.target}:${campaign.turn}`,
        title: projection.title,
        target: projection.target,
        enactedTurn: campaign.turn,
        expiresTurn: campaign.turn + AUTHORIZATION_TERM_TURNS,
        vote: projection.votes,
    };
    const next = projection.wouldPass
        ? { ...campaign.congress, authorizations: [...campaign.congress.authorizations, authorization] }
        : // A refused president has been weakened by asking, which is the reason a
            // real one counts the votes before the resolution is filed.
            { ...campaign.congress, disposition: round3(clamp01(campaign.congress.disposition - 0.04)) };
    const voteLine = projection.votes.map((vote) => `${vote.chamber} ${vote.yeas}–${vote.nays}`).join("; ");
    const resolvedAct = act
        ? {
            ...act,
            status: "resolved",
            outcome: {
                landed: projection.wouldPass,
                account: projection.wouldPass
                    ? `Congress passes, ${voteLine}.`
                    : `Congress refuses, ${voteLine}.`,
            },
        }
        : undefined;
    const effects = [
        { kind: "congress", set: next },
        ...(resolvedAct ? [{ kind: "issuedAct", set: resolvedAct }] : []),
        ...(projection.wouldPass ? [] : [{ kind: "metric", deltas: { standing: -0.02 } }]),
    ];
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: {
                summary: projection.wouldPass
                    ? `Congress passes the ${projection.title}.`
                    : `Congress refuses the ${projection.title}, and ${headOfGovernment(campaign)} is left with the authority of the office and nothing more.`,
            },
            effects,
            provenance: act
                ? { origin: "scheduled", causeIds: [act.id], systems: ["congress"], effectiveDate: campaign.calendar }
                : { origin: "decision", systems: ["congress"] },
        },
    };
}
/** Resolve one issued force authorization whose due date has arrived. */
export function resolveIssuedAuthorization(campaign, id) {
    const act = campaign.issuedActs?.[id];
    if (!act || act.kind !== "authorization") {
        return { ok: false, reason: "That authorization is not outstanding before Congress." };
    }
    if (act.status === "resolved" || act.status === "reported" || act.status === "withdrawn" || act.status === "expired") {
        return { ok: false, reason: "That authorization has already closed." };
    }
    if (compareDates(campaign.calendar, act.dueDate) < 0) {
        return { ok: false, reason: "Congress has not voted yet." };
    }
    if (selectAuthorizationAgainst(campaign, act.target)) {
        const expired = { ...act, status: "expired" };
        return {
            ok: true,
            packet: {
                source: "simulate",
                actor: "world",
                turn: campaign.turn,
                narration: { summary: `${act.title} is no longer awaiting a vote.` },
                effects: [{ kind: "issuedAct", set: expired }],
            },
        };
    }
    // Live chamber at the due date — a Hill play between ask and vote can still
    // move the count. The frozen forecast stays on the act for the record.
    const projection = projectForceAuthorization(campaign, act.target);
    return authorizationPacket(campaign, projection, act);
}
export function dueIssuedAuthorizationActs(campaign) {
    return Object.values(campaign.issuedActs ?? {})
        .filter((act) => act.kind === "authorization" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress") &&
        compareDates(campaign.calendar, act.dueDate) >= 0)
        .sort((a, b) => a.id.localeCompare(b.id));
}
/** Every force authorization still waiting on Congress, whether or not it is due. */
export function outstandingIssuedAuthorizationActs(campaign) {
    return Object.values(campaign.issuedActs ?? {})
        .filter((act) => act.kind === "authorization" &&
        (act.status === "issued" || act.status === "awaiting-response" || act.status === "in-progress"))
        .sort((a, b) => compareDates(a.dueDate, b.dueDate) || a.id.localeCompare(b.id));
}
/**
 * Apply every force authorization that has come due.
 */
export function resolveDueAuthorizations(campaign) {
    const due = dueIssuedAuthorizationActs(campaign);
    const packets = [];
    let working = campaign;
    for (const act of due) {
        const result = resolveIssuedAuthorization(working, act.id);
        if (!result.ok)
            continue;
        packets.push(result.packet);
        working = apply(working, result.packet);
    }
    return { campaign: working, packets };
}
