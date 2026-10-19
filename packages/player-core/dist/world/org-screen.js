import { describeCommitment, selectActiveConflicts, selectCompactCalls } from "@admin/engine";
import { organizationById } from "@admin/world";
import { boardStance, standingToward } from "./standing";
import { nationNameIn } from "./war-screen";
// An international body as a screen reads it: who sits in it, how those
// governments stand toward the United States, what the United States' own seat
// is, and what the President has promised in or toward it. A government the
// services cannot read is listed as unread and ranked last, never guessed.
const KIND_WORDS = {
    defense: "A defense alliance",
    economic: "An economic group",
    political: "A political group",
};
const TRADE_WORDS = {
    "customs-union": "A customs union. Members charge the same tariffs on goods from outside the group.",
    fta: "A free-trade area. Members don't charge tariffs on each other's goods.",
    none: "",
};
const STANCE_WORDS = {
    favorable: "Trusts you",
    neutral: "Neutral",
    caution: "Wary of you",
    adverse: "Hostile",
    unread: "Unread",
};
const STANCE_LEVEL = { favorable: 4, neutral: 3, caution: 2, adverse: 1, unread: 0 };
function memberships(campaign, nation) {
    const runtime = campaign.nations[nation];
    return runtime ? (runtime.memberships ?? runtime.base.memberships) : [];
}
/** The governments sitting in the body this week, as accessions and withdrawals have left its roster. */
export function orgMembersOf(campaign, org) {
    return Object.keys(campaign.nations).filter((nation) => memberships(campaign, nation).includes(org)).sort();
}
function readMember(campaign, nation, fighting) {
    const us = nation === campaign.founding.nation;
    const stance = us ? "favorable" : (boardStance(standingToward(campaign, nation)) ?? "unread");
    return {
        nation,
        name: nationNameIn(campaign, nation),
        us,
        stance,
        word: us ? "The United States" : STANCE_WORDS[stance],
        fraction: us ? 1 : STANCE_LEVEL[stance] / 4,
        atWar: fighting.has(nation),
    };
}
function alignmentOf(members) {
    const others = members.filter((member) => !member.us);
    const counts = { favorable: 0, neutral: 0, caution: 0, adverse: 0, unread: 0 };
    for (const member of others)
        counts[member.stance] += 1;
    const readable = others.length - counts.unread;
    const warm = readable === 0 ? 0 : (counts.favorable + counts.neutral) / readable;
    const word = readable === 0 ? "All of them are unread" : warm >= 0.75 ? "Broadly with you" : warm >= 0.4 ? "Divided" : "Mostly against you";
    return { counts, warm, readable, word };
}
function commitmentRows(campaign, org, members) {
    return Object.values(campaign.commitments)
        .filter((commitment) => commitment.actor === campaign.founding.nation && (commitment.status === "active" || commitment.status === "proposed" || commitment.status === "suspended"))
        .flatMap((commitment) => {
        const body = commitment.target.kind === "org" && commitment.target.id === org;
        const member = commitment.target.kind === "nation" && members.has(commitment.target.id);
        return body || member ? [{ id: commitment.id, line: describeCommitment(commitment, campaign), status: commitment.status, toward: body ? "body" : "member" }] : [];
    })
        .sort((a, b) => a.toward.localeCompare(b.toward) || a.line.localeCompare(b.line));
}
function usRoleLine(campaign, org, usMember, calls) {
    if (!usMember)
        return `The United States isn't a member of the ${org.name}.`;
    if (org.kind === "defense") {
        const open = calls.filter((call) => !call.answered).length;
        return open > 0 ? `A member. ${open === 1 ? "An ally has been attacked, and the alliance is waiting for the United States to respond." : `${open} allies have been attacked, and the alliance is waiting for the United States to respond.`}` : "A member. Every member has promised to defend the others.";
    }
    return org.kind === "economic" ? "A member, with a say in the trade rules the group sets." : "A member, with a voice at the group's meetings.";
}
/** One body's screen reading. Undefined for an id the dataset does not know. */
export function orgScreenReading(campaign, id) {
    const org = organizationById.get(id);
    if (!org)
        return undefined;
    const nations = orgMembersOf(campaign, id);
    const fighting = new Set(selectActiveConflicts(campaign).flatMap((conflict) => [conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender]));
    const members = nations
        .map((nation) => readMember(campaign, nation, fighting))
        .sort((a, b) => Number(b.us) - Number(a.us) || STANCE_LEVEL[b.stance] - STANCE_LEVEL[a.stance] || a.name.localeCompare(b.name));
    const calls = selectCompactCalls(campaign)
        .filter((call) => call.org === id)
        .map((call) => ({ conflict: call.conflict, ally: nationNameIn(campaign, call.ally), aggressor: nationNameIn(campaign, call.aggressor), answered: call.answered }));
    const usMember = nations.includes(campaign.founding.nation);
    const trade = org.tradeCompetence ? TRADE_WORDS[org.tradeCompetence] : "";
    return {
        id,
        name: org.name,
        kind: KIND_WORDS[org.kind],
        history: org.history,
        ...(trade ? { trade } : {}),
        ...(org.defenseScope ? { scope: org.defenseScope.kind === "parties-territory" ? "The promise covers attacks on the members' own land." : "The promise covers only a set area, not every place a member is attacked." } : {}),
        usMember,
        usRole: usRoleLine(campaign, org, usMember, calls),
        members,
        alignment: alignmentOf(members),
        commitments: commitmentRows(campaign, id, new Set(nations)),
        calls,
        set: nations.map((nation) => `nation:${nation}`).join("|"),
    };
}
