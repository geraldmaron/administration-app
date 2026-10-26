import { describe, expect, it } from "vitest";
import { nationA, buildCampaign } from "./__fixtures__/campaign.js";
import { addDays } from "./clock.js";
import { apply } from "./effects.js";
import { openImpactEvent, stepImpactEvent } from "./impact-calculation.js";
import { advanceImpactEvents, applyImpactEvent, independentImpactPressure, issueImpactIncident } from "./impact-lifecycle.js";
import { ImpactSpec, NO_IMPACT_RESPONSE } from "./impact-event.js";
import { CYBER_IMPACT_PROFILE, IMPACT_CALIBRATION, INDUSTRIAL_IMPACT_PROFILES, NATURAL_IMPACT_PROFILES, OUTBREAK_IMPACT_PROFILE } from "./impact-catalog.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { createSave, loadSave } from "./save.js";
import { routeDomestic } from "./domestic-signature.js";
import { routeCohorts } from "./route-cohorts.js";
import { vitalsPhase } from "./vitals.js";
const campaign = buildCampaign();
const date = campaign.calendar;
const streams = createRngStreams(makeCampaignSeed("impact-accounting"));
function spec(mechanism) {
    return { version: 1, id: "impact:test", nation: nationA.id, title: "Test incident", source: "scenario", accounting: { population: "self", economy: "self" },
        exposure: { population: 10000, serviceUsers: 8000, careCapacity: 20, assetsUSDm: 500, dailyOutputUSDm: 2, vulnerability: .3, resilience: .4, evidence: "site-assessment", basis: "Known test exposure" }, mechanism, calibration: IMPACT_CALIBRATION };
}
function run(input, response = NO_IMPACT_RESPONSE, days = 60) {
    let event = openImpactEvent(input, date);
    for (let day = 1; day <= days; day++)
        event = stepImpactEvent(event, addDays(date, day), response, streams.stream("impact", day));
    return event;
}
describe("shared incident impact model", () => {
    it("records an authored industrial accident without assigning foreign blame", () => {
        const before = buildCampaign();
        const incident = { ...spec({ kind: "industrial", hazard: "explosion", intensity: 0.7, ...INDUSTRIAL_IMPACT_PROFILES.explosion }),
            id: "impact:industrial-accident", title: "Industrial explosion" };
        const after = apply(before, issueImpactIncident(before, incident));
        expect(after.impactEvents?.[incident.id]).toBeDefined();
        expect(after.relationships).toEqual(before.relationships);
    });
    it("rejects impossible exposure, parameters, and unsourced calibration", () => {
        const input = spec(CYBER_IMPACT_PROFILE);
        expect(ImpactSpec.safeParse({ ...input, exposure: { ...input.exposure, population: -1 } }).success).toBe(false);
        expect(ImpactSpec.safeParse({ ...input, mechanism: { ...OUTBREAK_IMPACT_PROFILE, initialInfected: 10001 } }).success).toBe(false);
        expect(ImpactSpec.safeParse({ ...input, calibration: { ...IMPACT_CALIBRATION, status: "calibrated", sourceRefs: [] } }).success).toBe(false);
        expect(ImpactSpec.safeParse({ ...input, exposure: { ...input.exposure, assetsUSDm: Infinity } }).success).toBe(false);
    });
    it("conserves outbreak population while infections develop, and effective response reduces harm", () => {
        const input = spec({ ...OUTBREAK_IMPACT_PROFILE, initialInfected: 100, fatalityFraction: .02 });
        const uncontrolled = run(input);
        const controlled = run(input, { containment: .9, care: .9, evacuation: 0, repair: 0 });
        for (const event of [uncontrolled, controlled]) {
            expect(event.state.susceptible + event.state.exposed + event.state.infected + event.state.recovered + event.totals.deaths).toBe(10000);
            expect(event.totals.infections).toBeLessThanOrEqual(10000);
            expect(event.reports.length).toBeLessThanOrEqual(12);
        }
        expect(controlled.totals.infections).toBeLessThan(uncontrolled.totals.infections);
        expect(controlled.totals.deaths).toBeLessThan(uncontrolled.totals.deaths);
        expect(run(input)).toEqual(uncontrolled);
    });
    it("cyber restoration reduces downtime and losses without inventing physical casualties", () => {
        const input = spec({ ...CYBER_IMPACT_PROFILE, initialCompromisedShare: .8 });
        const slow = run(input);
        const fast = run(input, { containment: 1, care: 0, evacuation: 0, repair: 1 });
        expect(fast.totals.servicePersonDays).toBeLessThan(slow.totals.servicePersonDays);
        expect(fast.totals.outputLossUSDm).toBeLessThan(slow.totals.outputLossUSDm);
        expect(fast.totals.deaths).toBe(0);
        expect(fast.totals.compromisedRecords).toBeLessThanOrEqual(8000);
        expect(fast.status).toBe("resolved");
    });
    it("every natural and industrial profile produces bounded, finite results", () => {
        const mechanisms = [
            ...Object.entries(NATURAL_IMPACT_PROFILES).map(([hazard, p]) => ({ kind: "natural", hazard: hazard, intensity: .7, ...p })),
            ...Object.entries(INDUSTRIAL_IMPACT_PROFILES).map(([hazard, p]) => ({ kind: "industrial", hazard: hazard, intensity: .7, ...p })),
            { kind: "infrastructure", service: "healthcare", outageShare: .8, repairDays: 10, dailyExcessMortalityRate: .0001 },
            { kind: "strike", intensity: .8, civilianHarmChance: 1, casualtyRate: .01, injuryRatio: 3, damageShare: .2, recoveryDays: 14 },
        ];
        for (const mechanism of mechanisms) {
            const event = run(spec(mechanism), NO_IMPACT_RESPONSE, 200);
            expect(event.status).toBe("resolved");
            expect(Object.values(event.totals).every((n) => Number.isFinite(n) && n >= 0)).toBe(true);
            expect(event.totals.deaths + event.totals.injured).toBeLessThanOrEqual(10000);
            expect(event.totals.assetLossUSDm).toBeLessThanOrEqual(500);
        }
    });
    it("applies new casualties once against live population and survives save/reload", () => {
        const event = run(spec({ kind: "strike", intensity: 1, civilianHarmChance: 1, casualtyRate: .01, injuryRatio: 2, damageShare: .2, recoveryDays: 14 }), NO_IMPACT_RESPONSE, 1);
        const effect = { kind: "impactEvent", event, expectedRevision: null };
        const after = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "Incident reported" }, effects: [effect] });
        expect(after.nations[nationA.id].stats.demography.population).toBe(campaign.nations[nationA.id].stats.demography.population - event.totals.deaths);
        expect(applyImpactEvent(after, effect)).toBe(after);
        const saved = loadSave(JSON.parse(JSON.stringify(createSave(after))));
        expect(saved.impactEvents).toEqual(after.impactEvents);
        const tomorrow = { ...saved, calendar: addDays(date, 2) };
        const next = advanceImpactEvents(tomorrow);
        expect(advanceImpactEvents(next)).toBe(next);
        expect(next.nations[nationA.id].stats.demography.population).toBe(after.nations[nationA.id].stats.demography.population);
        expect(independentImpactPressure(next, nationA.id)).toBeGreaterThan(0);
    });
    it("condition incidents do not bill macro pressure a second time", () => {
        const event = run({ ...spec(CYBER_IMPACT_PROFILE), source: "condition", parentId: "condition:test", accounting: { population: "self", economy: "parent" } }, NO_IMPACT_RESPONSE, 1);
        expect(independentImpactPressure({ ...campaign, impactEvents: { [event.spec.id]: event } }, nationA.id)).toBe(0);
    });
    it("keeps a U.S. casualty counted once across impact, state, and cohort channels", () => {
        const stateTotal = (states) => Object.keys(states)
            .reduce((sum, id) => sum + states[id].population, 0);
        const usa = campaign.nations[nationA.id];
        const opening = { ...campaign, nations: { ...campaign.nations, [nationA.id]: { ...usa, stats: {
                        ...usa.stats, demography: { ...usa.stats.demography, population: stateTotal(campaign.states), birthRate: 0, deathRate: 0, netMigration: 0 },
                    } } } };
        const event = run(spec({ kind: "strike", intensity: 1, civilianHarmChance: 1, casualtyRate: .01, injuryRatio: 2, damageShare: .2, recoveryDays: 14 }), NO_IMPACT_RESPONSE, 1);
        const impact = { kind: "impactEvent", event, expectedRevision: null };
        const harmed = apply(opening, { source: "simulate", actor: "world", turn: opening.turn, narration: { summary: "Incident reported" }, effects: [impact] });
        const signature = { magnitude: "moderate", signature: "incident-response", reason: "The response was noticed.", axes: { industrial: 1 } };
        const routed = routeDomestic(harmed, signature);
        const cohortEffects = routeCohorts(harmed, signature, routed);
        expect(routed.length).toBeGreaterThan(0);
        expect(cohortEffects.length).toBeGreaterThan(0);
        const reacted = apply(harmed, { source: "simulate", actor: "world", turn: harmed.turn, narration: { summary: "The public reacts to the response." }, effects: [...routed, ...cohortEffects] });
        expect(harmed.player.metrics).toEqual(opening.player.metrics);
        expect(reacted.player.metrics).toEqual(harmed.player.metrics);
        expect(Object.keys(reacted.states).some((id) => reacted.states[id].lean !== harmed.states[id].lean)).toBe(true);
        expect(Object.keys(harmed.states).every((id) => harmed.states[id].lean === opening.states[id].lean)).toBe(true);
        expect(stateTotal(harmed.states)).toBeCloseTo(stateTotal(opening.states) - event.totals.deaths, 6);
        expect(harmed.nations[nationA.id].stats.demography.population).toBeCloseTo(stateTotal(harmed.states), 6);
        expect(harmed.cohorts).toEqual(opening.cohorts);
        expect(reacted.nations[nationA.id].stats.demography.population).toBe(harmed.nations[nationA.id].stats.demography.population);
        expect(stateTotal(reacted.states)).toBeCloseTo(stateTotal(harmed.states), 6);
        const settled = vitalsPhase(reacted).reduce((current, packet) => apply(current, packet), reacted);
        expect(settled.nations[nationA.id].stats.demography.population).toBeCloseTo(stateTotal(harmed.states), 6);
        expect(applyImpactEvent(settled, impact)).toBe(settled);
    });
    it("charges a located condition to its state and spreads only casualties beyond that state's living population", () => {
        const state = "CA";
        const conditionId = "condition:located-test";
        const condition = { id: conditionId, nation: nationA.id, kind: "wildfire", scope: "region",
            severity: .8, startedTurn: campaign.turn, status: "active", beats: [], state };
        const located = { ...campaign, conditions: { ...campaign.conditions, [conditionId]: condition } };
        const event = run({ ...spec({ kind: "strike", intensity: 1, civilianHarmChance: 1, casualtyRate: .01, injuryRatio: 2, damageShare: .2, recoveryDays: 14 }),
            source: "condition", parentId: conditionId, accounting: { population: "self", economy: "parent" } }, NO_IMPACT_RESPONSE, 1);
        const effect = { kind: "impactEvent", event, expectedRevision: null };
        const local = applyImpactEvent(located, effect);
        expect(local.states[state].population).toBe(located.states[state].population - event.totals.deaths);
        expect(Object.keys(local.states).filter((id) => id !== state && local.states[id] !== located.states[id])).toHaveLength(0);
        const sparse = { ...located, states: { ...located.states, [state]: { ...located.states[state], population: 2 } } };
        const capped = applyImpactEvent(sparse, effect);
        expect(capped.states[state].population).toBe(0);
        const beforeTotal = Object.values(sparse.states).reduce((sum, row) => sum + row.population, 0);
        const afterTotal = Object.values(capped.states).reduce((sum, row) => sum + row.population, 0);
        expect(afterTotal).toBeCloseTo(beforeTotal - event.totals.deaths, 6);
        expect(capped.nations[nationA.id].stats.demography.population).toBe(located.nations[nationA.id].stats.demography.population - event.totals.deaths);
    });
    it("preserves a pre-existing national/state population gap while charging the same new toll on both", () => {
        const event = run(spec({ kind: "strike", intensity: 1, civilianHarmChance: 1, casualtyRate: .01, injuryRatio: 2, damageShare: .2, recoveryDays: 14 }), NO_IMPACT_RESPONSE, 1);
        const after = applyImpactEvent(campaign, { kind: "impactEvent", event, expectedRevision: null });
        const total = (states) => Object.values(states).reduce((sum, row) => sum + row.population, 0);
        expect(total(campaign.states) - total(after.states)).toBeCloseTo(event.totals.deaths, 6);
        expect(campaign.nations[nationA.id].stats.demography.population - after.nations[nationA.id].stats.demography.population).toBe(event.totals.deaths);
    });
});
it("requires demographic evidence and bounds age-specific estimates within the toll", () => {
    const input = spec({ kind: "strike", intensity: 1, civilianHarmChance: 1, casualtyRate: .01, injuryRatio: 2, damageShare: .2, recoveryDays: 14 });
    const unknown = run(input);
    expect(unknown.reports.at(-1)?.childDeaths).toBeUndefined();
    const known = run({ ...input, exposure: { ...input.exposure, demographics: { children: 3000, adults: 7000, assessmentRef: "site-survey" } } });
    expect(known.totals.childDeaths).toBeLessThanOrEqual(known.totals.deaths);
    expect(known.reports.at(-1)?.childDeaths).toBeDefined();
    const childrenOnly = run({ ...input, exposure: { ...input.exposure, demographics: { children: 10000, adults: 0, assessmentRef: "site-survey" } } });
    for (const report of childrenOnly.reports)
        expect(report.childDeaths.high).toBeLessThanOrEqual(report.deaths.high);
    expect(ImpactSpec.safeParse({ ...input, exposure: { ...input.exposure, demographics: { children: 3000, adults: 9000, assessmentRef: "bad" } } }).success).toBe(false);
});
it("does not advance twice on one date or upgrade confidence merely because time passed", () => {
    const input = spec(CYBER_IMPACT_PROFILE);
    const first = run(input, NO_IMPACT_RESPONSE, 1);
    expect(stepImpactEvent(first, first.lastUpdated, NO_IMPACT_RESPONSE, streams.stream("again"))).toBe(first);
    const later = run({ ...input, exposure: { ...input.exposure, evidence: "country-proxy" } }, NO_IMPACT_RESPONSE, 14);
    expect(later.reports.every((report) => report.confidence === "low")).toBe(true);
});
