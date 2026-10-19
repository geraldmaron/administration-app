import { STATE_IDS } from "@admin/world";
import { hazardNoun } from "./condition-impacts.js";
import { conditionFamily } from "./condition-kinds.js";
import { OMISSION_DECAY } from "./state-geography.js";
import { selectConditionsFor } from "./state-selectors.js";
// The obligation ledger: the thing two other modules already defer to.
//
// `state-geography.ts` reserves "a derived-neglect scan over live state (an
// unanswered disaster condition, an unmet obligation)" for this module, and
// `states.ts` says in as many words "the obligation ledger's job; do not scan
// conditions here". Neither was ever written, so `PendingClaim` — the whole
// apparatus by which a state remembers being ignored — had no producer at all,
// and ignoring a state for eleven weeks cost a national metric drag and nothing
// whatsoever in the state.
//
// This module is the producer, and only the producer. It does not write a
// `GrievanceMark`: it opens claims, and `statePhase` writes the omission mark
// when one expires unanswered, which keeps the two-writer rule those comments
// exist to protect.
/** A claim opens under this prefix so an answering act can match it by kind. */
export const RELIEF_SIGNATURE_PREFIX = "relief";
export function reliefSignature(kind) {
    return `${RELIEF_SIGNATURE_PREFIX}:${kind}`;
}
/**
 * How long a state waits for an answer before the silence becomes a mark.
 *
 * Inverted against severity on purpose: the worse the emergency, the less
 * patience the state has. A mild condition gives most of a season; a
 * catastrophe gives under a month.
 */
export const CLAIM_WINDOW_MAX_TURNS = 8;
export const CLAIM_WINDOW_MIN_TURNS = 3;
export function claimWindowTurns(severity) {
    const span = CLAIM_WINDOW_MAX_TURNS - CLAIM_WINDOW_MIN_TURNS;
    return Math.max(CLAIM_WINDOW_MIN_TURNS, Math.round(CLAIM_WINDOW_MAX_TURNS - span * clamp01(severity)));
}
/** Share of severity a claim against the one state that is living through it carries. */
export const LOCAL_CLAIM_WEIGHT = 0.8;
/**
 * Share of the local weight a nationwide condition carries *per state*.
 *
 * A nation-scope condition names no state at all (`placeUsOnset` returns no
 * place for it), so without this the broadest 15% of emergencies in the game
 * would open no claim anywhere and cost nothing to ignore — teaching the player
 * that the bigger the disaster, the safer it is to walk away. It is well under
 * 1 because this weight lands on every state at once: a national emergency
 * ignored should anger the whole country a little, not anger each state as much
 * as its own local disaster would.
 */
export const NATIONAL_CLAIM_SHARE = 0.25;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000;
export function claimWeightFor(condition) {
    const local = clamp01(condition.severity) * LOCAL_CLAIM_WEIGHT;
    return round3(condition.state ? local : local * NATIONAL_CLAIM_SHARE);
}
function claimReason(condition, stateName) {
    return `${stateName} asked for federal help with the ${claimNoun(condition.kind)} and has not had an answer.`;
}
/**
 * What a state calls the thing it asked for help with.
 *
 * The hazard vocabulary with its article taken off, because this sentence
 * supplies its own ("the flooding", "the tornado"). Derived from the one hazard
 * table rather than restated, which is what it used to be: a second list of the
 * same sixteen words that had to be kept in step by hand, and that called a
 * storm making landfall in Florida a cyclone.
 *
 * Every claim here is against the player's own ground, so no basin is passed.
 */
function claimNoun(kind) {
    return hazardNoun(kind).replace(/^an? /, "");
}
export function claimFor(condition, stateName, turn) {
    return {
        signature: reliefSignature(condition.kind),
        openedTurn: turn,
        expiresTurn: turn + claimWindowTurns(condition.severity),
        weight: claimWeightFor(condition),
        reason: claimReason(condition, stateName),
    };
}
/**
 * Which states a condition puts under an obligation this turn.
 *
 * Only on the turn it opened. Re-opening a claim every week a condition ran
 * would reset its own deadline every week, so it could never expire and the
 * neglect could never be charged — the mechanic would silently do nothing.
 * A state is asked once per emergency; ignoring that once is what marks.
 */
function statesOwedBy(condition) {
    if (condition.status !== "active")
        return [];
    if (condition.state)
        return [condition.state];
    return STATE_IDS;
}
/** One line for the week, whether the emergency reached one state or all of them. */
function obligationSummary(condition, states) {
    const noun = claimNoun(condition.kind);
    return states === 1
        ? `A state is waiting on Washington over the ${noun}.`
        : `${states} states are waiting on Washington over the ${noun}.`;
}
export const obligationPhase = (state) => {
    const opening = selectConditionsFor(state, state.founding.nation).filter((condition) => condition.startedTurn === state.turn);
    if (opening.length === 0)
        return [];
    // One packet per condition, not per state. A nation-scope emergency puts all
    // fifty-one states under obligation at once, and fifty-one packets for one
    // event would be fifty-one entries in the record of a week in which one thing
    // happened — the narration is the event, and the effects are its reach.
    const packets = [];
    for (const condition of opening) {
        const effects = [];
        for (const id of statesOwedBy(condition)) {
            const runtime = state.states[id];
            if (!runtime)
                continue;
            const claim = claimFor(condition, runtime.base.name, state.turn);
            effects.push({ kind: "state", state: id, reason: claim.reason, addClaim: claim,
                ...(conditionFamily(condition.kind) === "acute" ? { setStaffordRequest: {
                        id: `stafford-request:${condition.id}:${id}`, conditionId: condition.id, cause: condition.kind,
                        requestedTurn: state.turn, beyondStateCapacity: condition.severity >= 0.5, responsePlan: true,
                        resourcesCommitted: true, costShareAccepted: true,
                    } } : {}) });
        }
        if (effects.length === 0)
            continue;
        packets.push({
            source: "simulate",
            actor: "world",
            turn: state.turn,
            narration: { summary: obligationSummary(condition, effects.length) },
            effects,
        });
    }
    return packets;
};
/**
 * Answer every open relief claim of this kind in one state, without a mark.
 *
 * The one route by which a locale act discharges an obligation. Removing the
 * claim rather than marking it is the whole point: a president who answered is
 * not a president who was silent.
 */
export function answerReliefClaims(campaign, id, kind) {
    const runtime = campaign.states[id];
    if (!runtime)
        return undefined;
    const signature = reliefSignature(kind);
    const answered = runtime.claims.filter((claim) => claim.signature === signature);
    const kept = runtime.claims.filter((claim) => claim.signature !== signature);
    if (answered.length === 0)
        return undefined;
    const reason = `${runtime.base.name} got an answer on the ${claimNoun(kind)}.`;
    return {
        kind: "state",
        state: id,
        reason,
        replaceClaims: kept,
        // A favorable mark, and the mirror of the omission mark an ignored claim
        // writes. A state that remembers being abandoned has to be able to remember
        // being helped, or the ledger only ever runs one way and the only thing
        // federal attention can do is fail to be enough. It is also the durable
        // record `conditionAttention` reads to tell a targeted answer from a
        // government that merely signed something that week.
        addMark: {
            turn: campaign.turn,
            signature: answeredSignature(kind),
            weight: Math.max(...answered.map((claim) => claim.weight)),
            valence: 1,
            decayRate: OMISSION_DECAY,
            reason,
        },
    };
}
/** The mark an answered relief claim leaves behind. */
export function answeredSignature(kind) {
    return `answered:${reliefSignature(kind)}`;
}
/** How long an answer still counts as this state's file being worked. */
export const ANSWER_ATTENTION_TURNS = 6;
/**
 * Whether this administration has actually answered this state on this kind
 * recently — the targeted evidence that a condition's own file is being worked,
 * as opposed to the government having signed anything at all that week.
 */
export function stateAnswered(campaign, condition) {
    const id = condition.state;
    if (!id)
        return false;
    const runtime = campaign.states[id];
    if (!runtime)
        return false;
    const signature = answeredSignature(condition.kind);
    return runtime.marks.some((mark) => mark.signature === signature && campaign.turn - mark.turn <= ANSWER_ATTENTION_TURNS);
}
