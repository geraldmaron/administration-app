import { findingGate } from "./finding-gate.js";
import { covertRecord, named } from "./instrument-records.js";
import { COVERT_CAPABILITY_COST, INTEL_RECOVERY_PER_TURN, MILITARY_READINESS_COST, MILITARY_READINESS_GATES, READINESS_RECOVERY_PER_TURN, } from "./capacity.js";
import { shockEffect } from "./external-shocks.js";
import { forceProjectionCost } from "./geography.js";
import { stagingPoints } from "./staging.js";
import { sentenceCase } from "./naming.js";
import { jitter, liveNation, notAlreadyStanding, requireAll, requireAtLeast, requireTrue, sharesBorder, } from "./instrument-gates.js";
import { militaryRungs } from "./instruments-military.js";
import { assistanceRungs, economicRungs } from "./instruments-economic.js";
import { draftSurveillanceProduct } from "./collection-report.js";
import { campaignDay } from "./nomination.js";
import { covertSuccessExposed } from "./covert-exposure.js";
import { DEFAULT_REGIME_ACT, isCovertRegimeAct, regimeActResolve, regimeCapabilityGate } from "./regime-rung.js";
// The instrument ladder: five instruments (diplomatic, economic, covert,
// military, assistance), five rungs each, one shared code path for player and
// NPC actors. A rung is a capability check plus an effect builder; nothing here
// mutates state directly — every attempt resolves to an EffectPacket that
// the caller runs through effects.ts's apply(), the only mutator.
//
// Four of the five are ways of making another government do something it would
// rather not. The fifth is the one a state actually spends most of its year on:
// helping. Without it the only verb the board offered toward a friend was a
// gentler threat, and every act of aid a scenario described was money leaving
// the treasury with nothing arriving at the other end.
//
// The military table lives in instruments-military.ts, the economic and
// assistance tables in instruments-economic.ts, and the gates every table shares
// in instrument-gates.ts; this module assembles the ladder and stays its one
// import site.
export { INSTRUMENT_COERCION, INSTRUMENT_IDS, RUNG_LEVELS } from "./instrument-ids.js";
export { securityGuaranteeFlag } from "./instruments-economic.js";
// --- Diplomatic ladder: leverage is softPower.diplomaticReach and standing. ---
const diplomaticRungs = [
    {
        instrument: "diplomatic",
        rung: 1,
        id: "diplomatic-1",
        name: "Private Warning",
        gate: (ctx) => requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.softPower.diplomaticReach, 0.05, "a diplomatic corps able to get a private message into the room"),
        resolve: (ctx) => [
            { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { trust: -0.02 * jitter(ctx) }, addHistory: { turn: ctx.campaign.turn, kind: "demarche", description: `${sentenceCase(named(ctx, ctx.actor))} delivered a quiet démarche to ${named(ctx, ctx.target)}.` } },
        ],
    },
    {
        instrument: "diplomatic",
        rung: 2,
        id: "diplomatic-2",
        name: "Public Statement",
        gate: (ctx) => requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.softPower.diplomaticReach, 0.2, "the diplomatic reach to make a public statement carry weight"),
        resolve: (ctx) => [
            { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { tension: 0.05 * jitter(ctx) } },
            { kind: "alignment", pull: { nationalistGlobalist: -0.02 } },
        ],
    },
    {
        instrument: "diplomatic",
        rung: 3,
        id: "diplomatic-3",
        name: "Recall Ambassador",
        gate: (ctx) => requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.softPower.diplomaticReach, 0.35, "the diplomatic reach to run the mission a recall would disrupt"),
        resolve: (ctx) => [
            { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { trust: -0.1 * jitter(ctx) } },
            { kind: "flag", set: [`recalled-ambassador:${ctx.actor}:${ctx.target}`] },
        ],
    },
    {
        instrument: "diplomatic",
        rung: 4,
        id: "diplomatic-4",
        name: "Coalition Pressure",
        gate: (ctx) => requireAll(requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.softPower.diplomaticReach, 0.5, "the diplomatic reach to rally other capitals behind it"), requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.politics.legitimacy, 0.4, "the legitimacy to lead a coalition, which a government this delegitimized has not got")),
        resolve: (ctx) => [
            { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { trust: -0.15 * jitter(ctx), tension: 0.15 * jitter(ctx) } },
        ],
    },
    {
        instrument: "diplomatic",
        rung: 5,
        id: "diplomatic-5",
        name: "Sever Relations",
        gate: (ctx) => requireAll(requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.softPower.diplomaticReach, 0.65, "the diplomatic reach to make a breach of relations stick"), notAlreadyStanding(ctx, `severed-relations:${ctx.actor}:${ctx.target}`, "relations left to break — they are already severed")),
        resolve: (ctx) => [
            { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { trust: -0.3 * jitter(ctx), tension: 0.3 * jitter(ctx) }, addHistory: { turn: ctx.campaign.turn, kind: "severance", description: `${sentenceCase(named(ctx, ctx.actor))} severed relations with ${named(ctx, ctx.target)}.` } },
            { kind: "flag", set: [`severed-relations:${ctx.actor}:${ctx.target}`] },
            // A foreign service is its posts. Closing an embassy closes the careers,
            // the contacts and the standing that ran through it, and a state that
            // has broken with everybody has a foreign ministry with nowhere to send
            // anyone — which is what the reach gate on this rung was always meant to
            // be saying and had no way to say, because reach never moved.
            {
                kind: "nationStat",
                nation: ctx.actor,
                setStats: {
                    softPower: {
                        diplomaticReach: Math.max(0, liveNation(ctx.campaign, ctx.actor).stats.softPower.diplomaticReach - 0.06 * jitter(ctx)),
                    },
                },
            },
        ],
    },
];
// --- Covert ladder: leverage is intelCapability, gated further by reach — an asset still has to get there. ---
function covertReach(ctx) {
    const actor = liveNation(ctx.campaign, ctx.actor);
    const target = liveNation(ctx.campaign, ctx.target);
    if (sharesBorder(actor, target))
        return { ok: true };
    const { multiplier } = forceProjectionCost(actor, target, stagingPoints(ctx.campaign, ctx.actor, ctx.target));
    return requireAtLeast(2.5, multiplier, "reach into the target's territory (no shared border and projection cost too high)");
}
export function covertWatchReportEffect(ctx, exposed) {
    if (ctx.actor !== ctx.campaign.founding.nation)
        return undefined;
    const id = `report:foreign:${ctx.actor}:${ctx.target}:${ctx.campaign.turn}:${ctx.campaign.ledger.length}`;
    return { kind: "intelligence", product: draftSurveillanceProduct(ctx.campaign, ctx.target, campaignDay(ctx.campaign), id, exposed) };
}
/** The one exposure finding shared by the surveillance effect and its resolver. */
export function foreignSurveillanceExposed(ctx) {
    return covertSuccessExposed(ctx.campaign, ctx.actor, ctx.target, 1);
}
/** The target-directed charge shared by attributed covert successes. */
export function exposedCovertTargetEffect(ctx) {
    if (!ctx.campaign.relationships[`${ctx.target}:${ctx.actor}`])
        return undefined;
    return { kind: "relationship", from: ctx.target, to: ctx.actor, deltas: { trust: -0.03, tension: 0.02 } };
}
const covertRungs = [
    {
        instrument: "covert",
        rung: 1,
        id: "covert-1",
        name: "Surveillance",
        gate: (ctx) => requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.security.intelCapability, 0.1, "the intel capability to keep a standing watch"),
        resolve: (ctx) => {
            const exposed = foreignSurveillanceExposed(ctx);
            return [
                { kind: "flag", set: [`surveilling:${ctx.actor}:${ctx.target}`] },
                ...(exposed ? [exposedCovertTargetEffect(ctx)].filter((effect) => effect !== undefined) : []),
                ...[covertWatchReportEffect(ctx, exposed)].filter((effect) => effect !== undefined),
            ];
        },
    },
    {
        instrument: "covert",
        rung: 2,
        id: "covert-2",
        name: "Influence Operation",
        gate: (ctx) => requireAll(requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.security.intelCapability, 0.25, "the intel capability to run an influence operation"), findingGate(ctx)),
        resolve: (ctx) => [
            ...covertRecord(ctx, 2, `An influence operation inside ${named(ctx, ctx.target)}.`),
            { kind: "nationStat", nation: ctx.target, setStats: { politics: { protestPressure: Math.min(1, liveNation(ctx.campaign, ctx.target).stats.politics.protestPressure + 0.05 * jitter(ctx)) } } },
            { kind: "alignment", pull: { authLibertarian: 0.02 } },
        ],
    },
    {
        instrument: "covert",
        rung: 3,
        id: "covert-3",
        name: "Sabotage",
        gate: (ctx) => requireAll(requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.security.intelCapability, 0.4, "the intel capability to put people in place for sabotage"), covertReach(ctx), findingGate(ctx)),
        resolve: (ctx) => [
            ...covertRecord(ctx, 3, `Sabotage inside ${named(ctx, ctx.target)}.`),
            // A plant or a line taken out shapes the half-year's growth, and the drift
            // phase carries it rather than a level the next week pulls back.
            shockEffect(ctx.campaign, ctx.target, "sabotage", { growth: -0.01 * jitter(ctx) }),
            { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { tension: 0.1 * jitter(ctx) } },
        ],
    },
    {
        instrument: "covert",
        rung: 4,
        id: "covert-4",
        name: "Proxy Support",
        gate: (ctx) => requireAll(requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.security.intelCapability, 0.5, "the intel capability to stand up and sustain a proxy"), requireTrue(sharesBorder(liveNation(ctx.campaign, ctx.actor), liveNation(ctx.campaign, ctx.target)) || liveNation(ctx.campaign, ctx.actor).stats.military.basesAbroad > 0, "a staging point for a proxy (shared border or a base abroad)"), findingGate(ctx)),
        resolve: (ctx) => [
            ...covertRecord(ctx, 4, `Support to a proxy inside ${named(ctx, ctx.target)}.`),
            ...spendsTradecraft(ctx, 4),
            { kind: "nationStat", nation: ctx.target, setStats: { security: { insurgencyPressure: Math.min(1, liveNation(ctx.campaign, ctx.target).stats.security.insurgencyPressure + 0.1 * jitter(ctx)) } } },
            { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { militaryThreat: 0.1 * jitter(ctx) } },
        ],
    },
    {
        instrument: "covert",
        rung: 5,
        id: "covert-5",
        name: "Covert Regime Action",
        gate: (ctx) => regimeCapabilityGate(ctx, covertReach(ctx)),
        resolve: (ctx) => [...regimeActResolve(ctx), ...(isCovertRegimeAct(ctx.regimeAct ?? DEFAULT_REGIME_ACT) ? spendsTradecraft(ctx, 5) : [])],
    },
];
/**
 * A covert rung's bill against the service that ran it.
 *
 * Written on the nation stat rather than on the player's panel for the same
 * reason the military one is: the ladder is one code path, and a cost only the
 * player pays hands every other capital a tempo the player cannot match.
 */
function spendsTradecraft(ctx, rung) {
    const before = liveNation(ctx.campaign, ctx.actor).stats.security.intelCapability;
    const after = Math.max(0, before - COVERT_CAPABILITY_COST[rung] * jitter(ctx));
    return [{ kind: "nationStat", nation: ctx.actor, setStats: { security: { intelCapability: after } } }];
}
export const INSTRUMENT_RUNGS = [
    ...diplomaticRungs,
    ...economicRungs,
    ...covertRungs,
    ...militaryRungs,
    ...assistanceRungs,
];
export function rungDefinition(instrument, rung) {
    return findRung(instrument, rung);
}
function findRung(instrument, rung) {
    const found = INSTRUMENT_RUNGS.find((r) => r.instrument === instrument && r.rung === rung);
    if (!found)
        throw new Error(`no rung registered for ${instrument} rung ${rung}`);
    return found;
}
export function rungsForInstrument(instrument) {
    return INSTRUMENT_RUNGS.filter((r) => r.instrument === instrument).sort((a, b) => a.rung - b.rung);
}
/**
 * What a rung takes out of the establishment, and how long the establishment is
 * short of it.
 *
 * This is the only lag the simulation actually has: an order resolves the week
 * it is given, and what it costs is a capacity that comes back at a published
 * rate. Quoting that rate as weeks is a real forecast — spend fifteen points of
 * readiness at two points a week and the force is not whole for eight weeks,
 * during which the rungs above it are shut.
 */
export function capacityCost(instrument, rung) {
    if (instrument === "military" && (rung === 3 || rung === 4 || rung === 5)) {
        const amount = MILITARY_READINESS_COST[rung];
        return {
            label: "Military Readiness",
            amount,
            weeks: Math.ceil(amount / READINESS_RECOVERY_PER_TURN),
            note: `Rungs above this one need readiness of at least ${MILITARY_READINESS_GATES[rung]}, so the force is out of the top of the ladder until it has rebuilt.`,
        };
    }
    if (instrument === "covert" && (rung === 4 || rung === 5)) {
        const amount = COVERT_CAPABILITY_COST[rung];
        return {
            label: "Intelligence capability",
            amount,
            weeks: Math.ceil(amount / INTEL_RECOVERY_PER_TURN),
            note: "Networks, cover and officers are spent by an operation and recruited back over months.",
        };
    }
    return undefined;
}
// This module owns the rung table and nothing else. Gating, odds, cost, risk
// and packet assembly all live in the resolver, which is the single path from
// a contemplated act to a changed world — for the player on the player's turn
// and for an NPC on the simulate phase alike.
// Re-exported so the resolver keeps one import site for an act's vocabulary.
// The table itself lives in `consultation.ts`; see the note there.
export { consultationFor } from "./consultation.js";
