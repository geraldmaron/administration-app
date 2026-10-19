// Who comes into someone else's war, and why.
//
// A government decides once whether to fight beside one side of a war, from
// what it owes, what it wants and what it is like, and that answer stands
// until one of those changes. The one draw it is allowed is persistent noise
// keyed on the government and the war, never the week, so a war that runs a
// year does not draft more allies than one that runs a month merely by
// offering more rolls. The President's country is never an actor here: it
// enters a war only by an order, through the join that files its War Powers
// record.
import { organizations } from "@admin/world";
import { hasIntelOnNation, relationshipKey, selectActiveConflicts, selectNation, } from "./state.js";
import { noiseFrom, projectWillingness, stampOf, weigh, willDraw, } from "./willingness.js";
import { FIDELITY_WEIGHT, TEMPERAMENT_CENTER, appetite, isWorldActor, liveTemperament } from "./temperament.js";
import { sideOf } from "./conflicts.js";
import { calledCompactsIn, obligationWeight, sharedBodies, usCallFlag } from "./compacts.js";
import { disposition } from "./relationships.js";
import { forceProjectionProfile } from "./warfighting.js";
import { joinCapability, liveNation } from "./war-entry.js";
import { joinerCommitment } from "./commitments.js";
/**
 * The bar a government's willingness must clear to send forces, and the bar a
 * called ally is held to. One bar for both: a call raises what the ally owes
 * rather than lowering what fighting takes. Named inputs, so a rule that makes
 * allies rally can lower them within its bound and the stamp records the bar
 * that was used. From the centered sketch, where this bar gave ten to thirteen
 * joiners of Estonia across twelve seeds (planning value, pending the battery).
 */
export const JOIN_THRESHOLD = 1.087;
export const CALL_THRESHOLD = 1.087;
/** Below the bar for forces and above this one, a government would send help short of fighting (planning value). */
export const JOIN_AID_THRESHOLD = 0.6;
/** How far the persistent noise can move a decision. Inside it, a forecast says "a close call". */
export const JOIN_NOISE = 0.05;
/** How much heavier a call makes what a member owes (planning value). */
const CALL_RAISE = 0.2;
/** Starting weights on each term, to calibrate rather than law. */
const W = {
    obligation: 0.45,
    reliability: 1.2,
    bond: 0.35,
    enmity: 0.2,
    stakes: 0.15,
    defenderSituation: 0.15,
    aggressorSituation: -0.15,
    regimeDanger: -0.15,
    warsFought: -0.1,
    appetite: 0.8,
    isolationism: 0.6,
    legalism: 0.3,
};
/** How many governments a war names for staying out. More than three and the list is a census, not news. */
const NOTABLE_NON_JOINERS = 3;
const r4 = (value) => Math.round(value * 10000) / 10000 + 0;
function principalOf(conflict, side) {
    return side === "defender" ? conflict.defender : conflict.aggressor;
}
function opponentOf(conflict, side) {
    return side === "defender" ? conflict.aggressor : conflict.defender;
}
function nationLabel(campaign, nation) {
    return selectNation(campaign, nation)?.base.identity.name ?? nation;
}
function bodyName(org) {
    return organizations.find((body) => body.id === org)?.name ?? org;
}
/** How many other wars this government is already fighting. A second front is a reason not to open a third. */
function warsUnderWay(campaign, nation, except) {
    return selectActiveConflicts(campaign).filter((other) => other.id !== except && sideOf(other, nation) !== undefined).length;
}
/**
 * A government in danger at home keeps its army there: the agent's survival
 * drive, where it has turned against the regime (an insecure government whose
 * elite is split). Restated rather than imported, because `governance.ts`
 * reads the policy table when it loads and the war modules load inside that
 * cycle; the paired test pins the two readings equal for every government.
 */
export function regimeDanger(runtime) {
    const insecurity = Math.max(0, Math.min(1, 1 - runtime.stats.politics.regimeStability));
    return Math.max(0, insecurity * (runtime.stats.politics.factionalism * 2 - 1)) + 0;
}
/** What the government owes and wants: the terms that do not come from its character. */
function interestTerms(campaign, conflict, runtime, side, partner, obligation) {
    const nation = runtime.base.id;
    const rel = campaign.relationships[relationshipKey(nation, partner)];
    const against = campaign.relationships[relationshipKey(nation, opponentOf(conflict, side))];
    const neighbors = runtime.base.geo.neighbors ?? [];
    const borders = neighbors.includes(conflict.aggressor) || neighbors.includes(conflict.defender);
    const dependent = (rel?.tradeDependence ?? 0) >= 0.2;
    return [
        { key: "obligation", source: "obligation", value: r4(W.obligation * obligation) },
        { key: "bond", source: "interest", value: r4(W.bond * Math.max(0, rel?.trust ?? 0)) },
        { key: "enmity", source: "interest", value: against ? r4((W.enmity * (1 - disposition(against, campaign))) / 2) : 0 },
        { key: "stakes", source: "interest", value: borders || dependent ? W.stakes : 0 },
        { key: "defender-situation", source: "situation", value: side === "defender" ? r4(W.defenderSituation * conflict.intensity) : 0 },
        { key: "aggressor-situation", source: "situation", value: side === "aggressor" ? W.aggressorSituation : 0 },
        { key: "regime-danger", source: "situation", value: r4(W.regimeDanger * regimeDanger(runtime)) },
        { key: "wars-fought", source: "situation", value: r4(W.warsFought * warsUnderWay(campaign, nation, conflict.id)) },
    ];
}
/**
 * What the government is like, measured against the authored world's middle
 * and weighted by how well the dataset knows it: an archetype's personality
 * must not decide a war. Reliability scales an obligation both ways and is
 * nothing where there is none; legalism only brakes an attack.
 */
function characterTerms(campaign, runtime, side, obligation) {
    const temper = liveTemperament(campaign, runtime.base.id) ?? runtime.traits;
    const f = FIDELITY_WEIGHT[runtime.base.fidelity ?? "full"];
    const c = TEMPERAMENT_CENTER;
    return [
        { key: "reliability", source: "trait", value: r4(W.obligation * obligation * f * W.reliability * (temper.reliability - c.reliability)) },
        { key: "appetite", source: "trait", value: r4(f * W.appetite * (appetite(temper) - c.appetite)) },
        { key: "isolationism", source: "trait", value: r4(-f * W.isolationism * (temper.isolationism - c.isolationism)) },
        { key: "legalism", source: "trait", value: side === "aggressor" ? r4(-f * W.legalism * (temper.legalism - c.legalism)) : 0 },
    ];
}
/** The body the United States has called on that this government sits in, if the call reaches it on this side. */
function callReaching(campaign, conflict, runtime, side) {
    if (sideOf(conflict, campaign.founding.nation) !== side)
        return undefined;
    return calledCompactsIn(campaign, conflict.id).find((org) => runtime.base.memberships.includes(org));
}
/** What the shared bodies oblige toward one government on this side. A defense treaty binds its members to the victim, never to an attack. */
function owedTo(campaign, conflict, runtime, side, partner) {
    const partnerRuntime = selectNation(campaign, partner);
    if (!partnerRuntime)
        return 0;
    const victim = side === "defender" && principalOf(conflict, side) === partner;
    const bodies = sharedBodies(runtime.base.memberships, partnerRuntime.base.memberships);
    return obligationWeight(bodies, victim ? partnerRuntime.base.geo.region : undefined);
}
/**
 * The standing question one government has about one side of a war, or
 * nothing where it has no question to answer: the President's own country, a
 * party already, a government that has left this war, or one with no dealings
 * at all with the side it would be fighting beside.
 */
export function joinReading(campaign, conflict, nation, side) {
    if (!isWorldActor(campaign, nation))
        return undefined;
    if (sideOf(conflict, nation) !== undefined || (conflict.left ?? []).includes(nation))
        return undefined;
    const runtime = selectNation(campaign, nation);
    if (!runtime)
        return undefined;
    const calledBody = callReaching(campaign, conflict, runtime, side);
    const partner = calledBody ? campaign.founding.nation : principalOf(conflict, side);
    if (!selectNation(campaign, partner) || !campaign.relationships[relationshipKey(nation, partner)])
        return undefined;
    // A call adds to what the government owes the side's principal; it never
    // replaces it, so an ally called to defend a treaty partner still owes that
    // partner the treaty.
    const obligation = Math.max(owedTo(campaign, conflict, runtime, side, principalOf(conflict, side)), calledBody ? owedTo(campaign, conflict, runtime, side, partner) : 0);
    const terms = [...interestTerms(campaign, conflict, runtime, side, partner, obligation), ...characterTerms(campaign, runtime, side, obligation)];
    const called = calledBody ? [{ key: "call-raised", source: "obligation", value: r4(W.obligation * CALL_RAISE * obligation) }] : [];
    return {
        nation,
        side,
        question: calledBody ? "answer-call" : "join-war",
        partner,
        ...(calledBody ? { calledBody } : {}),
        obligation,
        terms: [...terms, ...called],
        threshold: calledBody ? CALL_THRESHOLD : JOIN_THRESHOLD,
    };
}
/** The decision, with the one persistent draw a standing question is allowed. */
export function weighJoin(reading, conflict, streams) {
    const noise = noiseFrom(willDraw(streams, reading.question, reading.nation, conflict.id), JOIN_NOISE);
    return weigh(reading.question, reading.terms, { threshold: reading.threshold, noiseBound: JOIN_NOISE, noise });
}
/**
 * The graded answer. Forces at the bar; help short of fighting between the
 * aid bar and it, which a government's own turn acts on through its
 * assistance branch; below both, it stays out. The stamp of a government that
 * would send aid records that it did not send forces.
 */
export function joinGrade(willingness) {
    if (willingness.acts)
        return "forces";
    return willingness.score + willingness.noise >= JOIN_AID_THRESHOLD ? "aid" : "stayed-out";
}
function worldNations(campaign) {
    return Object.keys(campaign.nations).sort((a, b) => a.localeCompare(b));
}
/**
 * The better of a government's two standing questions about a war: the side
 * it would go in on if it went in on either. Both are weighed so the record
 * of a refusal names the side it came nearest to.
 */
function decideFor(campaign, conflict, nation, streams) {
    const weighed = ["defender", "aggressor"].flatMap((side) => {
        const reading = joinReading(campaign, conflict, nation, side);
        return reading ? [{ reading, willingness: weighJoin(reading, conflict, streams) }] : [];
    });
    if (weighed.length === 0)
        return undefined;
    const best = weighed.reduce((a, b) => (b.willingness.margin > a.willingness.margin ? b : a));
    // The same reach rule a deliberate intervention is held to, asked only of a
    // government that is willing, so a country with no way to reach the theater
    // is not drawn into a war it then contributes nothing to.
    const joins = best.willingness.acts && joinCapability(campaign, nation, conflict).ok;
    return { ...best, joins };
}
/** Every government's answer about this war this week, in a stable order. */
export function weekOfJoins(campaign, conflict, streams) {
    return worldNations(campaign).flatMap((nation) => {
        const decision = decideFor(campaign, conflict, nation, streams);
        return decision ? [decision] : [];
    });
}
/** What entering does to the joiner's view of the side it is now fighting, and the forces it commits. */
function joinerEffects(campaign, conflict, decision) {
    const { nation, side } = decision.reading;
    const opponent = opponentOf(conflict, side);
    // Toward the side it is now fighting, which is the principal it did not
    // join. A different edge from the one its ties were read on, and one the
    // graph need not have.
    const hostility = campaign.relationships[relationshipKey(nation, opponent)]
        ? [{ kind: "relationship", from: nation, to: opponent, deltas: { tension: 0.3, trust: -0.3 } }]
        : [];
    const committed = joinerCommitment(campaign, nation, conflict.id);
    return committed ? [...hostility, { kind: "commitment", set: committed }] : hostility;
}
export function allyJoinEffects(campaign, conflict, streams) {
    const joined = { aggressor: [], defender: [] };
    const beats = [], effects = [];
    for (const decision of weekOfJoins(campaign, conflict, streams)) {
        const { nation, side } = decision.reading;
        // Every party sits the question out, the President's country included.
        if (!decision.joins || sideOf(conflict, nation) !== undefined)
            continue;
        joined[side].push(nation);
        beats.push(`${nationLabel(campaign, nation)} enters the war beside ${nationLabel(campaign, principalOf(conflict, side))}.`);
        effects.push(...joinerEffects(campaign, conflict, decision));
    }
    return { effects, joined, beats };
}
// --- The record each decision leaves ---
/** What has already been stamped about this war, so a standing refusal is written down once rather than every week. */
function stampedAbout(campaign, conflictId) {
    const seen = new Set();
    for (const entry of campaign.ledger) {
        const stamp = entry.causal?.decision;
        if (stamp?.subject === conflictId)
            seen.add(`${stamp.question}:${stamp.actor}:${stamp.acts}`);
    }
    return seen;
}
function notableCount(seen) {
    return [...seen].filter((key) => key.startsWith("join-war:") && key.endsWith(":false")).length;
}
/**
 * A government worth naming for staying out: a defense partner of the victim
 * that borders a belligerent, or one close enough to the bar that the noise
 * could have sent it in.
 */
function isNotable(campaign, conflict, decision) {
    if (decision.joins || decision.willingness.acts || decision.reading.question !== "join-war")
        return false;
    if (decision.reading.side !== "defender" || decision.reading.obligation < 1)
        return false;
    const neighbors = selectNation(campaign, decision.reading.nation)?.base.geo.neighbors ?? [];
    const borders = neighbors.includes(conflict.aggressor) || neighbors.includes(conflict.defender);
    return borders || Math.abs(decision.willingness.margin) < JOIN_NOISE;
}
/** The event alone: a refusal names no motive, because the motive is the stamp's and the fog decides who reads it. */
function headlineFor(campaign, conflict, decision) {
    const { nation, side, calledBody } = decision.reading;
    const name = nationLabel(campaign, nation);
    if (calledBody) {
        return decision.joins
            ? `${name} answers the call from ${bodyName(calledBody)} and sends forces.`
            : `${name} declines the call from ${bodyName(calledBody)} and sends no forces.`;
    }
    return decision.joins
        ? `${name} enters the war beside ${nationLabel(campaign, principalOf(conflict, side))}.`
        : `${name} has not sent forces to the war beside ${nationLabel(campaign, principalOf(conflict, side))}.`;
}
function decisionPacket(campaign, conflict, decision) {
    const refusedCall = decision.reading.question === "answer-call" && !decision.joins;
    // A refusal to fight is an intelligence read unless it was a public answer to a public call.
    const visibility = decision.joins || refusedCall ? "public" : "intelligence";
    const headline = headlineFor(campaign, conflict, decision);
    return {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        narration: { summary: headline },
        effects: [
            {
                kind: "feed",
                items: [{ turn: campaign.turn + 1, kind: "conflict", visibility, headline, actor: decision.reading.nation, target: opponentOf(conflict, decision.reading.side) }],
            },
        ],
        provenance: {
            origin: "world",
            entities: [decision.reading.nation, conflict.id, ...(decision.reading.calledBody ? [decision.reading.calledBody] : [])],
            systems: ["alliances"],
            visibility,
            decision: stampOf(decision.willingness, decision.reading.nation, conflict.id, visibility),
        },
    };
}
/**
 * The reasons of record for this week's decisions about one war: every join,
 * every refusal of a call the United States made, and at most three
 * governments named for staying out, each written once. The state a join
 * changes rides the war's own week; this is its reason, recorded beside it
 * the way a governor's answer is recorded beside the federal act it allowed.
 *
 * Read against the board the war's week is fought on, so the two cannot
 * disagree about who came in.
 */
export function joinDecisionPackets(campaign, conflict, streams) {
    const seen = stampedAbout(campaign, conflict.id);
    const decisions = weekOfJoins(campaign, conflict, streams);
    const unstamped = (decision) => !seen.has(`${decision.reading.question}:${decision.reading.nation}:${decision.joins}`);
    const joins = decisions.filter((decision) => decision.joins);
    const refusedCalls = decisions.filter((decision) => decision.reading.question === "answer-call" && !decision.willingness.acts && unstamped(decision));
    const room = Math.max(0, NOTABLE_NON_JOINERS - notableCount(seen));
    const notable = decisions
        .filter((decision) => isNotable(campaign, conflict, decision) && unstamped(decision))
        .sort((a, b) => b.willingness.margin - a.willingness.margin)
        .slice(0, room);
    return [...joins, ...refusedCalls, ...notable].map((decision) => decisionPacket(campaign, conflict, decision));
}
function forecastOf(reading) {
    const projection = projectWillingness(reading.question, reading.terms, { threshold: reading.threshold, noiseBound: JOIN_NOISE });
    return { nation: reading.nation, side: reading.side, forecast: projection.forecast, leading: projection.leading, margin: projection.margin };
}
const withoutMargin = ({ nation, side, forecast, leading }) => ({ nation, side, forecast, leading });
/**
 * Who is likely to join one side of a war the board may not carry yet: an
 * aggressor weighing an attack reads this about the war it would start.
 * Likely and close calls both, because a close call is exactly the government
 * an attacker cannot count on staying out.
 */
export function likelyJoinersOf(campaign, conflict, side) {
    return worldNations(campaign)
        .flatMap((nation) => {
        const reading = joinReading(campaign, conflict, nation, side);
        if (!reading)
            return [];
        const forecast = forecastOf(reading);
        return forecast.forecast === "unlikely" || !joinCapability(campaign, nation, conflict).ok ? [] : [forecast];
    })
        .sort((a, b) => b.margin - a.margin || a.nation.localeCompare(b.nation))
        .map(withoutMargin);
}
/**
 * Who is likely to join one side of a war on the board, forecast without a
 * draw, as the President's services can read it. The forecast weighs a
 * government's temperament, so a government they cannot read is left off
 * rather than forecast from what nobody in Washington knows. The aggressor's
 * own reckoning (`alliedDeterrence`) reads the unfogged list.
 */
export function projectLikelyJoiners(campaign, conflictId, side) {
    const conflict = campaign.conflicts[conflictId];
    if (!conflict || conflict.status !== "active")
        return [];
    return likelyJoinersOf(campaign, conflict, side).filter((joiner) => hasIntelOnNation(campaign, joiner.nation));
}
/** How each member of a body the United States could call would answer, read before the call is made. */
export function projectCallAnswers(campaign, org, conflictId) {
    const conflict = campaign.conflicts[conflictId];
    const side = conflict ? sideOf(conflict, campaign.founding.nation) : undefined;
    if (!conflict || conflict.status !== "active" || side === undefined)
        return [];
    const asCalled = {
        ...campaign,
        player: { ...campaign.player, flags: { ...campaign.player.flags, [usCallFlag(org, conflictId)]: true } },
    };
    return worldNations(asCalled).flatMap((nation) => {
        const reading = joinReading(asCalled, conflict, nation, side);
        return reading && reading.calledBody === org ? [withoutMargin(forecastOf(reading))] : [];
    });
}
/** What one government brings to a war fought away from home, on the profile the weekly tick scores sides with. */
function usableStrength(campaign, nation) {
    const runtime = selectNation(campaign, nation);
    if (!runtime)
        return 0;
    const profile = forceProjectionProfile(liveNation(runtime));
    return Math.max(profile.expeditionary, profile.regionalProjection * 0.7);
}
/**
 * What the victim's likely allies put in an attacker's way: who they are, and
 * their share of the strength the attacker would face beside its own. Read
 * for a war that has not started, so an alliance deters by the governments it
 * would actually bring rather than by the paper.
 */
export function alliedDeterrence(campaign, hypothetical) {
    const expectedJoiners = likelyJoinersOf(campaign, hypothetical, "defender").map((joiner) => joiner.nation);
    const allied = expectedJoiners.reduce((sum, nation) => sum + usableStrength(campaign, nation), 0);
    const own = Math.max(usableStrength(campaign, hypothetical.aggressor), 0.05);
    const alliedSeverity = allied > 0 ? Math.round((allied / (allied + own)) * 1000) / 1000 : 0;
    if (expectedJoiners.length === 0)
        return { expectedJoiners, alliedSeverity };
    const line = expectedJoiners.length === 1
        ? "One government is likely to come into the war beside the defender."
        : `${expectedJoiners.length} governments are likely to come into the war beside the defender.`;
    return { expectedJoiners, alliedSeverity, line };
}
/**
 * The peer-relative counterfactual: the same government in the same seat
 * with a typical government's character, which puts its character terms at
 * the world's middle and so at zero. A joiner whose counterfactual falls short
 * came in by character; a non-joiner whose counterfactual clears stayed out
 * by it. The noise is left out, as a projection's is.
 */
export function joinCounterfactual(campaign, conflictId, nation) {
    const conflict = campaign.conflicts[conflictId];
    if (!conflict)
        return undefined;
    const side = sideOf(conflict, nation);
    const asBystander = side === undefined ? conflict : { ...conflict, joined: { ...conflict.joined, [side]: conflict.joined[side].filter((id) => id !== nation) } };
    const typical = ["defender", "aggressor"].flatMap((each) => {
        const reading = side === undefined || side === each ? joinReading(campaign, asBystander, nation, each) : undefined;
        if (!reading)
            return [];
        const structural = reading.terms.filter((term) => term.source !== "trait").reduce((sum, term) => sum + term.value, 0);
        return [{ side: each, margin: r4(structural - reading.threshold) }];
    });
    if (typical.length === 0)
        return undefined;
    const best = typical.reduce((a, b) => (b.margin > a.margin ? b : a));
    return { nation, side: best.side, margin: best.margin };
}
