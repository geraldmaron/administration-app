import { CYBER_IMPACT_PROFILE, IMPACT_CALIBRATION, NATURAL_IMPACT_PROFILES, OUTBREAK_IMPACT_PROFILE } from "./impact-catalog.js";
import { openImpactEvent } from "./impact-calculation.js";
import { weekCloseDate } from "./clock.js";
/** A stated proxy until a case provides actual exposure and resilience data. */
export function countryExposure(campaign, nation, population) {
    const runtime = campaign.nations[nation];
    if (!runtime)
        throw new Error(`Unknown impact nation ${nation}`);
    const n = runtime.stats;
    const people = Math.max(0, Math.min(Math.floor(n.demography.population), Math.round(population)));
    const output = n.economy.gdp * people / Math.max(1, n.demography.population);
    return { population: people, assetsUSDm: output * 3, dailyOutputUSDm: output / 365, serviceUsers: people, careCapacity: Math.round(people * .002),
        vulnerability: .5, resilience: Math.min(.85, Math.max(.15, n.economy.gdpPerCapita / 100_000)), evidence: "country-proxy",
        basis: "Exposure is estimated from geographic scope; capital is three years of local output and resilience is a wealth proxy. No site or health-capacity assessment is available." };
}
// Both adapters run only inside weekly phases, whose office day depends on the
// layout. Their incidents open on the week's closing day so the daily stepping
// that follows is the same whether the week ran as one tick or as seven days.
export function conditionImpactEvent(campaign, condition) {
    if (condition.kind !== "pandemic" && !(condition.kind in NATURAL_IMPACT_PROFILES))
        return [];
    const id = `impact:${condition.id}`;
    if (campaign.impactEvents?.[id])
        return [];
    const population = campaign.nations[condition.nation]?.stats.demography.population;
    if (!population)
        return [];
    const cityPopulation = condition.city ? campaign.cities[condition.city]?.base.population : undefined;
    const scoped = cityPopulation ?? population * (condition.scope === "city" ? .002 : condition.scope === "region" ? .03 : .2);
    const exposed = condition.kind === "pandemic" ? scoped : scoped * .05;
    const spec = { version: 1, id, nation: condition.nation, title: condition.beats[0]?.description ?? condition.kind,
        source: "condition", parentId: condition.id, accounting: { population: "self", economy: "parent" }, exposure: countryExposure(campaign, condition.nation, exposed), calibration: IMPACT_CALIBRATION,
        mechanism: condition.kind === "pandemic" ? { ...OUTBREAK_IMPACT_PROFILE, initialInfected: Math.min(Math.floor(exposed), Math.max(1, Math.round(exposed * .0001))), transmissionPerDay: .12 + condition.severity * .2 }
            : { kind: "natural", hazard: condition.kind, intensity: condition.severity, ...NATURAL_IMPACT_PROFILES[condition.kind] } };
    return [{ kind: "impactEvent", event: openImpactEvent(spec, weekCloseDate(campaign)), expectedRevision: null }];
}
export function cyberImpactEvent(campaign, nation, operator) {
    const id = `impact:cyber:${operator}:${campaign.turn}`;
    if (campaign.impactEvents?.[id])
        return [];
    const population = campaign.nations[nation]?.stats.demography.population ?? 0;
    const spec = { version: 1, id, nation, title: "Malicious software disrupts services", source: "operator", parentId: operator, accounting: { population: "self", economy: "self" },
        exposure: countryExposure(campaign, nation, population * .002), mechanism: CYBER_IMPACT_PROFILE, calibration: IMPACT_CALIBRATION };
    return [{ kind: "impactEvent", event: openImpactEvent(spec, weekCloseDate(campaign)), expectedRevision: null }];
}
