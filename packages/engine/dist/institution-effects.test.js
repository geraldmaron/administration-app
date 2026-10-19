import { describe, expect, it } from "vitest";
import { applyNomination } from "./institution-effects.js";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
const NOMINEE = "PER-NOMINEE";
function pending(office, institution) {
    const base = buildCampaign();
    const nomination = {
        id: `${office}:1`,
        office,
        institution,
        nominee: NOMINEE,
        stage: "vote",
        stageEnteredDay: 100,
        openedDay: 1,
        controversies: [],
        history: [],
    };
    return {
        ...base,
        people: { ...base.people, [NOMINEE]: { base: { ...person, id: NOMINEE, competence: 0.85 }, alive: true } },
        nominations: { [nomination.id]: nomination },
    };
}
const confirm = (campaign, id) => applyNomination(campaign, { kind: "nomination", advance: { id, stage: "confirmed", day: 120, note: "Confirmed." } });
describe("the Senate's confirmation", () => {
    it("seats the officer through the one writer and lifts the building's morale", () => {
        const campaign = pending("OFF-FEMA-HEAD", "INST-FEMA");
        const before = campaign.institutions["INST-FEMA"];
        const after = confirm(campaign, "OFF-FEMA-HEAD:1");
        const fema = after.institutions["INST-FEMA"];
        expect(fema.leader).toBe(NOMINEE);
        expect(fema.vacancy).toBe(false);
        expect(fema.morale).toBeCloseTo(Math.min(1, before.morale + 0.05), 10);
        expect(fema.implementationQuality).toBeGreaterThan(before.implementationQuality);
        expect(after.people[NOMINEE].currentRole).toBe("role-agency-head");
    });
    it("reads the new head's competence into what the building delivers the day they are seated", () => {
        const at = (competence) => {
            const campaign = pending("OFF-FEMA-HEAD", "INST-FEMA");
            const nominee = campaign.people[NOMINEE];
            const seated = { ...campaign, people: { ...campaign.people, [NOMINEE]: { ...nominee, base: { ...nominee.base, competence } } } };
            return confirm(seated, "OFF-FEMA-HEAD:1").institutions["INST-FEMA"].implementationQuality;
        };
        expect(at(0.95)).toBeGreaterThan(at(0.5));
    });
    it("seats nobody for a deputy's office", () => {
        const campaign = pending("OFF-LABOR-DEP", "INST-LABOR");
        const after = confirm(campaign, "OFF-LABOR-DEP:1");
        expect(after.nominations["OFF-LABOR-DEP:1"].stage).toBe("confirmed");
        expect(after.institutions).toBe(campaign.institutions);
        expect(after.people).toBe(campaign.people);
    });
    it("moves no seat on any other stage", () => {
        const campaign = pending("OFF-LABOR-SEC", "INST-LABOR");
        const after = applyNomination(campaign, {
            kind: "nomination",
            advance: { id: "OFF-LABOR-SEC:1", stage: "rejected", day: 120, note: "Rejected.", outcome: "rejected on the floor" },
        });
        expect(after.institutions).toBe(campaign.institutions);
        expect(after.people[NOMINEE].currentRole).toBeUndefined();
    });
});
