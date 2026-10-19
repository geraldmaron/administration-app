import { strikeMissionEffects } from "./strike-mission.js";
import { MILITARY_READINESS_COST } from "./capacity.js";
import { forceScale, specForRung } from "./force-packages.js";
import { campaignCostIndex, forceCostBasis } from "./force-costs.js";
import { openOrEscalate } from "./conflicts.js";
import { blockadeBy, blockadeRecord } from "./blockades.js";
import { munitionsShortfall } from "./munitions.js";
import { possessive, sentenceCase } from "./naming.js";
import { PROJECTION_CAPS, forceAvailable, outsideNuclearDeterrence, jitter, liveNation, packageFormations, projectionAccess, requireAll, requireAny, requireAtLeast, requireTrue, sharesBorder, standoffReach, strikesByMissile, warPowers, } from "./instrument-gates.js";
import { acted, forceIntroduction, forceOnTheBoard, named, standingCommitment, warPowersRecord, } from "./instrument-records.js";
// --- Military ladder: leverage is branch strength, gated by projection cost — the ticket's example verbatim: no airlift, no expeditionary strike. ---
/**
 * A rung's bill against the force that took it, written on the actor's own
 * services rather than on the player's panel.
 *
 * It has to be the nation stat and not the metric, because the ladder is one
 * code path for the player and for every other capital: a cost only the
 * player's own panel carried would hand the world a tempo the player could not
 * match, and `forcePhase` would have nothing to regenerate. The player's panel
 * still moves, because `apply()` mirrors this nation's readiness onto it — one
 * force, written once, read in two places.
 */
export function spendsReadiness(ctx, rung) {
    const before = liveNation(ctx.campaign, ctx.actor).stats.military.readiness;
    const billed = MILITARY_READINESS_COST[rung] * rungScale(ctx, rung) * jitter(ctx);
    const after = Math.max(0, before - billed);
    return [{ kind: "nationStat", nation: ctx.actor, setStats: { military: { readiness: after } } }];
}
function rungScale(ctx, rung) {
    return forceScale(rung, ctx.force);
}
/** The package as ordered, or the rung's own at its preferred size: the count the act was priced at. */
function chosenForce(ctx, rung) {
    const spec = specForRung(rung);
    return ctx.force ?? { branch: spec.branch, unitType: spec.unitType, count: spec.preferred };
}
/** A spent munitions class refuses the rungs it supplies until a restock arrives. */
function munitionsOnHand(ctx, rung) {
    const shortfall = munitionsShortfall(ctx.campaign, ctx.actor, rung);
    return requireTrue(shortfall === undefined, shortfall ?? "");
}
/**
 * The force held out after the act, billed each week at what its days on
 * station cost (`force-costs.ts`); the passage there was in the act's own price.
 */
function packageCommitment(ctx, kind, rung, rationale, weeks) {
    const force = chosenForce(ctx, rung);
    const weekly = forceCostBasis(rung, force.count, campaignCostIndex(ctx.campaign, ctx.actor), 1, force.unitType).weekly;
    return standingCommitment(ctx, {
        kind,
        amountPerTurn: weekly,
        line: "defense",
        rationale,
        ...(weeks === undefined ? {} : { weeks }),
        forces: force,
    });
}
/**
 * What a landed blockade does: an act of war, reported as hostilities, that
 * opens or joins a war and stands on the record until the force comes home.
 * What it stops is read off that record each week (`blockades.ts`), never
 * written onto the target's trade.
 */
function blockadeEffects(ctx) {
    const conflict = openOrEscalate(ctx.campaign, ctx.actor, ctx.target, `${sentenceCase(named(ctx, ctx.actor))} closes ${possessive(named(ctx, ctx.target))} ports by force.`, "blockade");
    const holding = [
        ...forceIntroduction(ctx, 3, `A blockade of ${named(ctx, ctx.target)}: forces introduced into hostilities.`),
        ...packageCommitment(ctx, "deployment", 3, "A blockade is hulls on station until it is lifted, and those hulls are not at home."),
    ];
    return [
        acted(ctx, { militaryThreat: 0.25 * jitter(ctx) * rungScale(ctx, 3) }, {
            kind: "blockade",
            description: `${sentenceCase(named(ctx, ctx.actor))} blockaded ${possessive(named(ctx, ctx.target))} ports.`,
        }),
        ...warPowersRecord(ctx, 3, `A blockade of ${named(ctx, ctx.target)}, ordered without a vote.`),
        ...spendsReadiness(ctx, 3),
        { kind: "conflict", set: conflict },
        ...holding,
        blockadeRecord(ctx, conflict.id, holding),
    ];
}
export const militaryRungs = [
    {
        instrument: "military",
        rung: 1,
        id: "military-1",
        name: "Exercises",
        gate: (ctx) => requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.military.readiness, 0.1, "the readiness to make a show of force, since one that cannot parade cannot signal"),
        resolve: (ctx) => [{ kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { militaryThreat: 0.05 * jitter(ctx) } }],
    },
    {
        instrument: "military",
        rung: 2,
        id: "military-2",
        name: "Forward Deploy",
        gate: (ctx) => requireAll(requireTrue(sharesBorder(liveNation(ctx.campaign, ctx.actor), liveNation(ctx.campaign, ctx.target)) || liveNation(ctx.campaign, ctx.actor).stats.military.basesAbroad > 0, "a shared border or a base abroad to deploy forward from"), ctx.force
            ? packageFormations(ctx, 2, "navy", 1, "navy.aircraft-carrier", "one uncommitted carrier — presence is a hull on station, not a press statement")
            : { ok: true }),
        resolve: (ctx) => [
            ...forceIntroduction(ctx, 2, `Forces deployed forward toward ${named(ctx, ctx.target)}, equipped for combat.`),
            { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { militaryThreat: 0.15 * jitter(ctx) * rungScale(ctx, 2) } },
            ...(ctx.force
                ? packageCommitment(ctx, "deployment", 2, "A carrier group forward is a group not at home, and it stays until it is recalled.")
                : []),
        ],
    },
    {
        instrument: "military",
        rung: 3,
        id: "military-3",
        name: "Blockade",
        gate: (ctx) => requireAll(requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.military.branchStrength.naval, 0.3, "the naval branch strength a blockade is stood up out of"), outsideNuclearDeterrence(ctx), forceAvailable(ctx, 3), munitionsOnHand(ctx, 3), packageFormations(ctx, 3, "navy", 4, "navy.surface-combatant", "four uncommitted surface groups — the hulls a blockade is stood up out of"), requireTrue(liveNation(ctx.campaign, ctx.target).geo.coastline, "a country with a coast. Theirs has none, so there is nothing to blockade"), projectionAccess(ctx, PROJECTION_CAPS[3], "reach to sustain a blockade at this distance"), warPowers(ctx, 3), requireTrue(blockadeBy(ctx.campaign, ctx.actor, ctx.target) === undefined, "ports not already closed by this government's own blockade, which is still on station")),
        resolve: (ctx) => blockadeEffects(ctx),
    },
    {
        instrument: "military",
        rung: 4,
        id: "military-4",
        name: "Limited Strike",
        gate: (ctx) => requireAll(outsideNuclearDeterrence(ctx), forceAvailable(ctx, 4), warPowers(ctx, 4), munitionsOnHand(ctx, 4), requireAny(requireAll(requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.military.branchStrength.air, 0.4, "the air branch strength a strike is flown from"), packageFormations(ctx, 4, "air", 200, "air.fighter", "two hundred uncommitted airframes — a strike package and the tankers behind it"), projectionAccess(ctx, PROJECTION_CAPS[4], "reach to strike at this distance (airlift/sealift or proximity)")), standoffReach(ctx))),
        resolve: (ctx) => [
            ...spendsReadiness(ctx, 4),
            ...warPowersRecord(ctx, 4, `Air strikes against ${named(ctx, ctx.target)}, ordered without a vote.`),
            ...forceIntroduction(ctx, 4, `Air strikes against ${named(ctx, ctx.target)}: forces introduced into hostilities.`),
            ...strikeMissionEffects(ctx),
            acted(ctx, { tension: 0.3 * jitter(ctx) * rungScale(ctx, 4), militaryThreat: 0.3 * jitter(ctx) * rungScale(ctx, 4) }, {
                kind: "strike",
                description: `${sentenceCase(named(ctx, ctx.actor))} struck targets inside ${named(ctx, ctx.target)} ${strikesByMissile(ctx) ? "with missiles" : "from the air"}.`,
            }),
            ...forceOnTheBoard(ctx, `${sentenceCase(named(ctx, ctx.actor))} strikes ${named(ctx, ctx.target)} ${strikesByMissile(ctx) ? "with missiles" : "from the air"}.`),
            ...(strikesByMissile(ctx) ? [] : packageCommitment(ctx, "deployment", 4, "A strike package is on the line until it is recovered, and those airframes are not at home.", 2)),
        ],
    },
    {
        instrument: "military",
        rung: 5,
        id: "military-5",
        name: "Expeditionary Invasion",
        gate: (ctx) => requireAll(requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.military.branchStrength.land, 0.5, "the land branch strength an intervention is mounted from"), requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.military.branchStrength.air, 0.4, "the air branch strength that has to cover it"), requireAtLeast((liveNation(ctx.campaign, ctx.actor).stats.military.airliftCapacity + liveNation(ctx.campaign, ctx.actor).stats.military.sealiftCapacity) / 2, 0.4, "the lift to move it, since without airlift or sealift an expeditionary strike is a fantasy regardless of army size"), outsideNuclearDeterrence(ctx), forceAvailable(ctx, 5), warPowers(ctx, 5), munitionsOnHand(ctx, 5), packageFormations(ctx, 5, "army", 8, "army.brigade-combat-team", "eight uncommitted ground formations — an invasion is a corps, not a headline"), projectionAccess(ctx, PROJECTION_CAPS[5], "reach to sustain an invasion at this distance")),
        resolve: (ctx) => [
            ...spendsReadiness(ctx, 5),
            ...warPowersRecord(ctx, 5, `Ground forces committed against ${named(ctx, ctx.target)}, ordered without a vote.`),
            ...forceIntroduction(ctx, 5, `Ground forces committed against ${named(ctx, ctx.target)}: forces introduced into hostilities.`),
            { kind: "nationStat", nation: ctx.target, setStats: { military: { readiness: Math.max(0, liveNation(ctx.campaign, ctx.target).stats.military.readiness - 0.3 * jitter(ctx) * rungScale(ctx, 5)) }, politics: { regimeStability: Math.max(0, liveNation(ctx.campaign, ctx.target).stats.politics.regimeStability - 0.2 * jitter(ctx) * rungScale(ctx, 5)) } } },
            acted(ctx, { trust: -0.5 * jitter(ctx) * rungScale(ctx, 5), tension: 0.5 * jitter(ctx) * rungScale(ctx, 5), militaryThreat: 0.5 * jitter(ctx) * rungScale(ctx, 5) }, {
                kind: "invasion",
                description: `${sentenceCase(named(ctx, ctx.actor))} invaded ${named(ctx, ctx.target)}.`,
            }),
            // The rung's real consequence: a war the board now carries week by week
            // (packages/engine/src/conflicts.ts), rather than a flag and a stop.
            {
                kind: "conflict",
                set: openOrEscalate(ctx.campaign, ctx.actor, ctx.target, `${sentenceCase(named(ctx, ctx.actor))} launches an expeditionary invasion of ${named(ctx, ctx.target)}.`),
            },
            ...packageCommitment(ctx, "sustainment", 5, "A corps in the field is a corps that has to be fed, fueled and rotated for as long as it is there."),
        ],
    },
];
