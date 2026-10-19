import { ELECTION_CALENDAR, organizations } from "@admin/world";
import { hasIntelOnNation, selectActiveConflicts, selectNation, selectRelationship } from "./state.js";
import { createRngStreams } from "./rng.js";
import { createGrudge } from "./relationships.js";
import { liveTemperament } from "./temperament.js";
import { liveMemberships } from "./instrument-gates.js";
import { selectConflictBetween } from "./conflicts.js";
import { daysBetween } from "./clock.js";
import { stampOf } from "./willingness.js";
import { decideHostileAct, decideVote, eventPacket, filing, liveMembers, marker, onEdge } from "./world-events-filing.js";
import { nameOf } from "./war-entry.js";
import { admissionVoteTerms, dyadKindOf, firedRecently, hostileActTerms, sanctionVoteTerms, sourcedRivals, templateOf, withdrawalVoteTerms, } from "./world-event-templates.js";
import { aidPackets, warAidPackets } from "./world-events-aid.js";
import { borderIncidentAssessmentPackets, borderIncidentPackets, borderIncidentPairKey } from "./border-incidents.js";
// The world acting on itself: governments that are not the President's
// sanctioning as a bloc, deliberately clashing on a border, joining and leaving
// bodies, interfering in elections and sending help. Separate frontier hazards
// can reach the player's border without assigning either command the first shot.
// Government choices use willingness; hazards use their own seeded draw.
export { applyMembership } from "./world-effects.js";
// --- Sanctions package: a customs union acting as one ---
/** The share of a union's voting members that must agree. A planning value standing in for unanimity with room to abstain. */
const UNION_SUPERMAJORITY = 0.85;
/**
 * Who a bloc would sanction: a government a member holds a sourced rivalry
 * with, or one waging a war against a member or a member's neighbor. The one
 * the members read worst goes first.
 */
function sanctionTarget(campaign, members) {
    const inside = new Set(members);
    const neighbors = new Set(members.flatMap((m) => selectNation(campaign, m)?.base.geo.neighbors ?? []).map((id) => id));
    const candidates = new Set();
    for (const conflict of selectActiveConflicts(campaign)) {
        if (inside.has(conflict.defender) || neighbors.has(conflict.defender))
            candidates.add(conflict.aggressor);
    }
    for (const member of members) {
        for (const rival of sourcedRivals(member))
            candidates.add(rival);
    }
    const eligible = [...candidates].filter((id) => !inside.has(id) && id !== campaign.founding.nation).sort();
    const reading = (id) => meanTrust(campaign, members, id);
    return eligible.sort((a, b) => reading(a) - reading(b) || a.localeCompare(b))[0];
}
function meanTrust(campaign, from, to) {
    const edges = from.flatMap((id) => selectRelationship(campaign, id, to) ?? []);
    return edges.length === 0 ? 0 : edges.reduce((sum, edge) => sum + edge.trust, 0) / edges.length;
}
function sanctionVotes(campaign, org, members, subject, streams) {
    const { threshold } = templateOf("sanctions-package");
    return members.flatMap((member) => {
        const edge = selectRelationship(campaign, member, subject);
        const temper = liveTemperament(campaign, member);
        if (!edge || !temper)
            return [];
        const will = decideVote(streams, sanctionVoteTerms(temper, edge), threshold, [member, org.id, subject, "sanction"]);
        return [{ member, will }];
    });
}
const passes = (votes) => votes.length > 0 && votes.filter((vote) => vote.will.acts).length / votes.length >= UNION_SUPERMAJORITY;
function memberSanction(campaign, vote, subject, headline) {
    const line = `${nameOf(campaign, vote.member)} applied the bloc's sanctions to ${nameOf(campaign, subject)}.`;
    const effects = [
        { ...marker(campaign, "sanctions-package", vote.member, subject, line), deltas: { trust: -0.03, tension: 0.04 } },
        ...onEdge(campaign, { kind: "relationship", from: subject, to: vote.member, deltas: { trust: -0.03, tension: 0.05 } }),
        ...(headline ? [{ kind: "feed", items: [headline] }] : []),
    ];
    return eventPacket(campaign, line, effects, stampOf(vote.will, vote.member, subject, "public"), [vote.member, subject]);
}
function sanctionPackets(campaign, streams) {
    return organizations
        .filter((org) => org.tradeCompetence === "customs-union")
        .flatMap((org) => {
        const members = liveMembers(campaign, org.id);
        const subject = sanctionTarget(campaign, members);
        if (!subject || members.some((m) => firedRecently(selectRelationship(campaign, m, subject), "sanctions-package", campaign.turn)))
            return [];
        const votes = sanctionVotes(campaign, org, members, subject, streams);
        if (!passes(votes))
            return [];
        const agreed = votes.filter((vote) => vote.will.acts);
        const headline = filing(campaign, "sanctions-package", { actor: org.name, subject: nameOf(campaign, subject) }, { subject }, "public");
        return agreed.map((vote, index) => memberSanction(campaign, vote, subject, index === 0 ? headline : undefined));
    });
}
// --- Border clash: two rivals' garrisons ---
/** At most this many clashes a week, the likeliest first: a world where every rival border flares at once reads as noise. */
const MAX_CLASHES = 2;
function clashPairs(campaign, blocked) {
    const player = campaign.founding.nation;
    return Object.keys(campaign.nations)
        .filter((id) => id !== player)
        .flatMap((actor) => (selectNation(campaign, actor)?.base.geo.neighbors ?? []).flatMap((subject) => {
        const edge = selectRelationship(campaign, actor, subject);
        if (!edge || subject === player || blocked.has(borderIncidentPairKey(actor, subject)))
            return [];
        const kind = dyadKindOf(actor, subject);
        const sourced = kind === "hostile" || kind === "rivalrous";
        if (!sourced && !(edge.tension >= 0.6 && edge.trust <= -0.3))
            return [];
        if (selectConflictBetween(campaign, actor, subject))
            return [];
        const back = selectRelationship(campaign, subject, actor);
        if (firedRecently(edge, "border-clash", campaign.turn) || firedRecently(back, "border-clash", campaign.turn))
            return [];
        return [[actor, subject, edge]];
    }));
}
function clashEffects(campaign, actor, subject, line) {
    const vengefulness = selectNation(campaign, subject)?.traits.vengefulness ?? 0.5;
    return [
        { ...marker(campaign, "border-clash", actor, subject, line), deltas: { tension: 0.08, militaryThreat: 0.05 } },
        ...onEdge(campaign, {
            kind: "relationship",
            from: subject,
            to: actor,
            deltas: { tension: 0.1, trust: -0.05, militaryThreat: 0.08 },
            addGrudge: createGrudge("a clash on the border", 0.2, campaign.turn, vengefulness),
        }),
    ];
}
function clashPackets(campaign, streams, blocked) {
    const { threshold } = templateOf("border-clash");
    const fired = clashPairs(campaign, blocked).flatMap(([actor, subject, edge]) => {
        const temper = liveTemperament(campaign, actor);
        if (!temper)
            return [];
        const terms = hostileActTerms(temper, edge, dyadKindOf(actor, subject), true);
        const will = decideHostileAct(streams, terms, threshold, [actor, subject, "border-clash"]);
        return will.acts ? [{ actor, subject, will }] : [];
    });
    return [...fired]
        .sort((a, b) => b.will.margin - a.will.margin || `${a.actor}:${a.subject}`.localeCompare(`${b.actor}:${b.subject}`))
        .slice(0, MAX_CLASHES)
        .map(({ actor, subject, will }) => {
        const names = { actor: nameOf(campaign, actor), subject: nameOf(campaign, subject) };
        const item = filing(campaign, "border-clash", names, { actor, subject }, "public");
        const effects = [...clashEffects(campaign, actor, subject, item.headline), { kind: "feed", items: [item] }];
        return eventPacket(campaign, item.headline, effects, stampOf(will, actor, subject, "intelligence"), [actor, subject]);
    });
}
// --- Accession and withdrawal: a body considers its roster at its summit ---
/** Bodies meet about quarterly; an application is heard at a meeting, not any week. */
const SUMMIT_EVERY_WEEKS = 13;
/** How warm an outsider must read toward the members before it applies at all. Planning value. */
const APPLICANT_TRUST = 0.4;
/** How cold a member must have grown toward the others before leaving is on its agenda. Planning value. */
const LEAVER_TRUST = -0.05;
/** Bodies whose roster the world changes on its own. One the United States sits in admits nobody without the President, which is not modeled here. */
function openBodies(campaign) {
    return organizations.filter((org) => !liveMembers(campaign, org.id).includes(campaign.founding.nation) && org.members.length > 2);
}
function applicant(campaign, org, members) {
    const inside = new Set(members);
    const conflicting = new Set(org.conflictsWith);
    const near = new Set(members.flatMap((m) => selectNation(campaign, m)?.base.geo.neighbors ?? []).map((id) => id));
    const outsiders = [...near]
        .filter((id) => !inside.has(id) && id !== campaign.founding.nation && campaign.nations[id])
        .filter((id) => !liveMemberships(campaign, id).some((body) => conflicting.has(body)))
        .map((id) => ({ id: id, trust: meanTrustFrom(campaign, id, members) }))
        .filter((entry) => entry.trust >= APPLICANT_TRUST)
        .sort((a, b) => b.trust - a.trust || a.id.localeCompare(b.id));
    return outsiders[0]?.id;
}
function meanTrustFrom(campaign, from, to) {
    const edges = to.flatMap((id) => selectRelationship(campaign, from, id) ?? []);
    return edges.length < 2 ? -1 : edges.reduce((sum, edge) => sum + edge.trust, 0) / edges.length;
}
function admission(campaign, org, streams) {
    const members = liveMembers(campaign, org.id);
    const candidate = applicant(campaign, org, members);
    if (!candidate)
        return [];
    const { threshold } = templateOf("accession");
    const votes = members.flatMap((member) => {
        const edge = selectRelationship(campaign, member, candidate);
        const temper = liveTemperament(campaign, member);
        if (!edge || !temper)
            return [];
        return [{ member, will: decideVote(streams, admissionVoteTerms(temper, edge), threshold, [member, org.id, candidate, "admit"]) }];
    });
    if (!passes(votes))
        return [];
    const names = { actor: org.name, subject: nameOf(campaign, candidate) };
    const item = filing(campaign, "accession", names, { subject: candidate }, "public", campaign.turn % 2 === 0 ? 0 : 1);
    const lead = votes[0];
    const effects = [
        { kind: "membership", nation: candidate, org: org.id, change: "accede" },
        marker(campaign, "accession", candidate, lead.member, item.headline),
        { kind: "feed", items: [item] },
    ];
    // Each member's vote is its own decision of record, filed before the admission it made.
    const record = votes.map((vote) => eventPacket(campaign, `${nameOf(campaign, vote.member)} voted ${vote.will.acts ? "to admit" : "against admitting"} ${names.subject} to the ${org.name}.`, [], stampOf(vote.will, vote.member, candidate, "public"), [vote.member, candidate]));
    return [...record, eventPacket(campaign, item.headline, effects, stampOf(lead.will, lead.member, candidate, "public"), [candidate, org.id])];
}
function withdrawal(campaign, org, streams) {
    const members = liveMembers(campaign, org.id);
    const { threshold } = templateOf("accession");
    for (const member of members) {
        const others = members.filter((id) => id !== member);
        const trust = meanTrustFrom(campaign, member, others);
        const temper = liveTemperament(campaign, member);
        if (trust === -1 || trust > LEAVER_TRUST || !temper)
            continue;
        const trade = others.reduce((sum, id) => sum + (selectRelationship(campaign, member, id)?.tradeDependence ?? 0), 0);
        const will = decideVote(streams, withdrawalVoteTerms(temper, trust, trade), threshold, [member, org.id, "withdraw"]);
        if (!will.acts)
            continue;
        const item = filing(campaign, "accession", { actor: org.name, subject: nameOf(campaign, member) }, { subject: member }, "public", 2);
        const effects = [{ kind: "membership", nation: member, org: org.id, change: "withdraw" }, { kind: "feed", items: [item] }];
        return [eventPacket(campaign, item.headline, effects, stampOf(will, member, org.id, "public"), [member, org.id])];
    }
    return [];
}
function rosterPackets(campaign, streams) {
    if (campaign.turn % SUMMIT_EVERY_WEEKS !== 0)
        return [];
    return openBodies(campaign).flatMap((org) => [...admission(campaign, org, streams), ...withdrawal(campaign, org, streams)]);
}
// --- Election interference: a rival working a vote abroad ---
/** How far ahead of a vote a rival starts working it. */
const INTERFERENCE_WINDOW_DAYS = 56;
function nextVote(campaign, nation) {
    const seated = campaign.foreignPolitics?.seats[nation]?.next;
    if (seated)
        return seated;
    const row = ELECTION_CALENDAR.find((entry) => entry.nationId === nation);
    if (!row?.when || (row.precision !== "month" && row.precision !== "exact_date"))
        return undefined;
    return { year: row.when.year, month: row.when.month, day: row.when.day ?? 15 };
}
function votingSoon(campaign) {
    return Object.keys(campaign.nations).filter((id) => {
        if (id === campaign.founding.nation)
            return false;
        const date = nextVote(campaign, id);
        if (!date)
            return false;
        const days = daysBetween(campaign.calendar, date);
        return days >= 0 && days <= INTERFERENCE_WINDOW_DAYS;
    });
}
function interferers(campaign, target) {
    return sourcedRivals(target).filter((actor) => actor !== campaign.founding.nation && campaign.nations[actor] !== undefined);
}
function interferencePackets(campaign, streams) {
    const { threshold } = templateOf("election-interference");
    return votingSoon(campaign).flatMap((target) => {
        const acted = interferers(campaign, target).flatMap((actor) => {
            const edge = selectRelationship(campaign, actor, target);
            const temper = liveTemperament(campaign, actor);
            if (!edge || !temper || firedRecently(edge, "election-interference", campaign.turn))
                return [];
            const neighbors = selectNation(campaign, actor)?.base.geo.neighbors.includes(target) ?? false;
            const will = decideHostileAct(streams, hostileActTerms(temper, edge, dyadKindOf(actor, target), neighbors), threshold, [actor, target, "interfere"]);
            return will.acts ? [{ actor, will }] : [];
        });
        const first = acted[0];
        if (!first)
            return [];
        const names = { actor: nameOf(campaign, first.actor), subject: nameOf(campaign, target) };
        const item = filing(campaign, "election-interference", names, { actor: first.actor, subject: target }, "intelligence");
        const seen = hasIntelOnNation(campaign, first.actor);
        const effects = [
            marker(campaign, "election-interference", first.actor, target, item.headline),
            ...onEdge(campaign, { kind: "relationship", from: target, to: first.actor, deltas: { tension: 0.03 } }),
            ...(seen ? [{ kind: "feed", items: [item] }] : []),
        ];
        return [eventPacket(campaign, item.headline, effects, stampOf(first.will, first.actor, target, "intelligence"), [first.actor, target])];
    });
}
/**
 * The week's world events, on day 3 after the wars have moved. Each family
 * finds its occasions on the state the week opened this day with; the packets
 * are applied in order after the phase returns.
 */
export const worldEventPhase = (state) => {
    const streams = createRngStreams(state.seed);
    const incidents = borderIncidentPackets(state, streams);
    const blocked = new Set(incidents.flatMap((packet) => packet.effects.flatMap((effect) => effect.kind === "borderIncident" ? [borderIncidentPairKey(...effect.incident.parties)] : [])));
    return [
        ...sanctionPackets(state, streams),
        ...incidents,
        ...clashPackets(state, streams, blocked),
        ...borderIncidentAssessmentPackets(state, streams),
        ...rosterPackets(state, streams),
        ...interferencePackets(state, streams),
        ...aidPackets(state, streams),
        ...warAidPackets(state, streams),
    ];
};
