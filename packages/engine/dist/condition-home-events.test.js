import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { HOME_EVENT_CONDITIONS, isIncidentKind } from "./condition-kinds.js";
import { BANK_CALM_PER_YEAR, CYBER_ESCALATION, MASS_KILLINGS_PER_YEAR, captorWeights, detentionCaptor, homeEventCandidates, } from "./condition-home-events.js";
import { openCondition, onsetCandidates } from "./condition-onset.js";
import { conditionImpactWrites } from "./conditions.js";
import { cyberImpactEvent } from "./impact-adapters.js";
import { createRngStreams } from "./rng.js";
import { relationshipKey } from "./state.js";
const { campaign: FOUNDED } = foundedForBalance("home-events");
const USA = FOUNDED.founding.nation;
const weekly = (perYear) => 1 - Math.exp((-perYear * 7) / 365);
function chanceOf(campaign, kind) {
    return homeEventCandidates(campaign).find((candidate) => candidate.kind === kind)?.chance ?? 0;
}
function withUs(campaign, change) {
    return { ...campaign, nations: { ...campaign.nations, [USA]: change(campaign.nations[USA]) } };
}
function withTrust(campaign, from, trust) {
    const key = relationshipKey(from, USA);
    const edge = campaign.relationships[key];
    return { ...campaign, relationships: { ...campaign.relationships, [key]: { ...edge, trust } } };
}
describe("home events: eligible causes read from the campaign", () => {
    it("draws only home candidates, one per family at most, on the home queue", () => {
        const candidates = homeEventCandidates(FOUNDED);
        expect(candidates.every((candidate) => candidate.nation === USA)).toBe(true);
        expect(new Set(candidates.map((candidate) => candidate.kind)).size).toBe(candidates.length);
        expect(onsetCandidates(FOUNDED).filter((candidate) => HOME_EVENT_CONDITIONS.includes(candidate.kind)).every((c) => c.nation === USA)).toBe(true);
    });
    it("holds mass killings at the flat sourced rate", () => {
        expect(chanceOf(FOUNDED, "mass-casualty-attack")).toBeCloseTo(weekly(MASS_KILLINGS_PER_YEAR), 10);
    });
    it("raises the strike hazard when prices outrun the country's own normal", () => {
        const squeezed = withUs(FOUNDED, (runtime) => ({ ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, inflation: runtime.base.stats.economy.inflation + 0.05 } } }));
        expect(chanceOf(squeezed, "work-stoppage")).toBeGreaterThan(2 * chanceOf(FOUNDED, "work-stoppage"));
    });
    it("keeps a large bank failure near zero in calm water and raises it in a slump", () => {
        expect(chanceOf(FOUNDED, "bank-failure")).toBeCloseTo(weekly(BANK_CALM_PER_YEAR), 10);
        const slump = { ...FOUNDED, cycles: { ...FOUNDED.cycles, [USA]: { phase: "contraction", enteredTurn: 0, amplitude: 0.5 } } };
        expect(chanceOf(slump, "bank-failure")).toBeGreaterThan(20 * chanceOf(FOUNDED, "bank-failure"));
    });
    it("runs a strike and a banking episode as one file at a time", () => {
        const opened = openCondition(FOUNDED, { nation: USA, kind: "bank-failure", chance: 1 }, createRngStreams(FOUNDED.seed).stream("bank"));
        const running = { ...FOUNDED, conditions: { ...FOUNDED.conditions, [opened.id]: opened } };
        expect(chanceOf(running, "bank-failure")).toBe(0);
    });
    it("opens a cyberattack file only in a week a foreign crew broke into American systems", () => {
        expect(chanceOf(FOUNDED, "cyberattack")).toBe(0);
        const intrusion = cyberImpactEvent(FOUNDED, USA, "op:cyber-crew:RUS:0")[0].event;
        const struck = { ...FOUNDED, impactEvents: { ...FOUNDED.impactEvents, [intrusion.spec.id]: intrusion } };
        expect(chanceOf(struck, "cyberattack")).toBeCloseTo(CYBER_ESCALATION, 10);
        expect(chanceOf({ ...struck, turn: struck.turn + 1 }, "cyberattack")).toBe(0);
    });
    it("holds an American only where a government is hostile to Washington, and names it", () => {
        const captors = captorWeights(FOUNDED);
        expect(captors.length).toBeGreaterThan(0);
        for (const captor of captors)
            expect(captor.nation).not.toBe(USA);
        const friendly = captors.reduce((campaign, captor) => withTrust(campaign, captor.nation, 0.5), FOUNDED);
        expect(chanceOf(friendly, "wrongful-detention")).toBe(0);
        const captor = detentionCaptor(FOUNDED, 0.5);
        expect(captors.map((entry) => entry.nation)).toContain(captor);
        const opened = openCondition(FOUNDED, { nation: USA, kind: "wrongful-detention", chance: 1 }, createRngStreams(FOUNDED.seed).stream("held"));
        expect(opened.scope).toBe("nation");
        expect(opened.beats[0].description).toMatch(/holding an American citizen/);
    });
    it("places a mass killing in one city and closes it the week after, as an incident", () => {
        const opened = openCondition(FOUNDED, { nation: USA, kind: "mass-casualty-attack", chance: 1 }, createRngStreams(FOUNDED.seed).stream("attack"));
        expect(opened.scope).toBe("city");
        expect(opened.city).toBeDefined();
        expect(opened.lifetime).toBe("incident");
        expect(isIncidentKind("cyberattack")).toBe(false);
    });
    it("never lets a home event write the figure its own onset reads", () => {
        expect(conditionImpactWrites("work-stoppage")).not.toContain("economy.inflation");
        expect(conditionImpactWrites("work-stoppage")).not.toContain("economy.unemployment");
        expect(conditionImpactWrites("bank-failure")).not.toContain("economy.inflation");
        expect(conditionImpactWrites("cyberattack")).not.toContain("economy.growth");
    });
});
