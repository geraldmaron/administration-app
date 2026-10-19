import { treatyAllyOf } from "./article-ties.js";
import { selectConflictBetween, sideOf } from "./conflicts.js";
import { successionPacket } from "./foreign-politics.js";
import { liveNation, projectionAccess, PROJECTION_CAPS, requireAll, requireAtLeast, requireTrue, warPowers, } from "./instrument-gates.js";
import { eligibleExternalThreats } from "./external-emergency.js";
import { findingGate } from "./finding-gate.js";
import { covertRecord, forceIntroduction, named, warPowersRecord } from "./instrument-records.js";
import { markedFlags } from "./marked-flags.js";
import { REGIME_DIALS } from "./regime-dials.js";
import { indictmentId, isStandingAct, nuclearArmed, openIndictment, runningOperations, startOperationEffect } from "./regime-acts.js";
// The regime rung's slot on the covert ladder carries four acts. Coup support
// and political action are standing covert operations through the existing coup,
// selection and confidence draws; a lethal operation seats the charter's
// successor through the existing succession, only on the grounds EO 12333 §2.11
// leaves open (an armed conflict with the target or an imminent threat from it,
// never an ally). The other two are not covert and ride the slot only as a
// request field: an indictment is the Justice Department's act, and capture is
// a use of force that serves an open indictment, opens the War Powers record
// and is never secret.
/** The act a covert regime action runs when the actor names none. */
export const DEFAULT_REGIME_ACT = "coup-support";
/** Whether an act runs under a covert finding and tradecraft, rather than as a use of force or a Justice Department filing. */
export function isCovertRegimeAct(act) {
    return act !== "capture" && act !== "indict";
}
/** The counsel's reading a lethal operation rests on, for the review sheet: the ground that takes it outside the ban. */
export function lethalGround(campaign, actor, target) {
    if (lethalRefusal(campaign, actor, target) !== undefined)
        return undefined;
    return inArmedConflictWith(campaign, actor, target) ? "armed-conflict" : "imminent-threat";
}
/** Whether the actor and the target fight on opposite sides of a live war. */
function inArmedConflictWith(campaign, actor, target) {
    const conflict = selectConflictBetween(campaign, actor, target);
    return conflict !== undefined && sideOf(conflict, actor) !== sideOf(conflict, target);
}
/**
 * Why a lethal operation against this leader cannot be authorized, or nothing.
 *
 * EO 12333 §2.11 and 18 U.S.C. §1116 stay in force: the executive does not
 * amend them. What it can do is conclude that a particular killing is an act in
 * an armed conflict or lawful self-defense against an imminent threat, which
 * takes it outside "assassination", and it can never reach an ally.
 */
export function lethalRefusal(campaign, actor, target) {
    if (treatyAllyOf(campaign, actor, target))
        return "a target that is not a treaty ally";
    const imminent = actor === campaign.founding.nation && eligibleExternalThreats(campaign).some((pursuit) => pursuit.actor === target && pursuit.aim === "security");
    if (!inArmedConflictWith(campaign, actor, target) && !imminent) {
        return "an armed conflict with the target, or an imminent threat from it, that takes the operation outside the ban on assassination";
    }
    return undefined;
}
/** The share of lethal removals that come out, whatever the cover: no such operation stays quiet for long. Design judgment, labeled. */
export const LETHAL_EXPOSURE_CHANCE = 0.6;
function actOf(ctx) {
    return ctx.regimeAct ?? DEFAULT_REGIME_ACT;
}
/** Why a leader cannot be taken into custody, or nothing: the President's government only, an open indictment, and no treaty ally unless a war stands between them. */
export function captureRefusal(campaign, actor, target) {
    if (actor !== campaign.founding.nation)
        return "an act reserved to the President's government";
    if (openIndictment(campaign, target) === undefined)
        return "an open federal indictment of the leader, filed by the Justice Department";
    if (treatyAllyOf(campaign, actor, target) && !inArmedConflictWith(campaign, actor, target))
        return "a target that is not a treaty ally, unless a war stands between you";
    return undefined;
}
/** Why an indictment cannot be filed, or nothing: only the President's Justice Department files, once per leader, and not against the government of a treaty ally. */
export function indictRefusal(campaign, actor, target) {
    if (actor !== campaign.founding.nation)
        return "an act reserved to the President's government";
    if (openIndictment(campaign, target) !== undefined)
        return "a leader not already under an open indictment";
    if (treatyAllyOf(campaign, actor, target))
        return "a target that is not a treaty ally";
    return undefined;
}
function nonCovertGate(ctx, act) {
    if (act === "indict") {
        const refusal = indictRefusal(ctx.campaign, ctx.actor, ctx.target);
        return requireTrue(refusal === undefined, refusal ?? "");
    }
    const refusal = captureRefusal(ctx.campaign, ctx.actor, ctx.target);
    const actor = liveNation(ctx.campaign, ctx.actor).stats.military;
    return requireAll(requireTrue(refusal === undefined, refusal ?? ""), requireTrue(!nuclearArmed(ctx.campaign, ctx.target), "a target without a declared arsenal it can deliver"), requireAtLeast(Math.max(actor.branchStrength.air, actor.branchStrength.land), 0.4, "the air or land branch strength to put a raiding force on the ground"), projectionAccess(ctx, PROJECTION_CAPS[4], "reach to put a raiding force on the ground at this distance"), warPowers(ctx, 4));
}
/** What every regime act needs on top of the rung's own capability gate. */
export function regimeActGate(ctx) {
    const act = actOf(ctx);
    if (!isCovertRegimeAct(act))
        return nonCovertGate(ctx, act);
    return requireAll(requireTrue(!nuclearArmed(ctx.campaign, ctx.target), "a target without a declared arsenal it can deliver"), requireTrue(act !== "kill" || lethalRefusal(ctx.campaign, ctx.actor, ctx.target) === undefined, lethalRefusal(ctx.campaign, ctx.actor, ctx.target) ?? ""), findingGate(ctx), requireTrue(!isStandingAct(act) || !runningOperations(ctx.campaign, ctx.target).some((op) => op.sponsor === ctx.actor && op.act === act), "no operation of this kind already running against this government"));
}
function standingResolve(ctx, act) {
    return [
        startOperationEffect(ctx, act),
        { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { trust: -0.1 } },
    ];
}
function removalResolve(ctx, act) {
    const succession = successionPacket(ctx.campaign, ctx.target, "removed")?.effects ?? [];
    const exposed = ctx.streams.stream("regime-removal-exposure", ctx.actor, ctx.target, ctx.campaign.turn).next() < LETHAL_EXPOSURE_CHANCE;
    const ownStory = act === "kill" && exposed && ctx.actor === ctx.campaign.founding.nation;
    const op = startOperationEffect(ctx, act);
    return [
        op,
        ...succession,
        { kind: "relationship", from: ctx.target, to: ctx.actor, deltas: { trust: exposed ? -REGIME_DIALS.exposedGrudge : -0.1, tension: exposed ? 0.3 : 0.05 } },
        ...(ownStory ? [{ kind: "flag", set: markedFlags([`scandal:operation-against-the-leader-of-${ctx.target}`], ctx.campaign.turn) }] : []),
    ];
}
function indictResolve(ctx) {
    return [{ kind: "indictment", upsert: { id: indictmentId(ctx.target, ctx.campaign.turn), target: ctx.target, filedTurn: ctx.campaign.turn } }];
}
function captureResolve(ctx) {
    const name = named(ctx, ctx.target);
    const served = openIndictment(ctx.campaign, ctx.target);
    const succession = successionPacket(ctx.campaign, ctx.target, "removed")?.effects ?? [];
    return [
        ...warPowersRecord(ctx, 4, `A raid to take the leader of ${name} into custody, ordered without a vote.`),
        ...forceIntroduction(ctx, 4, `A raid to take the leader of ${name} into custody: forces introduced into hostilities.`),
        ...(served ? [{ kind: "indictment", upsert: { ...served, servedTurn: ctx.campaign.turn } }] : []),
        startOperationEffect(ctx, "capture"),
        ...succession,
        { kind: "relationship", from: ctx.target, to: ctx.actor, deltas: { trust: -REGIME_DIALS.exposedGrudge, tension: 0.3, militaryThreat: 0.2 } },
    ];
}
/** The regime rung's effects, by the act chosen. */
export function regimeActResolve(ctx) {
    const act = actOf(ctx);
    if (act === "indict")
        return indictResolve(ctx);
    if (act === "capture")
        return captureResolve(ctx);
    const name = named(ctx, ctx.target);
    const record = covertRecord(ctx, 5, isStandingAct(act) ? `Covert action against the government of ${name}.` : `An operation against the leader of ${name}.`);
    return [...record, ...(isStandingAct(act) ? standingResolve(ctx, act) : removalResolve(ctx, act)), { kind: "flag", set: markedFlags([`destabilized:${ctx.target}`], ctx.campaign.turn) }];
}
/** The rung's capability gate. Capture and indictment answer to their own gate, not to tradecraft or covert reach. */
export function regimeCapabilityGate(ctx, reach) {
    if (!isCovertRegimeAct(actOf(ctx)))
        return regimeActGate(ctx);
    const actor = liveNation(ctx.campaign, ctx.actor).stats.security;
    return requireAll(requireAtLeast(actor.intelCapability, 0.65, "the intel capability to move against a head of government"), requireAtLeast(actor.counterIntel, 0.4, "the counter-intel tradecraft to run this without immediate blowback"), reach, regimeActGate(ctx));
}
