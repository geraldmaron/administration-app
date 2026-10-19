import { elementCapability } from "./intelligence.js";
import { hashIndex } from "./rng.js";
export const STRIKE_OBJECTIVES = {
    "military-capacity": { label: "Degrade military capacity", targetEffect: "A successful strike reduces the counterpart's military readiness. Force use can still trigger war and retaliation.", contexts: ["Military installation", "Air-defense network", "Military equipment depot"] },
    logistics: { label: "Disrupt military logistics", targetEffect: "A successful strike reduces readiness and airlift/sealift capacity, and disrupts transport services for ten days.", contexts: ["Military supply hub", "Transport interchange", "Logistics depot"] },
    infrastructure: { label: "Disrupt strategic infrastructure", targetEffect: "A successful strike reduces readiness modestly and creates a fourteen-day infrastructure outage with service and output losses.", contexts: ["Energy network", "Transport network", "Industrial supply network", "Communications network"] },
};
/** Bounded fictional exposure contexts; a category is never a verified building or victim identity. */
const CONTEXTS = [
    { category: "military", label: "military installation and support area", weight: 12, population: 80, serviceUsers: 40, assetsUSDm: 5, dailyOutputUSDm: .003, careCapacity: 8 },
    { category: "transport", label: "logistics and transport corridor", weight: 8, population: 180, serviceUsers: 160, assetsUSDm: 8, dailyOutputUSDm: .012, careCapacity: 8 },
    { category: "industrial", label: "industrial and warehouse district", weight: 6, population: 240, serviceUsers: 200, assetsUSDm: 12, dailyOutputUSDm: .02, careCapacity: 6 },
    { category: "utilities", label: "energy and communications services", weight: 6, population: 160, serviceUsers: 140, assetsUSDm: 15, dailyOutputUSDm: .025, careCapacity: 5 },
    { category: "residential", label: "mixed residential and commercial area", weight: 10, population: 300, serviceUsers: 260, assetsUSDm: 8, dailyOutputUSDm: .008, careCapacity: 6 },
    { category: "education", label: "school service footprint", weight: 1, population: 240, serviceUsers: 200, assetsUSDm: 4, dailyOutputUSDm: .006, careCapacity: 4 },
    { category: "healthcare", label: "hospital service footprint", weight: 1, population: 160, serviceUsers: 120, assetsUSDm: 12, dailyOutputUSDm: .015, careCapacity: 12 },
];
function contextFor(key) {
    let selected = hashIndex(key, CONTEXTS.reduce((sum, context) => sum + context.weight, 0) + 12);
    for (const context of CONTEXTS) {
        if (selected < context.weight)
            return context;
        selected -= context.weight;
    }
    return undefined;
}
export function strikeMissionContext(campaign, request) {
    const objective = request.strikeObjective ?? "military-capacity";
    const mission = STRIKE_OBJECTIVES[objective];
    // Keep the mission node stable while preparation advances the campaign clock.
    return mission.contexts[hashIndex(`${campaign.seed}:strike-assessment:${request.actor}:${request.target}:${objective}:target-context`, mission.contexts.length)];
}
/** A modeled intelligence case for the operation, independent of urbanization and casualty rolls. */
export function assessStrikeSite(campaign, request) {
    if (request.instrument !== "military" || request.rung !== 4 || request.actor !== campaign.founding.nation || request.assessedSite)
        return undefined;
    const objective = request.strikeObjective ?? "military-capacity";
    if (!(objective in STRIKE_OBJECTIVES))
        return undefined;
    const id = `strike-assessment:${request.actor}:${request.target}:${campaign.turn}:${objective}`;
    const existing = campaign.security.strikeSiteAssessments?.[id];
    if (existing)
        return existing;
    const source = contextFor(`${campaign.seed}:${id}:exposure-context`);
    if (!source || !campaign.nations[request.target] || campaign.nations[request.target].stats.demography.population < source.population)
        return undefined;
    const mission = STRIKE_OBJECTIVES[objective];
    const targetContext = strikeMissionContext(campaign, request);
    const confidence = elementCapability(campaign, "IC-NGA") >= .5 ? "moderate" : "low";
    const basis = `Modeled intelligence assesses ${targetContext.toLowerCase()} with possible exposure in a ${source.label}. This fictional planning context has ${confidence} confidence; target identity, occupancy and nearby services are not independently confirmed. Exposure values are provisional scenario assumptions, not national statistics.`;
    return { id, actor: request.actor, target: request.target, issuedDate: campaign.calendar, objective, label: mission.label, targetContext,
        source: "modeled-intelligence", confidence, basis, targetEffect: mission.targetEffect,
        serviceRisk: objective === "military-capacity" ? "Collateral damage can interrupt nearby services even if the military objective succeeds." : "Successful disruption can interrupt transport, energy or communications used by civilians; collateral damage is a separate risk.",
        site: { category: source.category, assessmentRef: id, confirmed: false },
        exposure: { population: source.population, serviceUsers: source.serviceUsers, assetsUSDm: source.assetsUSDm, dailyOutputUSDm: source.dailyOutputUSDm,
            careCapacity: source.careCapacity, vulnerability: .5, resilience: .35, evidence: "site-assessment", basis },
        gaps: ["Target function and nearby site use lack independent confirmation.", "Occupancy and victim identities are unknown.", "Mission effects, exposure and recovery profiles use provisional simulation assumptions."] };
}
export function withStrikeAssessment(campaign, request) {
    const assessment = assessStrikeSite(campaign, request);
    return assessment ? { ...request, assessedSite: { site: assessment.site, exposure: assessment.exposure } } : request;
}
export function strikeAssessmentReading(campaign, request) {
    if (request.instrument !== "military" || request.rung !== 4)
        return undefined;
    const assessment = Object.values(campaign.security.strikeSiteAssessments ?? {}).find((entry) => entry.id === request.assessedSite?.site.assessmentRef) ?? (request.assessedSite ? undefined : assessStrikeSite(campaign, request));
    if (assessment)
        return assessment;
    const objective = request.strikeObjective ?? "military-capacity";
    const mission = STRIKE_OBJECTIVES[objective];
    return { objective, label: mission.label, targetContext: strikeMissionContext(campaign, request), confidence: "low", basis: request.assessedSite?.exposure.basis ?? "No sourced site case is available. Civilian exposure remains a country-level proxy; target function and occupancy are uncertain.", gaps: ["No independently confirmed site or occupancy evidence."], serviceRisk: "Military action can disrupt civilian services and trigger retaliation or escalation.", targetEffect: mission.targetEffect };
}
