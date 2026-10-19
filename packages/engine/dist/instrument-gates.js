import { forceAssetLabel, organizationById } from "@admin/world";
import { warPowersStanding } from "./congress.js";
import { lawsBarUnilateralForce } from "./legislation.js";
import { MILITARY_READINESS_COST, MILITARY_READINESS_GATES, availableUnits, availableUnitsOfType } from "./capacity.js";
import { forceScale, specAgainst, specForRung } from "./force-packages.js";
import { selectNation, selectRelationship } from "./state.js";
import { forceProjectionCost } from "./geography.js";
import { stagingPoints } from "./staging.js";
import { usHostIds, withinMissileReach } from "./missile-reach.js";
// --- Reading live state: authored base plus this campaign's rolled stats. ---
export function liveNation(campaign, id) {
    const runtime = selectNation(campaign, id);
    if (!runtime)
        throw new Error(`no nation ${id} in this campaign`);
    return { ...runtime.base, stats: runtime.stats, traits: runtime.traits };
}
export function liveRelationship(campaign, from, to) {
    const rel = selectRelationship(campaign, from, to);
    if (!rel)
        throw new Error(`no relationship ${from} -> ${to} to attempt an instrument against`);
    return rel;
}
/** The bodies a government sits in this week: its authored roster, as any accession or withdrawal since has changed it. */
export function liveMemberships(campaign, id) {
    const runtime = selectNation(campaign, id);
    if (!runtime)
        return [];
    return runtime.memberships ?? runtime.base.memberships;
}
/**
 * Whether a government still sets its own tariffs against this target.
 *
 * A customs-union member has handed its tariff schedule to the union: it
 * raises a tariff on nobody alone, and the bloc acts as a bloc through its own
 * sanctions package. A free-trade-area member keeps its schedule against the
 * world and has dropped it against fellow members, so it cannot raise one on a
 * partner inside the area.
 */
export function tariffCompetence(campaign, actor, target) {
    const theirs = new Set(liveMemberships(campaign, target).map((id) => id));
    for (const id of liveMemberships(campaign, actor)) {
        const body = organizationById.get(id);
        if (body?.tradeCompetence === "customs-union") {
            return { ok: false, missingCapability: `a tariff schedule of its own, which it handed to the ${body.name}` };
        }
        if (body?.tradeCompetence === "fta" && theirs.has(id)) {
            return { ok: false, missingCapability: `a tariff it can raise on a fellow member of the ${body.name}` };
        }
    }
    return { ok: true };
}
/**
 * A strike that needs no air force over the target: the actor's missiles reach
 * the target's capital, or a country hosting the United States' forces when
 * the target is the United States. The alternative to the air-strength and
 * airframe gates on the strike rung, for a government whose answer is a missile.
 */
export function standoffReach(ctx) {
    const actor = liveNation(ctx.campaign, ctx.actor);
    const target = liveNation(ctx.campaign, ctx.target);
    const hosts = ctx.target === ctx.campaign.founding.nation
        ? usHostIds().flatMap((id) => (selectNation(ctx.campaign, id) ? [liveNation(ctx.campaign, id)] : []))
        : [];
    return withinMissileReach(actor, target, hosts)
        ? { ok: true }
        : { ok: false, missingCapability: "missiles that reach the target or its forces nearby" };
}
/**
 * Whether a strike this actor can make is a missile strike: it lacks the air
 * force the flown strike needs and its missiles reach. The strike's resolution
 * reads this so a missile salvo does not commit two hundred airframes.
 */
export function strikesByMissile(ctx) {
    const air = liveNation(ctx.campaign, ctx.actor).stats.military.branchStrength.air;
    return air < 0.4 && standoffReach(ctx).ok;
}
export function sharesBorder(actor, target) {
    return actor.geo.neighbors.some((n) => n === target.id);
}
// A deterministic per-attempt draw for effect-magnitude variance — same seed,
// same turn, same actor/target/rung always produces the same jitter.
export function jitter(ctx, spread = 0.2) {
    const stream = ctx.streams.stream("instruments", ctx.actor, ctx.target, ctx.campaign.turn);
    return 1 - spread / 2 + stream.next() * spread;
}
// --- Capability check combinators ---
export function requireAtLeast(value, min, capability, reading) {
    if (value >= min)
        return { ok: true };
    return { ok: false, missingCapability: capability, ...(reading ? { shortfall: { reading, have: value, need: min } } : {}) };
}
export function requireTrue(condition, capability) {
    return condition ? { ok: true } : { ok: false, missingCapability: capability };
}
export function requireAll(...checks) {
    return checks.find((c) => !c.ok) ?? { ok: true };
}
/** Either way in is enough; where neither is, the first way's missing capability is the one named. */
export function requireAny(...checks) {
    return checks.find((c) => c.ok) ?? checks[0] ?? { ok: true };
}
/**
 * A rung whose whole effect is to stand something up refuses while it stands.
 *
 * Three rungs at the top of three ladders — a full embargo, a severance of
 * relations, a security guarantee — do not describe an act so much as a state,
 * and the state is recorded as a flag. Nothing stopped any of them being
 * ordered again the following week against a country they were already in
 * force against, so the heaviest move on three ladders was also the most
 * repeatable one: the balance harness's reckless proxy spent half its term
 * embargoing countries it had already embargoed. Breaking off relations twice
 * is not twice as severe; it is the second one meaning nothing.
 */
export function notAlreadyStanding(ctx, flag, capability) {
    return requireTrue(!ctx.campaign.player.flags[flag], capability);
}
export const PROJECTION_CAPS = { 3: 2, 4: 1.5, 5: 1.3 };
/**
 * Whether the actor can get force to the target at this rung: a shared border,
 * or a projection cost under the rung's cap, measured from the nearest
 * installation or treaty ally the actor can mount from (`staging.ts`).
 */
export function projectionAccess(ctx, cap, capability) {
    const actor = liveNation(ctx.campaign, ctx.actor);
    const target = liveNation(ctx.campaign, ctx.target);
    if (sharesBorder(actor, target))
        return { ok: true };
    const { multiplier } = forceProjectionCost(actor, target, stagingPoints(ctx.campaign, ctx.actor, ctx.target));
    return requireAtLeast(cap, multiplier, capability);
}
/**
 * The capacity half of a military gate: what the services have available now,
 * as opposed to what they are on paper.
 *
 * Branch strength alone was the whole check, and branch strength is authored
 * and static — so a superpower held the top rung open forever and nothing an
 * administration did made next week's decision any harder. Readiness is the
 * figure the ladder already *charged* for military action and gated nothing
 * with; pairing the two is what turns a permanent capability into a rate.
 */
/**
 * A government with a declared arsenal and the means to deliver it is not
 * offered as a target of force by anyone: no blockade, strike or invasion. The
 * test is the dataset's own (`arsenal.declared` and `deliveryTriad`), so no
 * list of countries drifts out of date, and a state that has never declared its
 * arsenal is read as it presents itself. Below that line a nuclear defender
 * still stiffens the odds (`resolution.ts`), which is information, not a wall.
 */
export function outsideNuclearDeterrence(ctx) {
    const arsenal = liveNation(ctx.campaign, ctx.target).stats.military.arsenal;
    const deterred = arsenal.warheads > 0 && arsenal.declared !== false && arsenal.deliveryTriad;
    return requireTrue(!deterred, "a target without a declared nuclear arsenal it can deliver, since force against one is refused");
}
/**
 * Readiness already promised to orders that have not executed, at their
 * unjittered bill. Readiness is spent only when an act lands, so without this a
 * run of timed strikes all pass the gate at issue and the later ones are
 * refused at execution after the President was shown them as lawful.
 */
function committedReadiness(campaign, actor) {
    let committed = 0;
    for (const act of Object.values(campaign.issuedActs ?? {})) {
        if (act.kind !== "instrument" || act.request.actor !== actor || act.request.instrument !== "military")
            continue;
        if (act.status !== "issued" && act.status !== "in-progress" && act.status !== "awaiting-response")
            continue;
        const rung = act.request.rung;
        if (rung !== 3 && rung !== 4 && rung !== 5)
            continue;
        committed += MILITARY_READINESS_COST[rung] * forceScale(rung, act.request.force);
    }
    return committed;
}
export function forceAvailable(ctx, rung) {
    const required = MILITARY_READINESS_GATES[rung];
    return requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.military.readiness - committedReadiness(ctx.campaign, ctx.actor), required, "the readiness this takes, since a force that has been spent cannot be spent again until it is rebuilt");
}
export function packageFormations(ctx, rung, fallbackBranch, fallbackCount, fallbackType, capability) {
    const base = specForRung(rung);
    const sized = base ? specAgainst(ctx.campaign, ctx.target, base) : undefined;
    // An act already issued carries the proposal it was sized at; its floor is
    // read from that, so a target growing stronger during preparation cannot
    // expire an order that was legal when it was given.
    const preferred = ctx.force?.preferred;
    const spec = sized && base && preferred !== undefined
        ? { ...sized, min: Math.min(base.min, Math.max(1, Math.ceil(preferred / 2))) }
        : sized;
    const force = ctx.force ?? { branch: fallbackBranch, unitType: fallbackType, count: fallbackCount };
    if (spec && force.count < spec.min) {
        return { ok: false, missingCapability: `${spec.min} ${forceAssetLabel(spec.unitType).toLowerCase()} — below the floor this package is built from` };
    }
    const byType = availableUnitsOfType(ctx.campaign, ctx.actor, force.branch, force.unitType);
    if (byType !== undefined)
        return requireAtLeast(byType, force.count, capability);
    return formationsAvailable(ctx, force.branch, force.count, capability);
}
/**
 * The formations a rung actually consumes, where the actor ships an order of
 * battle to consume them from.
 *
 * Undefined availability is not zero: most nations author no decomposition,
 * and reading a missing one as an empty bench would refuse them rungs they
 * have always been able to take on the strength of authoring nobody has done.
 */
function formationsAvailable(ctx, branch, needed, capability) {
    const available = availableUnits(ctx.campaign, ctx.actor, branch);
    if (available === undefined)
        return { ok: true };
    return requireAtLeast(available, needed, capability);
}
/**
 * The constitutional half of a military gate.
 *
 * Readiness and formations say what the services could do; this says what the
 * office is allowed to order. A president may introduce forces on their own
 * authority and answer for it — the first rung 4 or 5 against a country is
 * theirs to take, at a price Congress remembers — but sustaining it, or opening
 * a second front while the first has never been voted on, is not latitude the
 * office has. That is the missing constraint the whole force ceiling was
 * standing in for: money never stopped a superpower and readiness only sets a
 * tempo, so a president refused nothing simply aimed at the next capital.
 *
 * Applied to the player's own government and to nobody else's, because the
 * campaign carries one legislature and it is theirs. Every other capital is
 * modeled by its standing program, and holding a foreign government to a
 * Congress it does not have would be inventing a branch for fifty countries.
 */
export function warPowers(ctx, rung) {
    return warPowersCheck(ctx.campaign, ctx.actor, ctx.target, rung);
}
/**
 * The same check for any act that introduces forces, the ladder's or not.
 * Entering somebody else's war is held to it too, so there is one statute and
 * no second door into a war that the office's authority does not reach.
 */
export function warPowersCheck(campaign, actor, target, rung) {
    if (actor !== campaign.founding.nation)
        return { ok: true };
    const standing = warPowersStanding(campaign, target, rung);
    // Congress can take the latitude away by statute, and has. Where it has, the
    // first action needs the vote too, and the only route to the rung is a vote.
    if (standing.kind === "unilateral" && lawsBarUnilateralForce(campaign)) {
        return {
            ok: false,
            missingCapability: "a congressional authorization for the use of military force — statute has withdrawn the latitude the office would otherwise have had",
        };
    }
    if (standing.kind !== "requires-authorization")
        return { ok: true };
    return { ok: false, missingCapability: `a congressional authorization for the use of military force — ${standing.reason}` };
}
