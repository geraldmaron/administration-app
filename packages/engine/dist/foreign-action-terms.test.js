import { assessStrikeSite, strikeMissionContext } from "./strike-assessment.js";
import { issueAction, outstandingInstrumentActs, resolveDueInstruments } from "./instrument-issued.js";
import { apply } from "./effects.js";
import { describe, expect, it } from "vitest";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { projectAction, resolveAction } from "./resolution.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { actionTiming } from "./action-timing.js";
import { resolveStrikeHarm, strikeCivilianRisk } from "./strike-outcomes.js";
import { advanceImpactEvents, applyImpactEvent } from "./impact-lifecycle.js";
import { addDays } from "./clock.js";
const request = { actor: nationA.id, target: nationB.id, instrument: "military", rung: 4 };
const site = {
    site: { category: "education", assessmentRef: "fixture:site-assessment-1", confirmed: false },
    exposure: { population: 500, assetsUSDm: 12, dailyOutputUSDm: .02, serviceUsers: 500, careCapacity: 8,
        vulnerability: .5, resilience: .3, evidence: "site-assessment", basis: "Simulated assessed education footprint used for deterministic contract verification." },
};
function capableCampaign() {
    const base = buildCampaign();
    const actor = base.nations[nationA.id];
    const stats = { ...actor.stats, economy: { ...actor.stats.economy, reserves: 50_000 },
        military: { ...actor.stats.military, branchStrength: { land: .8, air: .8, naval: .8, cyber: .7, space: .5 }, airliftCapacity: .8, sealiftCapacity: .8, basesAbroad: 3 },
        security: { ...actor.stats.security, intelCapability: .8 } };
    return { ...base, nations: { ...base.nations, [nationA.id]: { ...actor, stats } } };
}
describe("presidential strike terms and assessed consequences", () => {
    it("additional assessment trades preparation time for lower risk in the same estimator", () => {
        const campaign = capableCampaign();
        expect(strikeMissionContext({ ...campaign, turn: campaign.turn + 1 }, request)).toBe(strikeMissionContext(campaign, request));
        const protectedRequest = { ...request, civilianProtection: "additional-assessment" };
        expect(actionTiming(campaign, protectedRequest).days).toBe(actionTiming(campaign, request).days + 3);
        expect(strikeCivilianRisk(campaign, protectedRequest).chance).toBeLessThan(strikeCivilianRisk(campaign, request).chance);
        const rng = createRngStreams(campaign.seed);
        expect(projectAction(campaign, protectedRequest, rng)).toEqual(projectAction(campaign, protectedRequest, rng));
        const invalid = projectAction(campaign, { ...protectedRequest, instrument: "diplomatic" }, rng);
        expect(invalid.ok).toBe(false);
    });
    it("models success with harm, failure with harm, and no detected deaths independently", () => {
        const campaign = capableCampaign();
        const outcomes = Array.from({ length: 100 }, (_, index) => resolveAction(campaign, request, createRngStreams(makeCampaignSeed(`terms-outcome-${index}`))));
        const resolved = outcomes.filter((result) => result.ok);
        expect(resolved).toHaveLength(100);
        expect(resolved.some((result) => result.success && result.civilianCasualties)).toBe(true);
        expect(resolved.some((result) => !result.success && result.civilianCasualties)).toBe(true);
        expect(resolved.some((result) => !result.civilianCasualties)).toBe(true);
    });
    it("retains assessed education/healthcare evidence, lost services and recovery without double charging reports", () => {
        for (const category of ["education", "healthcare"]) {
            const campaign = capableCampaign();
            const assessed = { ...request, assessedSite: { ...site, site: { ...site.site, category } } };
            const outcome = Array.from({ length: 60 }, (_, index) => resolveStrikeHarm(campaign, assessed, createRngStreams(makeCampaignSeed(`site-${index}`)))).find((result) => result.casualties);
            expect(outcome).toBeDefined();
            const effect = outcome.effects.find((entry) => entry.kind === "impactEvent");
            if (effect.kind !== "impactEvent")
                throw new Error("Expected incident");
            expect(effect.event.spec.site?.category).toBe(category);
            expect(effect.event.spec.site?.confirmed).toBe(false);
            expect(effect.event.totals.servicePersonDays).toBeGreaterThan(0);
            expect(effect.event.totals.assetLossUSDm).toBeGreaterThan(0);
            expect(effect.event.totals.childDeaths).toBe(0);
            const impacted = applyImpactEvent(campaign, effect);
            expect(applyImpactEvent(impacted, effect)).toEqual(impacted);
            const after = advanceImpactEvents({ ...impacted, calendar: addDays(campaign.calendar, 2) });
            expect(after.nations[nationB.id].stats.demography.population).toBe(impacted.nations[nationB.id].stats.demography.population);
            expect(after.impactEvents?.[effect.event.spec.id]?.reports.length).toBeGreaterThan(1);
            expect(after.impactEvents?.[effect.event.spec.id]?.totals.servicePersonDays).toBeGreaterThan(effect.event.totals.servicePersonDays);
            const revised = { ...effect.event, revision: effect.event.revision + 1, reports: [...effect.event.reports, { ...effect.event.reports[0], revision: effect.event.revision + 1, confidence: "medium" }] };
            const reportOnly = applyImpactEvent(impacted, { kind: "impactEvent", event: revised, expectedRevision: effect.event.revision });
            expect(reportOnly.nations[nationB.id].stats.demography.population).toBe(impacted.nations[nationB.id].stats.demography.population);
            expect(reportOnly.player.metrics).toEqual(impacted.player.metrics);
        }
    });
    it("rejects country-proxy evidence labeled as a site assessment", () => {
        const campaign = capableCampaign();
        expect(projectAction(campaign, { ...request, assessedSite: { ...site, exposure: { ...site.exposure, evidence: "country-proxy" } } }, createRngStreams(campaign.seed)).ok).toBe(false);
    });
});
it("ordinary live strike plans persist broad intelligence contexts, including rarer school/hospital cases, through reports", () => {
    const categories = new Set();
    const harmCategories = new Set();
    for (let index = 0; index < 500; index++) {
        const campaign = { ...capableCampaign(), seed: makeCampaignSeed(`ordinary-strike-producer-${index}`) };
        const assessment = assessStrikeSite(campaign, request);
        if (!assessment)
            continue;
        categories.add(assessment.site.category);
        expect(assessment.site.confirmed).toBe(false);
        expect(assessment.exposure.basis).toContain("fictional planning context");
        const changedUrbanization = { ...campaign, nations: { ...campaign.nations, [nationB.id]: { ...campaign.nations[nationB.id], stats: { ...campaign.nations[nationB.id].stats, demography: { ...campaign.nations[nationB.id].stats.demography, urbanization: .01 } } } } };
        expect(assessStrikeSite(changedUrbanization, request)).toEqual(assessment);
        const projected = projectAction(campaign, request, createRngStreams(campaign.seed));
        if (!projected.ok)
            throw new Error(projected.reason);
        expect(projected.projection.request.assessedSite?.site).toEqual(assessment.site);
        expect(campaign.security.strikeSiteAssessments).toBeUndefined();
        const issued = issueAction(campaign, request, createRngStreams(campaign.seed));
        if (!issued.ok)
            throw new Error(issued.reason);
        const authorized = apply(campaign, issued.packet);
        expect(authorized.security.strikeSiteAssessments?.[assessment.id]).toEqual(assessment);
        const saved = JSON.parse(JSON.stringify(authorized));
        const act = outstandingInstrumentActs(saved)[0];
        expect(act.request.assessedSite?.exposure).toEqual(assessment.exposure);
        const resolved = resolveDueInstruments({ ...saved, calendar: act.dueDate });
        const event = Object.values(resolved.campaign.impactEvents ?? {}).find((entry) => entry.spec.parentId === act.id);
        if (event.totals.deaths > 0)
            harmCategories.add(assessment.site.category);
        expect(event.spec.site).toEqual(assessment.site);
        expect(event.spec.exposure).toEqual(assessment.exposure);
        expect(event.reports).toHaveLength(1);
        expect(event.totals.servicePersonDays).toBeGreaterThanOrEqual(0);
        expect(event.totals.childDeaths).toBe(0);
        const recovered = advanceImpactEvents({ ...resolved.campaign, calendar: addDays(act.dueDate, 15) });
        expect(recovered.impactEvents?.[event.spec.id]?.status).toBe("resolved");
        expect(recovered.impactEvents?.[event.spec.id]?.reports.at(-1)?.stage).toBe("final");
        expect(resolveDueInstruments(recovered).packets).toHaveLength(0);
    }
    expect([...categories].sort()).toEqual(["education", "healthcare", "industrial", "military", "residential", "transport", "utilities"]);
    expect(harmCategories.has("education")).toBe(true);
    expect(harmCategories.has("healthcare")).toBe(true);
});
it("selected mission objectives change actual capability and service effects, and survive delayed execution", () => {
    const campaign = capableCampaign();
    for (const objective of ["military-capacity", "logistics", "infrastructure"]) {
        const terms = { ...request, strikeObjective: objective, civilianProtection: "additional-assessment", support: { mode: "unilateral", partners: [] } };
        const projection = projectAction(campaign, terms, createRngStreams(campaign.seed));
        if (!projection.ok)
            throw new Error(projection.reason);
        expect(projection.projection.strikeAssessment?.objective).toBe(objective);
        expect(projection.projection.strikeAssessment?.targetEffect).toContain("successful strike");
        const result = Array.from({ length: 20 }, (_, index) => resolveAction(campaign, terms, createRngStreams(makeCampaignSeed(`mission-${index}`)))).find((outcome) => outcome.ok && outcome.success);
        if (!result.ok)
            throw new Error(result.reason);
        const after = apply(campaign, result.packet);
        expect(after.nations[nationB.id].stats.military.readiness).toBeLessThan(campaign.nations[nationB.id].stats.military.readiness);
        if (objective === "logistics") {
            expect(after.nations[nationB.id].stats.military.airliftCapacity).toBeLessThan(campaign.nations[nationB.id].stats.military.airliftCapacity);
            expect(after.nations[nationB.id].stats.military.sealiftCapacity).toBeLessThan(campaign.nations[nationB.id].stats.military.sealiftCapacity);
        }
        const mission = Object.values(after.impactEvents ?? {}).find((event) => event.spec.id.startsWith("impact:mission:"));
        if (objective === "military-capacity")
            expect(mission).toBeUndefined();
        else {
            expect(mission?.spec.mechanism.kind).toBe("infrastructure");
            expect(mission.totals.servicePersonDays).toBeGreaterThan(0);
            expect(mission.totals.outputLossUSDm).toBeGreaterThan(0);
            expect(mission.totals.deaths).toBe(0);
            const collateral = Object.values(after.impactEvents).find((event) => event.spec.id.startsWith("impact:strike:"));
            expect(collateral.spec.accounting.economy).toBe("parent");
            expect(collateral.spec.parentId).toBe(mission.spec.id);
        }
        const issued = issueAction(campaign, terms, createRngStreams(campaign.seed));
        if (!issued.ok)
            throw new Error(issued.reason);
        const saved = JSON.parse(JSON.stringify(apply(campaign, issued.packet)));
        const act = outstandingInstrumentActs(saved)[0];
        expect(act.request.strikeObjective).toBe(objective);
        expect(act.request.civilianProtection).toBe("additional-assessment");
        const executed = resolveDueInstruments({ ...saved, calendar: act.dueDate });
        expect(executed.campaign.issuedActs?.[act.id]?.status).toBe("reported");
        expect(resolveDueInstruments(executed.campaign).packets).toHaveLength(0);
    }
    const military = strikeCivilianRisk(campaign, { ...request, strikeObjective: "military-capacity" }).chance;
    const infrastructure = strikeCivilianRisk(campaign, { ...request, strikeObjective: "infrastructure" }).chance;
    expect(infrastructure).toBeGreaterThan(military);
    expect(projectAction(campaign, { ...request, strikeObjective: "logistics", instrument: "diplomatic" }, createRngStreams(campaign.seed)).ok).toBe(false);
});
