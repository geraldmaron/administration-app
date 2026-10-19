import { worldDataset } from "@admin/world";
import { engagementAvailable, projectReceive } from "./engagement.js";
import { selectNation, selectRelationship } from "./state.js";
import { axisLean, dispositionOf } from "./person-disposition.js";
import { availableOrders, executiveOrder, orderChair, projectOrder } from "./orders.js";
import { orderFit } from "./execution.js";
import { commandDef, commandEngagement, commandFor, effectivePosture, GEOGRAPHIC_COMMANDS } from "./combatant-commands.js";
import { ministerSituation, OVERRULED_FULL } from "./minister-will.js";
import { nationName, roleTitle } from "./naming.js";
import { createRngStreams } from "./rng.js";
import { noiseFrom, projectWillingness, stampOf, weigh, willDraw, } from "./willingness.js";
// What a Secretary brings the President unasked: a move of their own, chosen
// from who they are.
//
// A department's request answers a department's trouble. This is the other
// thing a cabinet does: a hawkish Secretary of Defense asks to raise a tense
// theater's readiness, a Secretary of State sees a government ready to receive
// the President, a chair whose department carries an order puts the one that
// fits their own politics on the desk. Each is weighed through the one decision
// model, so the Desk can say why this Secretary brought this act and not
// another, and each is a real act the President can take with one answer.
export const ROLE_DEFENSE = "role-defense-minister";
export const ROLE_STATE = "role-foreign-minister";
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round4 = (value) => Math.round(value * 10000) / 10000 + 0;
// --- Defense: a posture notch ----------------------------------------------
/** A Secretary this far off the typical cabinet's appetite for force has a view about posture worth bringing. */
const POSTURE_LEAN_FLOOR = 0.05;
/** A theater with a government this much at odds with the country is one a hawk wants readier. */
const TENSE_THEATER = 0.3;
const NOTCHES = ["routine", "heightened", "surge"];
/** A Secretary who carries the hawk's or the dove's trait in full reads as nearly a perfect fit for the posture argument. */
const POSTURE_FIT_SLOPE = 1.5;
/**
 * The country's own edge to every government it has one with. Read by key
 * rather than by scanning every relationship in the world, because this runs
 * every week for two chairs.
 */
function edgesFromUs(campaign) {
    const us = campaign.founding.nation;
    return Object.keys(campaign.nations).flatMap((nation) => {
        const edge = nation === us ? undefined : selectRelationship(campaign, us, nation);
        return edge ? [edge] : [];
    });
}
/** How tense each theater is: the worst relationship the country has with any government in it. */
function theaterTension(campaign) {
    const tension = new Map();
    for (const edge of edgesFromUs(campaign)) {
        const command = commandFor(campaign, edge.to);
        if (command)
            tension.set(command, Math.max(tension.get(command) ?? 0, edge.tension));
    }
    return tension;
}
function mostTense(tension, eligible) {
    return GEOGRAPHIC_COMMANDS.map((def) => ({ id: def.id, tension: tension.get(def.id) ?? 0 }))
        .filter((entry) => eligible(entry.id, entry.tension))
        .sort((a, b) => b.tension - a.tension || (a.id < b.id ? -1 : 1))[0]?.id;
}
/**
 * A hawk asks to raise the most tense theater one notch from where it stands;
 * a dove asks to stand down the most tense theater the President has raised
 * and nobody is fighting in. A Secretary near the middle brings neither.
 */
function postureCandidate(campaign, role, person) {
    if (role !== ROLE_DEFENSE)
        return undefined;
    const lean = axisLean(person, "forceAppetite");
    if (Math.abs(lean) < POSTURE_LEAN_FLOOR)
        return undefined;
    const tension = theaterTension(campaign);
    const ordered = (id) => campaign.security.unifiedCommand.commands[id]?.posture;
    const hawk = lean > 0;
    const command = hawk
        ? mostTense(tension, (id, level) => level >= TENSE_THEATER && ordered(id) !== undefined && effectivePosture(campaign, id) !== "surge")
        : mostTense(tension, (id) => (ordered(id) ?? "routine") !== "routine" && commandEngagement(campaign, id) === undefined);
    if (!command)
        return undefined;
    const from = hawk ? effectivePosture(campaign, command) : ordered(command);
    const posture = NOTCHES[NOTCHES.indexOf(from) + (hawk ? 1 : -1)];
    return {
        role,
        person,
        act: { kind: "posture", command, posture },
        fit: round4(clamp01(0.5 + POSTURE_FIT_SLOPE * Math.abs(lean))),
        key: `posture:${command}:${posture}`,
        motive: hawk
            ? "has long argued for a firmer military stance, and tensions are running high there"
            : "would rather not spend the military's readiness on a raised posture where nobody is fighting",
    };
}
// --- State: a summit or a visit --------------------------------------------
/**
 * How likely the other side is to receive it, 0..1, from the projection alone:
 * the share of the noise band the margin clears. Seed-free, which is what lets
 * a Secretary's choice and the Desk's price agree.
 */
export function receiveChance(projection) {
    if (projection.noiseBound === 0)
        return projection.margin >= 0 ? 1 : 0;
    return round4(clamp01((projection.margin + projection.noiseBound) / (2 * projection.noiseBound)));
}
/** The meetings a Secretary of State brings to the President: the two that put the President in the room. */
const MEETINGS = ["summit", "visit"];
/** What the other side's likely answer can add to a meeting's fit, at most. */
const PROSPECT_WEIGHT = 0.4;
/**
 * A meeting's fit before the other side's answer is read. A visit goes to a
 * government that matters; a summit to one the country is at odds with, and
 * the less a Secretary trusts force the more they reach for one.
 */
function baseFit(campaign, request, lean) {
    if (request.kind === "visit") {
        const target = selectNation(campaign, request.target);
        return 0.3 + 0.3 * (target ? (target.base.bands.powerTier - 1) / 4 : 0);
    }
    return 0.3 + 0.3 * (selectRelationship(campaign, campaign.founding.nation, request.target)?.tension ?? 0) - lean;
}
function byFit(a, b) {
    return b.fit - a.fit || (a.request.target < b.request.target ? -1 : a.request.target > b.request.target ? 1 : 0) || (a.request.kind < b.request.kind ? -1 : 1);
}
/**
 * The best-fitting summit or visit the other side is not expected to refuse.
 * Reading a government's answer is the costly part, so meetings are read best
 * first and the search stops once no meeting left could fit better, which
 * picks the same meeting a full read would.
 */
function bestEngagement(campaign, lean) {
    const actor = campaign.founding.nation;
    const ranked = edgesFromUs(campaign)
        .flatMap((edge) => MEETINGS.map((kind) => ({ actor, target: edge.to, kind })))
        .filter((request) => engagementAvailable(campaign, request))
        .map((request) => ({ request, fit: baseFit(campaign, request, lean) }))
        .sort(byFit);
    let best;
    for (const { request, fit: base } of ranked) {
        if (best && round4(clamp01(base + PROSPECT_WEIGHT)) < best.fit)
            break;
        const projection = projectReceive(campaign, request);
        if (projection.forecast === "unlikely")
            continue;
        const scored = { request, fit: round4(clamp01(base + PROSPECT_WEIGHT * receiveChance(projection))) };
        if (!best || byFit(scored, best) < 0)
            best = scored;
    }
    return best;
}
/** The summit or visit a Secretary of State would put forward. */
function engagementCandidate(campaign, role, person) {
    if (role !== ROLE_STATE)
        return undefined;
    const best = bestEngagement(campaign, axisLean(person, "forceAppetite"));
    if (!best)
        return undefined;
    const name = nationLabel(campaign, best.request.target);
    return {
        role,
        person,
        act: { kind: "engagement", target: best.request.target, engagement: best.request.kind },
        fit: best.fit,
        key: `engagement:${best.request.target}:${best.request.kind}`,
        motive: best.request.kind === "summit"
            ? `believes talking face to face is the way to ease the tension with ${name}`
            : `sees a chance to deepen ties with ${name}, which is ready to receive you`,
    };
}
// --- Order-owning chairs: the order that fits ------------------------------
/** Below this fit an order is the President's idea, not the Secretary's. */
const ORDER_FIT_FLOOR = 0.6;
/** How far past the office a Secretary will ask the President to reach: bolder further, the principled less far. */
export function overreachCeiling(person) {
    return round4(0.15 + 0.4 * dispositionOf(person).boldness - 0.3 * Math.max(0, axisLean(person, "principle")));
}
/** The orders on the desk this week that nobody has signed yet, by the chair whose department would carry each. */
export function ordersByChair(campaign) {
    const signed = new Set(campaign.orders.map((record) => record.order));
    const owned = new Map();
    for (const order of availableOrders(campaign)) {
        const chair = signed.has(order.id) ? undefined : orderChair(campaign, order);
        if (chair)
            owned.set(chair, [...(owned.get(chair) ?? []), order]);
    }
    return owned;
}
function orderCandidate(role, person, orders) {
    const ceiling = overreachCeiling(person);
    const best = orders
        .filter((order) => order.overreach <= ceiling)
        .map((order) => ({ order, fit: orderFit(person, order) }))
        .filter((entry) => entry.fit >= ORDER_FIT_FLOOR)
        .sort((a, b) => b.fit - a.fit || (a.order.id < b.order.id ? -1 : 1))[0];
    if (!best)
        return undefined;
    return {
        role,
        person,
        act: { kind: "order", order: best.order.id },
        fit: best.fit,
        key: `order:${best.order.id}`,
        motive: "believes in what it does: it matches their own politics",
    };
}
/** The one act this Secretary would bring this week, if any: the best fit of everything their chair can put forward. */
export function initiativeFor(campaign, role, person, orders) {
    const candidates = [
        postureCandidate(campaign, role, person),
        engagementCandidate(campaign, role, person),
        orderCandidate(role, person, orders.get(role) ?? []),
    ].filter((candidate) => candidate !== undefined);
    return [...candidates].sort((a, b) => b.fit - a.fit || (a.key < b.key ? -1 : 1))[0];
}
// --- The decision -----------------------------------------------------------
const THRESHOLD = 0.55;
const NOISE_BOUND = 0.08;
/**
 * A loyal, ambitious Secretary with an act they believe in brings it; one the
 * President keeps overruling stops. Party is a nudge, not a reason: a Secretary
 * from across the aisle still has ideas, and is a little slower to offer them.
 */
export function initiativeTerms(campaign, candidate) {
    const { person } = candidate;
    const situation = ministerSituation(campaign, candidate.role, person);
    return [
        { key: "loyalty", source: "obligation", value: round4(0.35 * person.loyalty) },
        { key: "ambition", source: "interest", value: round4(0.3 * person.ambition) },
        { key: "times-overruled", source: "situation", value: round4(-0.4 * Math.min(1, situation.overruled / OVERRULED_FULL)) },
        { key: "policy-fit", source: "trait", value: round4(0.5 * (candidate.fit - 0.5)) },
        { key: "co-partisanship", source: "obligation", value: round4(0.05 * situation.partisanship) },
    ];
}
/** The decision, with its one draw, keyed by the Secretary, the chair and the act and never the week. */
export function decideInitiative(campaign, candidate) {
    const draw = willDraw(createRngStreams(campaign.seed), "minister-initiative", candidate.person.id, candidate.role, candidate.key);
    return weigh("minister-initiative", initiativeTerms(campaign, candidate), {
        threshold: THRESHOLD,
        noiseBound: NOISE_BOUND,
        noise: noiseFrom(draw, NOISE_BOUND),
    });
}
export function projectInitiative(campaign, candidate) {
    return projectWillingness("minister-initiative", initiativeTerms(campaign, candidate), { threshold: THRESHOLD, noiseBound: NOISE_BOUND });
}
/** Public, like every other reason a Secretary gives the President. */
export function initiativeStamp(willingness, person, role) {
    return stampOf(willingness, person, role, "public");
}
// --- How it reads -----------------------------------------------------------
function nationLabel(campaign, nation) {
    const identity = selectNation(campaign, nation)?.base.identity;
    return identity ? nationName(identity) : nation;
}
/** What the act is, as the object of "proposes". */
export function proposalActWords(campaign, act) {
    if (act.kind === "order")
        return `signing ${executiveOrder(act.order)?.name ?? "an executive order"}`;
    if (act.kind === "engagement") {
        const name = nationLabel(campaign, act.target);
        return act.engagement === "summit" ? `a summit with ${name}` : act.engagement === "visit" ? `a state visit to ${name}` : `a ${act.engagement} with ${name}`;
    }
    const command = commandDef(act.command)?.name ?? act.command;
    const current = campaign.security.unifiedCommand.commands[act.command]?.posture ?? "routine";
    const raising = NOTCHES.indexOf(act.posture) > NOTCHES.indexOf(current);
    return raising ? `raising ${command} to ${act.posture} readiness` : `standing ${command} down to ${act.posture} readiness`;
}
/** The charter the campaign was founded under, which an order is weighed against. */
export function foundedCharter(campaign) {
    return worldDataset.charters.find((charter) => charter.id === campaign.founding.charter);
}
/** Whether the Attorney General would object in writing to this order as it stands this week. */
export function attorneyGeneralObjects(campaign, order) {
    const charter = foundedCharter(campaign);
    return charter !== undefined && projectOrder(campaign, charter, order).review?.objects === true;
}
function orderConsequence(campaign, order) {
    const signed = order?.viaRulemaking
        ? "Taking it signs the order, and the department starts writing the rule; nothing changes until the rule is final."
        : "Taking it signs the order, and it takes effect at once.";
    return order && attorneyGeneralObjects(campaign, order)
        ? `${signed} The Attorney General will object in writing that it reaches past the office's powers, which makes a court challenge likelier.`
        : signed;
}
/** What taking it does, in a sentence the Desk can print under the proposal. */
export function proposalActConsequence(campaign, act) {
    if (act.kind === "order")
        return orderConsequence(campaign, executiveOrder(act.order));
    if (act.kind === "engagement")
        return "Taking it sends the request; the other government decides whether to receive it.";
    return act.posture === "routine"
        ? "Taking it gives the order at once, and frees the readiness the raised posture was using."
        : "Taking it gives the order at once; a raised posture draws on the military's readiness every week it holds.";
}
/** Who proposes what, why, and what taking it does: the whole of the Desk's sentence. */
export function initiativeSummary(campaign, candidate) {
    const title = roleTitle(candidate.role);
    const name = candidate.person.name;
    return `The ${title}, ${name}, proposes ${proposalActWords(campaign, candidate.act)}. ${name} ${candidate.motive}. ${proposalActConsequence(campaign, candidate.act)}`;
}
