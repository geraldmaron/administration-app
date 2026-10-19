import { jitter, liveNation } from "./instrument-gates.js";
import { forceScale } from "./force-packages.js";
import { openImpactEvent, stepImpactEvent } from "./impact-calculation.js";
import { IMPACT_CALIBRATION } from "./impact-catalog.js";
import { NO_IMPACT_RESPONSE } from "./impact-event.js";
import { strikeMissionContext } from "./strike-assessment.js";
/** Mission effects occur only when the military objective succeeds; civilian harm is resolved separately. */
export function strikeMissionEffects(ctx) {
    const objective = ctx.strikeObjective ?? "military-capacity";
    const scale = forceScale(4, ctx.force);
    const before = liveNation(ctx.campaign, ctx.target).stats;
    const strength = jitter(ctx) * scale;
    const readiness = Math.max(0, before.military.readiness - ({ "military-capacity": .1, logistics: .06, infrastructure: .03 }[objective]) * strength);
    const effects = [{ kind: "nationStat", nation: ctx.target, setStats: { military: { readiness,
                    ...(objective === "logistics" ? { airliftCapacity: Math.max(0, before.military.airliftCapacity - .08 * strength), sealiftCapacity: Math.max(0, before.military.sealiftCapacity - .08 * strength) } : {}) } } }];
    if (objective === "military-capacity")
        return effects;
    const context = strikeMissionContext(ctx.campaign, { actor: ctx.actor, target: ctx.target, instrument: "military", rung: 4, strikeObjective: objective });
    const service = objective === "logistics" || context.includes("Transport") ? "transport" : context.includes("Energy") ? "power" : context.includes("Communications") ? "communications" : "transport";
    const population = Math.min(Math.floor(before.demography.population), objective === "logistics" ? 1200 : 2400);
    const spec = { version: 1, id: `impact:mission:${ctx.actor}:${ctx.target}:${ctx.campaign.ledger.length}`, nation: ctx.target,
        title: `${context} disruption`, source: "action", accounting: { population: "self", economy: "self" }, calibration: IMPACT_CALIBRATION,
        exposure: { population, serviceUsers: population, assetsUSDm: 0, dailyOutputUSDm: objective === "logistics" ? .75 : 1.5,
            careCapacity: 0, vulnerability: .5, resilience: .35, evidence: "regional-estimate", basis: "Provisional fictional service-network footprint for this mission; affected users and output are modeled estimates, not independently confirmed infrastructure data." },
        mechanism: { kind: "infrastructure", service, outageShare: Math.min(.85, .35 * scale), repairDays: objective === "logistics" ? 10 : 14, dailyExcessMortalityRate: 0 } };
    const event = stepImpactEvent(openImpactEvent(spec, ctx.campaign.calendar), ctx.campaign.calendar, NO_IMPACT_RESPONSE, ctx.streams.stream("strike-mission", spec.id));
    return [...effects, { kind: "impactEvent", event, expectedRevision: null }];
}
