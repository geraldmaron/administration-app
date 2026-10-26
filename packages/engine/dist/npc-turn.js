import { FIDELITY_WEIGHT, liveTemperament } from "./temperament.js";
import { hasIntelOnNation, selectActivePursuits, selectNation, selectPursuitAgainst, } from "./state.js";
import { omniscientRead } from "./rules.js";
import { nationName, sentenceCase } from "./naming.js";
import { answerLine, wireLine, wireStake } from "./wire.js";
import { createRngStreams } from "./rng.js";
import { apply } from "./effects.js";
import { advancePursuit, closingHeadline, leadingAim, openPursuit, opensPursuit } from "./pursuits.js";
import { decideNpcAction, npcActStamp, npcEngagementStamp } from "./npc-agent.js";
import { engagementPacket } from "./engagement.js";
import { resolveAction } from "./resolution.js";
import { forceClaim, isActOfForce, isRegimeOperation, regimeClaim, straitClaims } from "./coercion-tempo.js";
import { tempoEffect } from "./npc-tempo.js";
import { responseBook, strongestIntent } from "./npc-response.js";
// The world acting on itself. Each turn a bounded set of nations takes the
// move its own agent chose, resolved by the same resolveAction() the player
// commits through — there is no NPC-only action path, so an NPC cannot do
// something the player could not, or pay less for it.
//
// Two nations pressing each other across turns is the point: failures leave
// grudges, grudges raise hostility, hostility raises the rung the agent
// picks, and grudge decay eventually lets it cool. The escalation is
// emergent, not scripted.
// How many nations may act in a single turn. The limit is legibility, not
// performance: a world where thirty capitals move at once reads as noise, and
// the player cannot follow a story they cannot see the shape of.
export const MAX_NPC_ACTIONS_PER_TURN = 3;
// The weight lives with the rest of a government's temperament now; the old
// name stays here so this file's arithmetic reads as it did.
const FIDELITY_INITIATIVE = FIDELITY_WEIGHT;
/**
 * How often a nation reaches for something in a week, 0..0.9. Opportunistic
 * and aggressive states reach more often, isolationist ones less, scaled by
 * how deeply the dataset knows the country.
 */
export function initiativeRate(campaign, actor) {
    const runtime = selectNation(campaign, actor);
    const temper = liveTemperament(campaign, actor);
    if (!runtime || !temper)
        return 0;
    const temperament = Math.max(0, Math.min(0.9, temper.opportunism * 0.5 + temper.aggression * 0.35 - temper.isolationism * 0.3));
    return temperament * FIDELITY_INITIATIVE[runtime.base.fidelity ?? "full"];
}
/**
 * How much more often a government acts in a week while it has something to
 * answer, at a full intent, and how far ahead of the draw that puts it.
 *
 * A capital just sanctioned has the most pressing reason on the board to act,
 * and under the temperament's rate alone China cleared the draw about one week
 * in three and then lost the week to a dozen others: one slot in eight weeks.
 * Both stay below the spread of the draw itself, as the campaign head start
 * does, so a government with an answer to give is likelier to be heard and is
 * never entitled to the week.
 */
const RESPONSE_INITIATIVE = 0.5;
const RESPONSE_PRIORITY = 0.5;
const MAX_INITIATIVE = 0.9;
// Whether a nation bothers this turn at all. The draw is per nation per turn,
// so adding a nation never changes when the others move.
function takesInitiative(campaign, actor, streams, intent) {
    const rate = Math.min(MAX_INITIATIVE, initiativeRate(campaign, actor) + RESPONSE_INITIATIVE * intent);
    return streams.stream("npc-initiative", actor, campaign.turn).next() < rate;
}
/**
 * How much of a head start a campaign already running buys its author in the
 * draw for the week.
 *
 * A government in the middle of something is the one with a reason to act. Under
 * a flat draw a capital got a week of its own about once a fortnight and a half,
 * which meant no program between two states could be pressed twice running, no
 * commitment ever accumulated, and nothing on the escalation ladder could climb
 * a rung — every campaign in the world lapsed for want of a turn. Set below the
 * spread of the draw itself, so a standing campaign makes a capital likelier to
 * be heard and never entitles it to the week.
 */
const CAMPAIGN_PRIORITY = 0.25;
/** The heaviest campaign each capital is currently carrying. */
function campaignPull(campaign) {
    const pull = new Map();
    for (const pursuit of selectActivePursuits(campaign)) {
        const actor = pursuit.actor;
        if (pursuit.commitment > (pull.get(actor) ?? 0))
            pull.set(actor, pursuit.commitment);
    }
    return pull;
}
// Who gets the week when more capitals want it than the cap allows.
//
// Order is a seeded per-nation draw, not the nation id. Sorting on the id was
// meant to make the cap fall the same way on every replay regardless of object
// iteration order, and it did — by building a permanent alphabetical queue.
// About thirteen governments clear the initiative draw in a given week against
// a cap of three, so every nation whose code sorts late was starved for the
// whole length of a campaign: Russia, Saudi Arabia, Turkey and Ukraine rolled
// initiative dozens of times each and were dropped every time. A draw keyed on
// (nation, turn) is exactly as replayable as the alphabet and does not decide
// in advance whose foreign policy the world is allowed to have.
export function npcActorsThisTurn(campaign, streams) {
    const player = campaign.founding.nation;
    const book = responseBook(campaign);
    const pull = campaignPull(campaign);
    return Object.keys(campaign.nations)
        .filter((id) => id !== player && takesInitiative(campaign, id, streams, strongestIntent(book, id)))
        .map((id) => ({
        id,
        order: streams.stream("npc-initiative-order", id, campaign.turn).next() -
            CAMPAIGN_PRIORITY * (pull.get(id) ?? 0) -
            RESPONSE_PRIORITY * strongestIntent(book, id),
    }))
        // The id is the tie-break rather than the sort: two identical draws still
        // have to order the same way on every replay.
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .slice(0, MAX_NPC_ACTIONS_PER_TURN)
        .map((entry) => entry.id);
}
// What the player finds out. An overt move between capitals is public. A
// covert one is invisible unless it was caught — either by the target, which
// makes it news, or by the player's own services outreading the actor's
// counter-intelligence.
export function feedVisibility(campaign, outcome) {
    if (!outcome.covert)
        return "public";
    if (outcome.exposed)
        return "public";
    // Omniscience reaches covert activity the same way it reaches a hidden
    // relationship: as an intelligence read the player did not have to earn, not
    // as public news. A god campaign should still be able to tell what the world
    // knows from what only it knows.
    if (omniscientRead(campaign))
        return "intelligence";
    // The same gate the country file opens on, so the wire and the dossier can
    // never disagree about which capital the services are inside.
    return hasIntelOnNation(campaign, outcome.actor) ? "intelligence" : undefined;
}
// The act as the wire desk has to say it: display names with the article a
// sentence needs, and the branch that fired rather than the branch the odds
// warned about.
export function wireActFor(campaign, result, turn) {
    const { request } = result.projection;
    const nameOf = (id) => {
        const identity = selectNation(campaign, id)?.base.identity;
        return identity ? nationName(identity) : id;
    };
    return {
        actor: nameOf(request.actor),
        target: nameOf(request.target),
        instrument: request.instrument,
        rung: request.rung,
        landed: result.success,
        ...(result.risk ? { riskId: result.risk.id } : {}),
        turn,
    };
}
/**
 * The bulletin for a move a government made because it said it would.
 *
 * A red line is a promise written in the government's own words, and the one
 * week it matters is the week it is kept. So the line the world reads names it
 * verbatim rather than reporting the act as one more tariff — a president who
 * is told "Iran answers the strike on its declared nuclear facilities" has been
 * told what the file on their desk told them would happen.
 */
function keptPromiseLine(campaign, chosen, act) {
    if (!chosen.answering)
        return undefined;
    const identity = selectNation(campaign, chosen.answering.holder)?.base.identity;
    const name = identity ? nationName(identity) : chosen.answering.holder;
    return `${name} answers what it said it would answer: ${chosen.answering.redLine.description} ${wireLine(act)}`;
}
/** The bulletin for a move made as an answer, naming what it answers. */
function answeringLine(campaign, chosen, act) {
    const intent = chosen.responding;
    if (!intent)
        return undefined;
    const name = (id) => {
        const identity = selectNation(campaign, id)?.base.identity;
        return identity ? nationName(identity) : id;
    };
    return answerLine({
        coercer: name(intent.toward),
        instrument: intent.answered.instrument,
        rung: intent.answered.rung,
        ...(intent.onBehalfOf ? { onBehalfOf: name(intent.onBehalfOf) } : {}),
    }, act);
}
function feedItemFor(campaign, result, chosen) {
    const { request } = result.projection;
    const covert = request.instrument === "covert";
    const exposed = result.packet.provenance?.visibility === "public";
    const visibility = feedVisibility(campaign, { covert, exposed, actor: request.actor });
    if (!visibility)
        return undefined;
    const act = wireActFor(campaign, result, campaign.turn + 1);
    return {
        // The turn loop stamps a phase's packets with the turn they open, so a
        // feed item written here carries the same turn the ledger entry beside it
        // will — the two are read together and must not disagree.
        turn: campaign.turn + 1,
        kind: "npc-action",
        visibility,
        // Not the resolver's own summary. That sentence is written out of the
        // catalogue — "United Arab Emirates attempts Tariff Increase against United
        // States" — and the feed is the one surface a player reads without asking
        // for it, so it has to read like a bulletin rather than like a row.
        headline: keptPromiseLine(campaign, chosen, act) ?? answeringLine(campaign, chosen, act) ?? wireLine(act),
        actor: request.actor,
        target: request.target,
        facts: actionFacts(result, act),
    };
}
function actionFacts(result, act) {
    return {
        // The catalogue name, because that is what the field is for and what the
        // record keys on; the article composer turns it into plain words itself.
        instrument: result.projection.rungName,
        stake: wireStake(act),
    };
}
/**
 * What this move did to the campaign it belongs to — opening one if the actor
 * had none against this target, carrying the existing one forward if it did.
 *
 * This is the only place a pursuit is created, and it is created out of a move
 * that was already made rather than planned in advance: a state does not
 * declare a campaign, it turns out to have been running one.
 */
function stepPursuit(campaign, result, turn) {
    const { request } = result.projection;
    const existing = selectPursuitAgainst(campaign, request.actor, request.target);
    const outcome = {
        success: result.success,
        rung: request.rung,
        instrument: request.instrument,
        summary: result.packet.narration.summary,
    };
    if (existing)
        return advancePursuit(existing, outcome, turn);
    if (!opensPursuit(request.instrument))
        return undefined;
    const runtime = selectNation(campaign, request.actor);
    const aim = runtime ? leadingAim(runtime) : undefined;
    // A nation with no classifiable aim is not running a campaign for anything.
    // It can still act; what it cannot do is sustain a program it has no reason
    // to have, and inventing one would put a motive on the board that the
    // dataset never authored.
    if (!aim)
        return undefined;
    return openPursuit(request.actor, request.target, aim, turn, request.instrument, request.rung, result.packet.narration.summary);
}
// One nation's whole turn: decide, resolve, and record what the player could
// have learned. Returns undefined when the nation held or had no move it was
// capable of making.
export function runNpcTurn(campaign, actor, streams) {
    return actOnChoice(campaign, decideNpcAction(campaign, actor, streams), streams);
}
function actOnChoice(campaign, decision, streams) {
    if (!decision.chosen)
        return undefined;
    const resolved = resolveAction(campaign, decision.chosen.request, streams, "simulate");
    if (!resolved.ok)
        return undefined;
    // The reason rides on the act's own provenance, taken on the actor's own
    // state before anything it did is applied, so the terms are the ones it
    // actually weighed.
    const stamp = npcActStamp(campaign, decision);
    const provenance = resolved.packet.provenance;
    const result = stamp && provenance ? { ...resolved, packet: { ...resolved.packet, provenance: { ...provenance, decision: stamp } } } : resolved;
    const feedItem = feedItemFor(campaign, result, decision.chosen);
    // The turn the packet lands on, matching the feed item beside it.
    const pursuit = stepPursuit(campaign, result, campaign.turn + 1);
    return { decision, result, ...(feedItem ? { feedItem } : {}), ...(pursuit ? { pursuit } : {}) };
}
/**
 * An engagement the government chose over every coercive move: made through
 * the same priced path the President's own call takes, and stamped with the
 * actor's reason for making it. The other side's reason for receiving it or
 * not is the packet's own and is replaced here, because the act of record is
 * the actor's.
 */
export function engagementTurn(campaign, decision, streams) {
    const engaged = decision.engaged;
    if (!engaged)
        return undefined;
    const made = engagementPacket(campaign, engaged.request, streams);
    if (!made.ok)
        return undefined;
    const stamp = npcEngagementStamp(decision);
    const provenance = made.packet.provenance;
    return stamp && provenance ? { ...made.packet, provenance: { ...provenance, decision: stamp } } : made.packet;
}
/** One government's week: the coercive move it chose, or the engagement it preferred, as the packet to apply. */
function actorPacket(campaign, actor, streams) {
    const decision = decideNpcAction(campaign, actor, streams);
    if (decision.engaged)
        return engagementTurn(campaign, decision, streams);
    const outcome = actOnChoice(campaign, decision, streams);
    if (!outcome)
        return undefined;
    const extra = [];
    const rationed = npcTempoRecord(campaign, outcome.result.projection.request, outcome.result.packet.effects);
    if (rationed)
        extra.push(rationed);
    if (outcome.pursuit)
        extra.push({ kind: "pursuit", set: outcome.pursuit });
    if (outcome.feedItem)
        extra.push({ kind: "feed", items: [outcome.feedItem] });
    const closing = outcome.pursuit && outcome.pursuit.status !== "active" ? closingFeedItem(campaign, outcome.pursuit) : undefined;
    if (closing)
        extra.push({ kind: "feed", items: [closing] });
    return extra.length > 0
        ? { ...outcome.result.packet, effects: [...outcome.result.packet.effects, ...extra] }
        : outcome.result.packet;
}
/**
 * What a made act spends of the world's tempo: every regime operation and every act of force spends one,
 * landed or not, and a war it opened spends a closure of each priced strait it
 * newly contests. Read against the board before the act lands.
 */
export function npcTempoRecord(campaign, request, effects) {
    if (isRegimeOperation(request))
        return tempoEffect(campaign, request.actor, [regimeClaim(campaign, request)]);
    if (!isActOfForce(request))
        return undefined;
    const opened = effects.some((effect) => effect.kind === "conflict" && effect.set.status === "active" && campaign.conflicts[effect.set.id]?.status !== "active");
    return tempoEffect(campaign, request.actor, [forceClaim(campaign, request), ...(opened ? straitClaims(campaign, request) : [])]);
}
// The turn phase. Each acting nation's packet is applied before the next
// nation decides, so a nation reacts to what happened earlier in the same
// turn rather than to a stale snapshot — which is what lets an exchange
// build inside a turn as well as across turns.
export const npcActionPhase = (state) => {
    const streams = createRngStreams(state.seed);
    const packets = [];
    let working = state;
    for (const actor of npcActorsThisTurn(state, streams)) {
        const packet = actorPacket(working, actor, streams);
        if (!packet)
            continue;
        packets.push(packet);
        working = apply(working, packet);
    }
    return packets;
};
// A campaign that just ended is worth naming on its own. The move that ended it
// already has a headline — "sanctions fail" — and that is a different fact from
// the campaign those sanctions were the fourth week of finally being dropped.
function closingFeedItem(campaign, pursuit) {
    if (!pursuit.overt)
        return undefined;
    const name = (id) => {
        const identity = selectNation(campaign, id)?.base.identity;
        return identity ? nationName(identity) : id;
    };
    const headline = closingHeadline(pursuit)
        .replace("{actor}", name(pursuit.actor))
        .replace("{target}", name(pursuit.target));
    return {
        turn: pursuit.closedTurn ?? campaign.turn + 1,
        kind: "pursuit",
        visibility: "public",
        headline: sentenceCase(headline),
        actor: pursuit.actor,
        target: pursuit.target,
    };
}
