import { selectActiveConflicts, selectNation, selectPursuitAgainst, selectRelationship } from "./state.js";
import { nationName, possessive, sentenceCase } from "./naming.js";
import { defenseHolds, sharedBodies } from "./compacts.js";
import { sideOf } from "./conflicts.js";
import { relationshipAnchor } from "./relationships.js";
import { laneMagnitude } from "./relationship-graph.js";
// Who else reacts to a move between two capitals, and by how much: the third
// parties a projection names before it is committed, and the actor's own
// institutions once a move is coercive enough to strain them.
//
// A government's reaction is its own reading of what the move does to it,
// signed and scaled by its ties to both sides: how much it values the target,
// whether it is bound to defend it, what it stands to lose with it, how much
// it fears the actor, and whether it is already doing the same thing itself.
// A rival of the target reads the move as none of its business — enemy-of-
// enemy alignment is conditional, so rivalry earns neutrality, never approval.
// Approval is earned only by a government already running the same policy
// against the same target, and is bounded so a move cannot be repeated for it.
// Above this severity a coercive move abroad costs the actor something at
// home: institutions, not only foreign capitals, react to what is done in
// their name.
const DOMESTIC_RIPPLE_THRESHOLD = 0.5;
const DOMESTIC_RIPPLE_SCALE = 0.02;
/** Planning value: trust a fully concerned observer moves per unit of the move's severity. */
const RIPPLE_SCALE = 0.1;
/** A reaction below this moves nothing a reading can show, and is not named. */
const MIN_RIPPLE = 0.0005;
/**
 * Planning values: how each concern weighs. A friend's bond and a binding
 * guarantee count most; a compact one signatory turns on in front of the
 * others counts more than either, because it tells every member what the
 * compact is worth.
 */
const CONCERN = { bond: 0.5, obligation: 0.4, compactBreach: 0.6, exposure: 0.6, alarm: 0.25 };
/**
 * Planning values, by what the move is: the general norm against it any
 * government holds, how much it disrupts the target's trade, and how much
 * the observer's own fear of the actor is woken by it.
 */
const CHARACTER = {
    diplomatic: { norm: 0, exposure: 0.2, alarm: 0.3 },
    economic: { norm: 0.05, exposure: 1, alarm: 0.3 },
    covert: { norm: 0.15, exposure: 0.3, alarm: 0.5 },
    military: { norm: 0.3, exposure: 1, alarm: 1 },
};
/** Planning value: how much a partner's trade makes its recovery the observer's own business. */
const AID_EXPOSURE = 0.3;
/** Planning value: approval from a government already running the same policy. */
const SHARED_POLICY_APPROVAL = 0.3;
/** Planning value: the most approval can lift an observer above where it stands with the actor. */
export const APPROVAL_CEILING = 0.08;
/**
 * Planning value: the most objection alone can take an observer's trust below
 * where it stands with the actor. Deeper than the approval ceiling because a
 * grievance weighs more than a favor of the same size; bounded because an
 * observer that already reads a frequent coercer as one learns little from
 * the next act.
 */
export const OBJECTION_FLOOR = 0.25;
/** Lane magnitude read as full exposure: about a twentieth of an economy, the dataset's largest named partners. */
const EXPOSURE_SATURATION = 0.05;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// A country as the ripple sentence carries it, "the United Kingdom" rather than its id.
function named(campaign, id) {
    const nation = selectNation(campaign, id);
    return nation ? nationName(nation.base.identity) : id;
}
function defenseTies(campaign, observer, actor, target) {
    const observerNation = selectNation(campaign, observer)?.base;
    const actorNation = selectNation(campaign, actor)?.base;
    const withTarget = sharedBodies(observerNation?.memberships ?? [], target.memberships);
    const withActor = new Set(sharedBodies(observerNation?.memberships ?? [], actorNation?.memberships ?? []).map((body) => body.id));
    const holds = (body) => body.kind === "defense" && defenseHolds(body.defenseScope, target.geo.region);
    const common = withTarget.find((body) => withActor.has(body.id) && holds(body));
    const shared = withTarget.find(holds);
    const named = common ?? shared;
    const bilateral = Object.values(campaign.treaties).some((record) => record.kind === "alliance" && record.status === "ratified" &&
        ((observer === campaign.founding.nation && record.counterpart === target.id) ||
            (target.id === campaign.founding.nation && record.counterpart === observer)));
    return {
        obligation: shared || bilateral ? 1 : 0,
        compactBreach: common ? 1 : 0,
        ...(named ? { defenseBody: named.name } : {}),
        ...(withTarget[0] ? { bloc: withTarget[0].name } : {}),
    };
}
// Already doing it: at war with the target from the other side, pressing a
// campaign of its own against it, or standing in a breach of relations with it.
function runsSamePolicy(campaign, observer, target) {
    if (selectPursuitAgainst(campaign, observer, target))
        return true;
    if (campaign.player.flags[`severed-relations:${observer}:${target}`])
        return true;
    return selectActiveConflicts(campaign).some((conflict) => {
        const mine = sideOf(conflict, observer);
        const theirs = sideOf(conflict, target);
        return mine !== undefined && theirs !== undefined && mine !== theirs;
    });
}
function observerTies(campaign, observer, actor, target) {
    const toActor = selectRelationship(campaign, observer, actor);
    if (!toActor)
        return undefined;
    const toTarget = selectRelationship(campaign, observer, target.id);
    const trust = toTarget?.trust ?? 0;
    // The live lane where the graph holds it, since an embargo takes it to zero
    // there; the founding books otherwise.
    const ours = toTarget?.tradeDependence ?? selectNation(campaign, observer)?.stats.trade.tradeDependence[target.id] ?? 0;
    const theirs = selectRelationship(campaign, target.id, observer)?.tradeDependence ?? target.stats.trade.tradeDependence[observer] ?? 0;
    const lane = laneMagnitude(ours, theirs);
    const defense = defenseTies(campaign, observer, actor, target);
    // A government with no reading of the target, no trade with it and no body
    // in common has nothing at stake in the move and is not an observer of it.
    if (!toTarget && lane === 0 && !defense.bloc)
        return undefined;
    return {
        // The line is the sign of the observer's trust in the target: a government
        // that distrusts the target at all reads its coercion as none of its
        // business, and one with no reading of it at all has no rivalry with it.
        // At zero trust only trade, the norm and fear of the actor are left, so
        // the step across the line is small.
        standing: trust < 0 ? 0 : 1,
        bond: clamp01(trust),
        exposure: clamp01(lane / EXPOSURE_SATURATION),
        fearOfActor: toActor.militaryThreat,
        fearOfTarget: toTarget?.militaryThreat ?? 0,
        actorBond: clamp01(toActor.trust),
        sharedPolicy: runsSamePolicy(campaign, observer, target.id),
        ...defense,
    };
}
/** How strongly the observer objects to a coercive move, 0 upward. */
function objection(ties, character) {
    const bound = CONCERN.obligation * ties.obligation + CONCERN.compactBreach * ties.compactBreach;
    const interested = CONCERN.bond * ties.bond +
        CONCERN.exposure * ties.exposure * character.exposure +
        CONCERN.alarm * ties.fearOfActor * character.alarm +
        character.norm;
    // A government afraid of the target is partly reassured by its being
    // coerced, and one that trusts the actor gives it some benefit of the doubt.
    const relief = 1 - 0.6 * ties.fearOfTarget;
    const benefit = 1 - 0.5 * ties.actorBond;
    return (bound + ties.standing * interested) * relief * benefit;
}
/**
 * The observer's signed reading of the move: below zero it objects, above
 * zero it approves. Exported because a war the world watches week after week
 * is read through the same ties as the act that opened it.
 */
export function observerStance(campaign, observer, actor, target, instrument) {
    const ties = observerTies(campaign, observer, actor, target);
    return ties ? stanceFrom(ties, instrument) : 0;
}
function stanceFrom(ties, instrument) {
    if (instrument === "assistance") {
        // Help to a friend, or to a partner whose trade the observer depends on,
        // is a favor done to the observer too; help to a government it is already
        // working against is not.
        const welcome = CONCERN.bond * ties.bond + CONCERN.obligation * ties.obligation + AID_EXPOSURE * ties.exposure;
        return ties.sharedPolicy ? -SHARED_POLICY_APPROVAL : ties.standing * welcome;
    }
    return (ties.sharedPolicy ? SHARED_POLICY_APPROVAL : 0) - objection(ties, CHARACTER[instrument]);
}
function relationOf(ties) {
    if (ties.compactBreach)
        return "bloc-partner";
    if (ties.obligation || ties.bond >= 0.4)
        return "ally";
    if (ties.bloc)
        return "bloc-peer";
    if (ties.exposure > 0)
        return "trade-partner";
    return "observer";
}
function reasonFor(campaign, observer, actor, target, ties, approves) {
    const who = sentenceCase(named(campaign, observer));
    if (approves)
        return `${who} is already pressing ${named(campaign, target.id)} itself and welcomes the company.`;
    if (ties.compactBreach)
        return `${who} shares ${ties.defenseBody}'s defense promise with both ${named(campaign, actor)} and ${named(campaign, target.id)}, and now knows what it is worth.`;
    if (ties.obligation || ties.bond >= 0.4)
        return `${who} is aligned with ${named(campaign, target.id)} and reads the move as a threat.`;
    if (ties.bloc)
        return `${who} and ${named(campaign, target.id)} belong to ${ties.bloc} and must judge this move in their own interests.`;
    if (ties.exposure > 0)
        return `${who} trades heavily with ${named(campaign, target.id)} and absorbs the disruption.`;
    return `${who} reads the move against its own interests.`;
}
// Who could care about a move, and through what ties, is a fact about the
// campaign, the actor and the target; the instrument and rung only weigh it.
// The NPC agent weighs every instrument and rung against every capital it
// keeps a relationship with, and rescanning all 196 governments for each of
// those candidates was more than half the cost of a week. Kept per campaign
// object, which is never mutated, so a snapshot's answers go with it.
const thirdPartiesBySnapshot = new WeakMap();
function thirdPartiesOf(campaign, actor, target) {
    let bySnapshot = thirdPartiesBySnapshot.get(campaign);
    if (!bySnapshot) {
        bySnapshot = new Map();
        thirdPartiesBySnapshot.set(campaign, bySnapshot);
    }
    const key = `${actor}>${target.id}`;
    const known = bySnapshot.get(key);
    if (known)
        return known;
    const parties = [];
    for (const third of Object.keys(campaign.nations).sort()) {
        if (third === actor || third === target.id)
            continue;
        const ties = observerTies(campaign, third, actor, target);
        if (ties)
            parties.push({ nation: third, ties });
    }
    bySnapshot.set(key, parties);
    return parties;
}
export function projectRipples(campaign, request, target, severity, actorName) {
    const ripples = [];
    for (const { nation: third, ties } of thirdPartiesOf(campaign, request.actor, target)) {
        const stance = stanceFrom(ties, request.instrument);
        const magnitude = severity * RIPPLE_SCALE * Math.abs(stance);
        if (magnitude < MIN_RIPPLE)
            continue;
        // Assistance welcomed by a friend of the target is approval, as is
        // coercion joined by a government already doing the same.
        const approves = stance > 0;
        ripples.push({
            nation: third,
            relation: relationOf(ties),
            magnitude,
            ...(approves ? { approves: true } : {}),
            reason: request.instrument === "assistance"
                ? `${sentenceCase(named(campaign, third))} notices whose crates arrived in ${named(campaign, target.id)}, and who was not there.`
                : reasonFor(campaign, third, request.actor, target, ties, approves),
        });
    }
    if (severity >= DOMESTIC_RIPPLE_THRESHOLD) {
        ripples.push({
            nation: request.actor,
            relation: "domestic",
            magnitude: severity * DOMESTIC_RIPPLE_SCALE,
            reason: `${possessive(actorName)} own institutions strain under what was done in their name.`,
        });
    }
    return ripples;
}
// Approval only closes the distance to a ceiling above where the observer
// stands with the actor, so joining somebody else's pressure on the same
// target cannot be repeated into a store of goodwill. Objection settles toward
// a floor below it: every act is charged in proportion to the room left above
// the floor, so the first act from where the pair stands costs its full
// magnitude, each repeat still costs something, and a frequent coercer's
// standing with one observer plateaus instead of falling without end.
function objectionDelta(campaign, observer, actor, magnitude) {
    const relationship = selectRelationship(campaign, observer, actor);
    if (!relationship)
        return 0;
    const anchor = relationshipAnchor(campaign, relationship);
    const floor = (anchor?.trust ?? relationship.trust) - OBJECTION_FLOOR;
    const room = Math.max(0, Math.min(1, (relationship.trust - floor) / OBJECTION_FLOOR));
    return magnitude * room;
}
function approvalDelta(campaign, observer, actor, magnitude) {
    const relationship = selectRelationship(campaign, observer, actor);
    if (!relationship)
        return 0;
    const anchor = relationshipAnchor(campaign, relationship);
    const ceiling = (anchor?.trust ?? relationship.trust) + APPROVAL_CEILING;
    return Math.max(0, Math.min(magnitude, ceiling - relationship.trust));
}
export function rippleContribution(campaign, request, ripples) {
    const effects = [];
    let stability = 0;
    for (const ripple of ripples) {
        if (ripple.relation === "domestic") {
            stability -= ripple.magnitude;
            continue;
        }
        if (!selectRelationship(campaign, ripple.nation, request.actor))
            continue;
        if (ripple.approves) {
            const lift = approvalDelta(campaign, ripple.nation, request.actor, ripple.magnitude);
            if (lift > 0)
                effects.push({ kind: "relationship", from: ripple.nation, to: request.actor, deltas: { trust: lift, tension: -lift * 0.6 } });
            continue;
        }
        const cost = objectionDelta(campaign, ripple.nation, request.actor, ripple.magnitude);
        if (cost > 0)
            effects.push({ kind: "relationship", from: ripple.nation, to: request.actor, deltas: { trust: -cost, tension: cost * 0.6 } });
    }
    return { effects, metricDeltas: stability === 0 ? {} : { stability } };
}
