import { confirmedSupport } from "./confirmed-support.js";
import { organizations } from "@admin/world";
import { selectNation, selectRelationship } from "./state.js";
// Who would stand with a government on a move against a country, and what
// their standing with it is worth. One estimator: the act screen lists these
// backers and the projection prices them, so the list a player reads is the
// list the odds were read off.
//
// Backing is the mirror of the ripples in resolution-ripples.ts, never a second
// count of them. A partner tied to the target is "torn" and appears only on the
// side that reacts against; a partner counted here is one the ripple rules
// would leave alone.
/**
 * Trust in the actor at which a partner is read as likely to back a move.
 * Stricter than the 0.4 the ripple rules read as "aligned" with a target,
 * because backing asks more than sympathy does.
 */
export const BACKING_TRUST = 0.5;
const KIND_RANK = { defense: 0, political: 1, economic: 2 };
const ORGS = new Map(organizations.map((org) => [org.id, org]));
function compactOf(id) {
    const org = ORGS.get(id);
    if (!org)
        return undefined;
    const kind = org.kind === "defense" || org.kind === "economic" ? org.kind : "political";
    return { name: org.name, kind };
}
/** The strongest compact two memberships share: a defense treaty before a political body before a trade bloc. */
function strongestShared(mine, theirs) {
    return theirs
        .filter((id) => mine.has(id))
        .map(compactOf)
        .filter((compact) => compact !== undefined)
        .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind])[0];
}
/** The ripple rules' own test for a third party reacting against a move on the target. */
function alignedWithTarget(campaign, third, target, targetBlocs, theirs) {
    if (theirs.some((id) => targetBlocs.has(id)))
        return true;
    const towardTarget = selectRelationship(campaign, third, target);
    return towardTarget !== undefined && (towardTarget.trust >= 0.4 || towardTarget.treaties.length > 0);
}
export function coalitionFor(campaign, actor, target, trustFloor = BACKING_TRUST) {
    const mine = new Set((selectNation(campaign, actor)?.base.memberships ?? []).map((id) => id));
    const targetBlocs = new Set((selectNation(campaign, target)?.base.memberships ?? []).map((id) => id));
    const backers = [];
    let torn = 0;
    for (const id of Object.keys(campaign.nations)) {
        if (id === actor || id === target)
            continue;
        const nation = selectNation(campaign, id);
        const theirs = (nation?.base.memberships ?? []).map((m) => m);
        const compact = strongestShared(mine, theirs);
        if (!nation || !compact)
            continue;
        if (alignedWithTarget(campaign, id, target, targetBlocs, theirs)) {
            torn += 1;
            continue;
        }
        const trust = selectRelationship(campaign, id, actor)?.trust;
        if (trust === undefined || trust < trustFloor)
            continue;
        backers.push({ nation: id, name: nation.base.identity.name, trust, compact });
    }
    backers.sort((a, b) => KIND_RANK[a.compact.kind] - KIND_RANK[b.compact.kind] || b.trust - a.trust);
    return { backers, torn };
}
// --- What backing is worth -------------------------------------------------
/**
 * How much one backer counts toward a full coalition, by the compact it is
 * bound by. A treaty ally lends bases, ships and a vote; a trade-bloc partner
 * mostly lends its name.
 */
export const BACKER_WEIGHT = { defense: 1, political: 0.6, economic: 0.4 };
/**
 * Weighted backers at which a coalition is as strong as it gets. Past this,
 * more names on the statement change nothing: the odds of a move are set by
 * whether the people who matter joined, not by how many signed.
 */
export const BACKING_SATURATION = 4;
/**
 * Relative lift a full coalition gives an act's odds, by instrument.
 *
 * Sanctions gain the most because their whole mechanism is closing the exits,
 * and every partner who joins closes one. Force gains less: allies lend basing,
 * overflight and intelligence, but the fight is still the actor's. A covert
 * act gains nothing, because a secret shared with a coalition is not one, and
 * aid and diplomacy carry no coalition reading on the act screen.
 */
export const BACKING_ODDS_LIFT = {
    economic: 0.12,
    military: 0.06,
    covert: 0,
    diplomatic: 0,
    assistance: 0,
};
/**
 * Share of an act's standing cost a full coalition absorbs. A move other
 * governments stand behind reads abroad as enforcement rather than as one
 * capital's will, and that difference is what standing measures.
 */
export const BACKING_STANDING_RELIEF = 0.35;
/**
 * What the actor's backers do to this act, or nothing where backing does not
 * apply.
 *
 * The President's own acts only, for the reason the cabinet's sway is theirs
 * only: the coalition is read off trust in one government, and pricing every
 * capital's moves this way would retune the whole world's balance to settle one
 * screen's question.
 */
export function coalitionBacking(campaign, request) {
    if (request.actor !== campaign.founding.nation)
        return undefined;
    const lift = BACKING_ODDS_LIFT[request.instrument];
    if (lift === 0)
        return undefined;
    // A near-trust economic partner can be confirmed after receiving a specific
    // covert warning. Confirmation is stored on the issued act; the report's
    // freshness mattered when that answer was made, not again at execution.
    const eligible = coalitionFor(campaign, request.actor, request.target, request.instrument === "economic" ? 0.4 : BACKING_TRUST).backers;
    const confirmed = new Set(confirmedSupport(campaign, request));
    const backers = eligible.filter((backer) => confirmed.has(backer.nation));
    if (backers.length === 0)
        return undefined;
    const weighted = backers.reduce((sum, backer) => sum + BACKER_WEIGHT[backer.compact.kind], 0);
    const strength = Math.min(1, weighted / BACKING_SATURATION);
    return {
        backers: backers.length,
        strength: round3(strength),
        oddsMultiplier: round3(1 + lift * strength),
        standingRelief: round3(BACKING_STANDING_RELIEF * strength),
    };
}
/** The act's cost with the coalition's share of the standing taken off it. */
export function withBacking(cost, backing) {
    if (!backing || cost.standing === undefined)
        return cost;
    return { ...cost, standing: cost.standing * (1 - backing.standingRelief) };
}
function round3(value) {
    return Math.round(value * 1000) / 1000;
}
