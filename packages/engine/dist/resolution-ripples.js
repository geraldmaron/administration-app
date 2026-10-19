import { selectNation, selectRelationship } from "./state.js";
import { nationName, possessive, sentenceCase } from "./naming.js";
import { defenseHolds, sharedBodies } from "./compacts.js";
// Who else reacts to a move between two capitals, and by how much: the third
// parties a projection names before it is committed, and the actor's own
// institutions once a move is coercive enough to strain them.
// A bloc partner reacts hardest of all, and it is the only relation here that
// is about the *actor* rather than the target: turning on a state you have
// signed the same compact with tells every other signatory what the compact is
// worth. An ally of the target is alarmed; a co-signatory has been informed.
const RELATION_SENSITIVITY = {
    "bloc-partner": 0.12,
    ally: 0.08,
    "bloc-peer": 0.05,
    "trade-partner": 0.04,
};
// Above this severity a coercive move abroad costs the actor something at
// home: institutions, not only foreign capitals, react to what is done in
// their name.
const DOMESTIC_RIPPLE_THRESHOLD = 0.5;
const DOMESTIC_RIPPLE_SCALE = 0.02;
// A country as the ripple sentence carries it, "the United Kingdom" rather than its id.
function named(campaign, id) {
    const nation = selectNation(campaign, id);
    return nation ? nationName(nation.base.identity) : id;
}
function thirdPartyRelation(campaign, third, target, actorId) {
    if (third === actorId || third === target.id)
        return undefined;
    // Checked before anything else: a nation that shares a bloc with both sides
    // is not simply an ally of the target, and reading it as one would price the
    // most expensive thing a state can do to its own alliance as the cheapest.
    const thirdNation = selectNation(campaign, third)?.base;
    const actorNation = selectNation(campaign, actorId)?.base;
    const sharedWithTarget = sharedBodies(thirdNation?.memberships ?? [], target.memberships);
    const sharedWithActor = new Set(sharedBodies(thirdNation?.memberships ?? [], actorNation?.memberships ?? []).map((body) => body.id));
    const commonDefense = sharedWithTarget.find((body) => sharedWithActor.has(body.id) && body.kind === "defense" && defenseHolds(body.defenseScope, target.geo.region));
    if (commonDefense) {
        return {
            relation: "bloc-partner",
            reason: `${sentenceCase(named(campaign, third))} shares ${commonDefense.name}'s defense promise with both ${named(campaign, actorId)} and ${named(campaign, target.id)}, and now knows what it is worth.`,
        };
    }
    const towardTarget = selectRelationship(campaign, third, target.id);
    const bilateralDefense = Object.values(campaign.treaties).some((record) => record.kind === "alliance" && record.status === "ratified" &&
        ((third === campaign.founding.nation && record.counterpart === target.id) ||
            (target.id === campaign.founding.nation && record.counterpart === third)));
    const sharedDefense = sharedWithTarget.some((body) => body.kind === "defense" && defenseHolds(body.defenseScope, target.geo.region));
    if (towardTarget && (towardTarget.trust >= 0.4 || bilateralDefense || sharedDefense)) {
        return { relation: "ally", reason: `${sentenceCase(named(campaign, third))} is aligned with ${named(campaign, target.id)} and reads the move as a threat.` };
    }
    const sharedBloc = sharedWithTarget[0];
    if (sharedBloc) {
        return { relation: "bloc-peer", reason: `${sentenceCase(named(campaign, third))} and ${named(campaign, target.id)} belong to ${sharedBloc.name} and must judge this move in their own interests.` };
    }
    if (target.stats.trade.topPartners.some((p) => p === third)) {
        return { relation: "trade-partner", reason: `${sentenceCase(named(campaign, third))} trades heavily with ${named(campaign, target.id)} and absorbs the disruption.` };
    }
    return undefined;
}
// Who cares about a move, and why, is a fact about the campaign, the actor and
// the target; the instrument and rung only scale it. The NPC agent weighs every
// instrument and rung against every capital it keeps a relationship with, and
// rescanning all 196 governments for each of those candidates was more than
// half the cost of a week. Kept per campaign object, which is never mutated, so
// a snapshot's answers are dropped with the snapshot.
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
    for (const third of Object.keys(campaign.nations)) {
        const match = thirdPartyRelation(campaign, third, target, actor);
        if (!match)
            continue;
        // A third party can only cool toward the actor if it has a reading of the
        // actor to cool. Without that relationship there is nothing to move.
        if (!selectRelationship(campaign, third, actor))
            continue;
        parties.push({ nation: third, relation: match.relation, reason: match.reason });
    }
    bySnapshot.set(key, parties);
    return parties;
}
export function projectRipples(campaign, request, target, severity, actorName) {
    const ripples = [];
    for (const match of thirdPartiesOf(campaign, request.actor, target)) {
        const third = match.nation;
        ripples.push({
            nation: third,
            relation: match.relation,
            magnitude: severity * RELATION_SENSITIVITY[match.relation],
            // The relation is the same fact either way — who is close enough to the
            // target to care — but what they conclude is not. A nation aligned with
            // the target reads a strike as a threat and a shipment as a favor done
            // to a friend, so the sentence cannot be the coercive one for both.
            reason: request.instrument === "assistance"
                ? `${sentenceCase(named(campaign, third))} notices whose crates arrived in ${named(campaign, target.id)}, and who was not there.`
                : match.reason,
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
export function rippleContribution(campaign, request, ripples) {
    const effects = [];
    let stability = 0;
    // A third party close to the target moves *away* from whoever coerced it and
    // *toward* whoever helped it. Same relations, same magnitudes, opposite sign:
    // without this, feeding a country would cost the actor the friendship of
    // every friend that country has.
    const direction = request.instrument === "assistance" ? -1 : 1;
    for (const ripple of ripples) {
        if (ripple.relation === "domestic") {
            stability -= ripple.magnitude;
            continue;
        }
        if (!selectRelationship(campaign, ripple.nation, request.actor))
            continue;
        effects.push({
            kind: "relationship",
            from: ripple.nation,
            to: request.actor,
            deltas: { trust: -ripple.magnitude * direction, tension: ripple.magnitude * 0.6 * direction },
        });
    }
    return { effects, metricDeltas: stability === 0 ? {} : { stability } };
}
