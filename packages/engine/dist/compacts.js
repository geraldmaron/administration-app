import { organizations } from "@admin/world";
import { blocsInPlay } from "./blocs.js";
import { sideOf } from "./conflicts.js";
import { markedFlags } from "./marked-flags.js";
import { selectActiveConflicts, selectNation, selectRelationship, } from "./state.js";
// What a compact obliges, and what it costs to be in one and do nothing.
//
// `blocs.ts` gave a compact two things it had never had: it can fracture, and
// the capitals frightened by the same state find each other. Both are things
// that happen *between other countries*. Neither of them ever put anything in
// front of the president, and neither ever asked them for anything — so from
// the seat, a treaty alliance and a summit club were still the same fact: a
// line in a dossier and a slightly different number in the opening board.
//
// The thing an alliance actually is, is a call. Someone the president is bound
// to is attacked, and the president either answers or does not, and the ones
// who were watching draw a conclusion either way. That is the whole mechanic
// here, and everything below is read off the live board rather than stored,
// for the same reason removal pressure is: a call is not an event that fired
// once, it is a description of what is currently true, and a stored copy would
// keep asking about a war that had already ended.
//
// Deliberately narrow. It models what a **defense** compact binds, because
// that is the kind whose obligation is unambiguous and whose registry entry
// already declares it. An economic bloc's obligation — a common external
// tariff, a shared position at a table — is a real thing and is not this, and
// writing it as the same mechanic would put a mutual-defense guarantee and a
// customs union back into one number, which is exactly what the `kind` field
// exists to prevent.
const orgById = new Map(organizations.map((org) => [org.id, org]));
/**
 * How long the president has before silence is an answer.
 *
 * Short, because it is. An alliance whose members take a season to decide
 * whether the treaty applies has already answered the question.
 */
export const CALL_GRACE_TURNS = 3;
/** What one week of an unanswered call costs with each member of the compact. */
const IGNORED_TRUST = 0.03;
const IGNORED_ALIGNMENT = 0.02;
/** What answering is worth with the members who were watching. */
const ANSWERED_TRUST = 0.04;
const ANSWERED_ALIGNMENT = 0.03;
/**
 * The rung at which an act counts as answering a call.
 *
 * A démarche is not an answer to an invasion. Anything from rung two up is
 * the president having done something the aggressor can feel; rung one is a
 * statement, and a compact that accepted a statement as an answer would be a
 * compact that binds nothing.
 */
export const ANSWERING_RUNG = 2;
/** The flag that stands while a compact has an open call on the president. */
export function compactCallFlag(org) {
    return `compact-call:${org}`;
}
/** The dated answer is banked per call, even when the same compact faces another war later. */
function compactAnswerFlag(call) {
    return `compact-answer:${call.org}:${call.conflict}:${call.ally}`;
}
function defenseCompactsOf(campaign, nation) {
    return (selectNation(campaign, nation)?.base.memberships ?? []).filter((org) => orgById.get(org)?.kind === "defense");
}
/**
 * Has the president done anything the aggressor can feel since the war opened?
 *
 * Read off the causal stamps rather than off a stored answer, which is the
 * first thing the deepened graph is load-bearing for. Every act the president
 * takes now names the country it was taken against, so the question "did the
 * United States do anything about Russia after the invasion" is a scan of the
 * ledger rather than a second record kept alongside it.
 *
 * A commitment is what settles the rung: `apply()` writes it onto the entry
 * from the packet, so an act's weight survives an authored aftermath that
 * replaced the sentence.
 */
export function answeredCall(campaign, aggressor, since, by = campaign.founding.nation) {
    if (by !== campaign.founding.nation)
        return answeredByGovernment(campaign, aggressor, since, by);
    return campaign.ledger.some((entry) => {
        if (entry.turn < since)
            return false;
        if (entry.actor !== "player")
            return false;
        const commitment = entry.commitment;
        if (commitment) {
            return commitment.target === aggressor && commitment.rung >= ANSWERING_RUNG;
        }
        // An act with no commitment on it is not statecraft against a country — a
        // policy enactment, a nomination — so it cannot be an answer. Reading the
        // causal entities alone here would count signing a trade deal with the
        // aggressor as honoring the treaty against them.
        return false;
    });
}
/**
 * Another member's answer, read the same way off the same ledger: an act of
 * its own at the answering rung against the aggressor, which its decision
 * stamp names it as taking, or forces in the field beside the ally. A member
 * that does neither has not answered, however it voted in a chamber.
 */
function answeredByGovernment(campaign, aggressor, since, by) {
    const fighting = selectActiveConflicts(campaign).some((conflict) => {
        const side = sideOf(conflict, by);
        return side !== undefined && side !== sideOf(conflict, aggressor) && sideOf(conflict, aggressor) !== undefined;
    });
    if (fighting)
        return true;
    return campaign.ledger.some((entry) => entry.turn >= since &&
        entry.causal?.decision?.actor === by &&
        entry.commitment?.target === aggressor &&
        entry.commitment.rung >= ANSWERING_RUNG);
}
/**
 * Every call currently standing on the president, oldest first.
 *
 * A call exists while an ally in a defense compact the president also sits in
 * is the defender in an active war. It is answered the moment the president
 * does something to the aggressor at rung two or above, and it stops existing
 * when the war does — including when the ally loses.
 */
export function selectCompactCalls(campaign) {
    const player = campaign.founding.nation;
    const mine = new Set(defenseCompactsOf(campaign, player).map((org) => org));
    if (mine.size === 0)
        return [];
    const blocs = blocsInPlay(campaign);
    const calls = [];
    for (const conflict of selectActiveConflicts(campaign)) {
        if (conflict.defender === player || conflict.aggressor === player)
            continue;
        for (const org of defenseCompactsOf(campaign, conflict.defender)) {
            if (!mine.has(org))
                continue;
            // A compact both belligerents sit in is a fracture, not a call: `blocs.ts`
            // already prices what that does to everyone watching, and asking the
            // president to attack one member on behalf of another would be asking
            // them to answer a treaty by breaking it.
            if (defenseCompactsOf(campaign, conflict.aggressor).some((theirs) => theirs === org))
                continue;
            const members = blocs.get(org) ?? [];
            // Fighting beside the ally is the plainest answer a compact can get, and a join carries no commitment for the ledger scan to find.
            const answered = sideOf(conflict, player) === "defender" || answeredCall(campaign, conflict.aggressor, conflict.startedTurn);
            const elapsed = campaign.turn - conflict.startedTurn;
            const watching = members.filter((id) => id !== player && id !== conflict.defender);
            calls.push({
                org,
                orgName: orgById.get(org)?.name ?? org,
                ally: conflict.defender,
                aggressor: conflict.aggressor,
                conflict: conflict.id,
                openedTurn: conflict.startedTurn,
                watching,
                unansweredTurns: answered ? 0 : Math.max(0, elapsed - CALL_GRACE_TURNS),
                answered,
                answeredBy: watching.filter((member) => answeredCall(campaign, conflict.aggressor, conflict.startedTurn, member)),
            });
        }
    }
    return calls.sort((a, b) => a.openedTurn - b.openedTurn || a.org.localeCompare(b.org));
}
/**
 * What the compact reads this week, from every member who is watching.
 *
 * Aimed at the whole compact rather than at the ally alone, which is the
 * difference between a treaty and a favor. The ally's own reading of the
 * president is already moved by whatever the president did or did not do to
 * the aggressor; what only a compact can do is make everyone *else* in it
 * revise what the paper is worth.
 */
function callEffects(campaign, call) {
    const player = campaign.founding.nation;
    const effects = [];
    const trust = call.answered ? ANSWERED_TRUST : -IGNORED_TRUST;
    const alignment = call.answered ? ANSWERED_ALIGNMENT : -IGNORED_ALIGNMENT;
    // Answering is banked once, the week it happens, not paid weekly for the
    // rest of the war; ignoring compounds, because every week of silence is a
    // fresh reading of the same paper.
    if (call.answered && (campaign.player.flags[compactAnswerFlag(call)] === true || campaign.turn - call.openedTurn > CALL_GRACE_TURNS + 1))
        return effects;
    if (!call.answered && call.unansweredTurns <= 0)
        return effects;
    for (const watcher of [call.ally, ...call.watching]) {
        if (!selectRelationship(campaign, watcher, player))
            continue;
        effects.push({ kind: "relationship", from: watcher, to: player, deltas: { trust, alignment } });
    }
    return effects;
}
function feedFor(call, turn) {
    return {
        turn,
        kind: "bloc",
        visibility: "public",
        headline: call.answered
            ? `${call.orgName} has its answer: the United States has moved against the aggressor.`
            : `${call.orgName} is asking publicly what the guarantee is worth.`,
        target: call.ally,
    };
}
/**
 * The compact's week.
 *
 * One packet, like the bloc phase it sits beside, and for the same reason: a
 * president with three treaty allies in three wars is living through one
 * situation, not three notices.
 */
export const compactPhase = (state) => {
    const turn = state.turn + 1;
    const calls = selectCompactCalls(state);
    const effects = [];
    const feed = [];
    const raise = [];
    const lower = [];
    const open = new Set();
    for (const call of calls) {
        effects.push(...callEffects(state, call));
        const flag = compactCallFlag(call.org);
        if (call.answered) {
            open.add(flag);
            if (state.player.flags[compactAnswerFlag(call)] !== true && state.turn - call.openedTurn <= CALL_GRACE_TURNS + 1) {
                raise.push(...markedFlags([compactAnswerFlag(call)], turn));
            }
            if (state.player.flags[flag] === true) {
                lower.push(flag);
                feed.push(feedFor(call, turn));
            }
            continue;
        }
        open.add(flag);
        if (state.player.flags[flag] !== true) {
            raise.push(flag);
            feed.push(feedFor(call, turn));
        }
    }
    // A call whose war has ended stops standing. Cleared here rather than left
    // to decay, because a flag that outlives its cause is content gating on a
    // world that no longer exists.
    for (const key of Object.keys(state.player.flags)) {
        if (!key.startsWith("compact-call:"))
            continue;
        if (state.player.flags[key] !== true)
            continue;
        if (!open.has(key) && !lower.includes(key))
            lower.push(key);
    }
    lower.push(...staleUsCalls(state));
    if (raise.length > 0 || lower.length > 0) {
        effects.push({
            kind: "flag",
            ...(raise.length > 0 ? { set: raise } : {}),
            ...(lower.length > 0 ? { clear: [...new Set(lower)] } : {}),
        });
    }
    if (effects.length === 0)
        return [];
    if (feed.length > 0)
        effects.push({ kind: "feed", items: feed });
    const standing = calls.filter((call) => !call.answered);
    return [
        {
            source: "simulate",
            actor: "world",
            turn,
            provenance: {
                origin: "world",
                entities: calls.map((call) => call.org),
                systems: ["compacts"],
            },
            narration: { summary: summarize(state, calls) },
            effects,
        },
    ].filter(() => standing.length > 0 || effects.length > 0);
};
function nameOf(campaign, id) {
    return selectNation(campaign, id)?.base.identity.name ?? id;
}
function summarize(campaign, calls) {
    const standing = calls.filter((call) => !call.answered && call.unansweredTurns > 0);
    const answered = calls.filter((call) => call.answered);
    if (standing.length > 0) {
        const first = standing[0];
        const weeks = first.unansweredTurns;
        return (`${first.orgName} has been waiting ${weeks === 1 ? "a week" : `${weeks} weeks`} for the United States to ` +
            `do something about ${nameOf(campaign, first.aggressor)}, and ${first.watching.length} other ` +
            `${first.watching.length === 1 ? "member is" : "members are"} watching what waiting means.`);
    }
    if (answered.length > 0) {
        const first = answered[0];
        return `${first.orgName} takes note that the United States moved when ${nameOf(campaign, first.ally)} was attacked.`;
    }
    return "A guarantee that had been in question is no longer being asked about.";
}
/** Exported for the tests and the dossier: what this compact binds its members to. */
export function compactKind(org) {
    return orgById.get(org)?.kind;
}
// --- What a shared body obliges in someone's war ---
//
// A customs union and a mutual-defense treaty are both "a body two countries
// share", and a join that read them as one fact put Ireland under Austria's
// guarantee. The kind is what separates them, and a defense body's own text
// says where its promise holds: a member attacked outside the treaty's area is
// still a member, and owes and is owed what any shared body carries, no more.
/** What a shared body weighs in a government's decision about a war: defense where it binds, any other shared body less, none nothing. */
export const OBLIGATION_WEIGHT = { defense: 1, shared: 0.4, none: 0 };
/** Whether a defense treaty's promise reaches a victim in this region. A body with no stated area binds wherever a party is attacked. */
export function defenseHolds(scope, victimRegion) {
    if (!scope || scope.kind === "parties-territory")
        return true;
    return (scope.area ?? []).some((region) => region === victimRegion);
}
/**
 * The obligation a set of shared bodies carries toward one partner in one war.
 *
 * `victimRegion` is given only when the partner is the war's victim: a
 * defense treaty obliges its members to defend one another, never to join one
 * another's attack, so the aggressor's partners get a shared body's weight
 * and no more.
 */
export function obligationWeight(bodies, victimRegion) {
    if (bodies.length === 0)
        return OBLIGATION_WEIGHT.none;
    const binds = victimRegion !== undefined && bodies.some((body) => body.kind === "defense" && defenseHolds(body.defenseScope, victimRegion));
    return binds ? OBLIGATION_WEIGHT.defense : OBLIGATION_WEIGHT.shared;
}
/** The bodies both membership lists hold, read from the registry. A body the registry does not know is left out. */
export function sharedBodies(memberships, other) {
    const theirs = new Set(other.map((id) => id));
    return memberships.flatMap((org) => {
        const body = orgById.get(org);
        return body && theirs.has(org) ? [body] : [];
    });
}
// --- The United States calling on its allies ---
//
// The call above runs one way: an ally is attacked and the President is
// asked. This is the other way, and the one the treaty was written for from
// Washington's side. Each member then answers on its own terms, weighed in
// the war's week with the obligation the call raised, so a refusal is a
// government's decision with its reasons rather than a roll.
/** The flag a call from the United States leaves, per body and per war, so a second war is a second call. */
export function usCallFlag(org, conflictId) {
    return `compact-called:${org}:${conflictId}`;
}
/** What calling costs at home: asking in public is admitting the country needs the help (planning value). */
const CALL_STANDING_COST = 0.01;
/**
 * The defense bodies the United States can call on, war by war: those it sits
 * in, in a war it fights on the defending side, that the aggressor does not
 * also sit in. A body both belligerents hold is a fracture, the same rule
 * `selectCompactCalls` applies the other way round.
 */
export function selectCallableCompacts(campaign) {
    const us = campaign.founding.nation;
    const mine = defenseCompactsOf(campaign, us);
    return selectActiveConflicts(campaign).flatMap((conflict) => {
        if (sideOf(conflict, us) !== "defender")
            return [];
        const theirs = new Set(defenseCompactsOf(campaign, conflict.aggressor).map((org) => org));
        return mine
            .filter((org) => !theirs.has(org))
            .map((org) => ({
            org,
            orgName: orgById.get(org)?.name ?? org,
            conflict: conflict.id,
            called: campaign.player.flags[usCallFlag(org, conflict.id)] === true,
        }));
    });
}
/** Every body the United States has called on for this war. */
export function calledCompactsIn(campaign, conflictId) {
    return defenseCompactsOf(campaign, campaign.founding.nation).filter((org) => campaign.player.flags[usCallFlag(org, conflictId)] === true);
}
/**
 * Call a defense body to answer. A priced act like any other: it costs a
 * little standing whatever comes of it, and what comes of it is each member's
 * own decision, taken in the war's next week.
 */
export function callCompact(campaign, org, conflictId) {
    const callable = selectCallableCompacts(campaign).find((entry) => entry.org === org && entry.conflict === conflictId);
    if (!callable)
        return { ok: false, reason: "That body is not one the United States can call on in this war." };
    if (callable.called)
        return { ok: false, reason: `${callable.orgName} has already been called on in this war.` };
    const conflict = campaign.conflicts[conflictId];
    const headline = `The United States calls on ${callable.orgName} to answer the attack by ${nameOf(campaign, conflict.aggressor)}.`;
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary: headline },
            provenance: { origin: "decision", entities: [org, conflictId], systems: ["compacts"], visibility: "public" },
            effects: [
                { kind: "flag", set: markedFlags([usCallFlag(org, conflictId)], campaign.turn) },
                { kind: "metric", deltas: { standing: -CALL_STANDING_COST } },
                { kind: "feed", items: [{ turn: campaign.turn, kind: "bloc", visibility: "public", headline, target: conflict.aggressor }] },
            ],
        },
    };
}
/** Calls whose war is over, cleared for the reason `compact-call:` flags are. */
function staleUsCalls(campaign) {
    return Object.keys(campaign.player.flags).filter((key) => {
        if (!key.startsWith("compact-called:") || campaign.player.flags[key] !== true)
            return false;
        const conflictId = key.slice(key.indexOf(":", "compact-called:".length) + 1);
        return campaign.conflicts[conflictId]?.status !== "active";
    });
}
