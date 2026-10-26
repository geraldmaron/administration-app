import { STATE_IDS } from "@admin/world";
import { hazardNoun } from "./condition-impacts.js";
import { conditionFamily } from "./condition-kinds.js";
import { conditionImpactEvent } from "./impact-adapters.js";
import { createRngStreams } from "./rng.js";
import { nationFootprint } from "./us-placement.js";
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
 * Share of the local weight a nationwide standing condition carries *per state*.
 *
 * A recession names no state, so without this the broadest economic trouble in
 * the game would open no claim anywhere and cost nothing to ignore. It is well
 * under 1 because this weight lands on every state at once: a national slump
 * ignored should anger the whole country a little, not anger each state as much
 * as its own local disaster would. A nationwide hazard is different: it has a
 * footprint (`nationFootprint`), and every state inside it is living through it.
 */
export const NATIONAL_CLAIM_SHARE = 0.25;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000;
export function claimWeightFor(condition) {
    const local = clamp01(condition.severity) * LOCAL_CLAIM_WEIGHT;
    const inside = condition.state !== undefined || conditionFamily(condition.kind) === "acute";
    return round3(inside ? local : local * NATIONAL_CLAIM_SHARE);
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
 *
 * A hazard asks from where it struck: its state, or for a nationwide one the
 * states of its footprint, drawn on a stream keyed to the condition so every
 * reader of the same condition agrees on its reach. A standing condition is
 * the whole country's. A home event (a strike, a detention abroad) is no
 * state's to ask about unless it happened in one.
 */
export function statesOwedBy(campaign, condition) {
    if (condition.status !== "active")
        return [];
    if (condition.state)
        return [condition.state];
    const family = conditionFamily(condition.kind);
    if (family === "event")
        return [];
    if (family === "standing")
        return STATE_IDS;
    return nationFootprint(campaign, condition.kind, createRngStreams(campaign.seed).stream("condition-footprint", condition.id).next());
}
/**
 * The statewide per capita impact indicator for a major-disaster declaration,
 * in dollars: $1.94 for incidents from October 1, 2025 (FEMA notice, Federal
 * Register document 2026-19855; 44 C.F.R. 206.48(b)(1)). Public damage in a
 * state at or above this times its population is the threshold FEMA reads as
 * beyond the state's own capacity.
 */
export const STATEWIDE_PER_CAPITA_INDICATOR = 1.94;
/**
 * The public share of a disaster's losses: about a quarter. FEMA's Disaster
 * Relief Fund has obligated about $40 billion a year since 2020 (CRS IF12834,
 * December 2024) against $137 billion a year of billion-dollar losses over
 * 2020-2024 (NOAA NCEI). An approximation across years and events, not a
 * per-event fact.
 */
export const PUBLIC_LOSS_SHARE = 0.25;
/**
 * The same share for the two hazards whose losses are crops, power and lives
 * rather than public works: heat and drought. The OpenFEMA record for 2005 to
 * 2024 names no heat incident and one drought emergency across roughly nine
 * significant heat events and nine droughts, so the share is set where even a
 * severe nationwide heat wave stays under the indicator. That is the record's
 * own answer to whether a heat request is lawful: it is, and it is seldom made.
 */
export const PUBLIC_LOSS_SHARE_UNBUILT = 0.005;
/**
 * How close to the indicator a governor's own estimate has to come before the
 * state asks: half of it. A design value. Governors do ask below the line, and
 * some asks are turned down: OpenFEMA's DeclarationDenials record 217
 * major-disaster denials from 2005 to 2024 against about 1,280 declarations,
 * roughly one request in seven. That ratio is not this file's target, because
 * the record's requests include the many small events that never become a
 * condition; among the significant events the game opens, about one request in
 * fifty lacks the capacity finding.
 */
export const REQUEST_SHARE_OF_INDICATOR = 0.5;
/**
 * The public damage this condition did, in USD millions, before any response:
 * the first day's asset loss of its impact record, or of the record its onset
 * would have opened when the condition was written without one.
 */
export function estimatedPublicLossUSDm(campaign, condition) {
    const event = campaign.impactEvents?.[`impact:${condition.id}`] ?? conditionImpactEvent(campaign, condition)[0]?.event;
    const mechanism = event?.spec.mechanism;
    if (!event || !mechanism || mechanism.kind !== "natural")
        return 0;
    const exposure = event.spec.exposure;
    const share = mechanism.hazard === "heat-wave" || mechanism.hazard === "drought" ? PUBLIC_LOSS_SHARE_UNBUILT : PUBLIC_LOSS_SHARE;
    return exposure.assetsUSDm * mechanism.damageShare * mechanism.intensity * (1 - 0.7 * exposure.resilience) * share;
}
/**
 * Whether this state's governor asks for a major-disaster declaration, and
 * whether the ask carries a finding that the damage is beyond the state.
 *
 * Read off the damage the state carries against its own population, which is
 * the indicator FEMA reads. A nationwide epidemic is beyond every state by
 * nature, as 2020 found; an epidemic held in one region asks on its severity.
 */
function governorAsk(campaign, condition, state, reach) {
    if (condition.kind === "pandemic") {
        const beyond = condition.scope === "nation" || condition.severity >= 0.5;
        return { requests: beyond, beyondCapacity: beyond };
    }
    const people = (id) => campaign.states[id]?.population ?? 0;
    const reachPeople = reach.reduce((sum, id) => sum + people(id), 0);
    const share = reachPeople > 0 ? people(state) / reachPeople : 0;
    const damage = estimatedPublicLossUSDm(campaign, condition) * share * 1_000_000;
    const threshold = STATEWIDE_PER_CAPITA_INDICATOR * people(state);
    return { requests: threshold > 0 && damage >= REQUEST_SHARE_OF_INDICATOR * threshold, beyondCapacity: damage >= threshold };
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
        const reach = statesOwedBy(state, condition);
        const hazard = conditionFamily(condition.kind) === "acute";
        for (const id of reach) {
            const runtime = state.states[id];
            if (!runtime)
                continue;
            const claim = claimFor(condition, runtime.base.name, state.turn);
            const ask = hazard ? governorAsk(state, condition, id, reach) : undefined;
            // A request is the governor's ask, not the President's answer: the
            // plan, the state's own resources and the cost share are what every
            // request certifies (44 C.F.R. 206.36), and whether the law then allows a
            // declaration is checked when the President declares (stafford.ts).
            effects.push({ kind: "state", state: id, reason: claim.reason, addClaim: claim,
                ...(ask?.requests ? { setStaffordRequest: {
                        id: `stafford-request:${condition.id}:${id}`, conditionId: condition.id, cause: condition.kind,
                        requestedTurn: state.turn, beyondStateCapacity: ask.beyondCapacity, responsePlan: true,
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
