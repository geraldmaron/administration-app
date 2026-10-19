import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { proposeThisWeek } from "./cabinet-agenda.js";
import { SLOW_WALK_QUALITY } from "./directives.js";
import { INSTITUTION_CATALOG } from "./institutions.js";
// A cabinet whose chairs are filled and whose departments still clear the
// delivery line the directive layer already uses. The fixture founds every
// political office empty, so a week with no trigger has to be built from it.
function quiet(campaign) {
    const institutions = { ...campaign.institutions };
    for (const def of INSTITUTION_CATALOG) {
        if (!def.cabinetRole)
            continue;
        const runtime = institutions[def.id];
        if (!runtime)
            continue;
        institutions[def.id] = {
            ...runtime,
            vacancy: false,
            vacantDays: 0,
            implementationQuality: Math.max(runtime.implementationQuality, SLOW_WALK_QUALITY),
        };
    }
    return { ...campaign, institutions };
}
function withRuntime(campaign, id, changes) {
    const runtime = campaign.institutions[id];
    if (!runtime)
        throw new Error(`missing institution ${id}`);
    return { ...campaign, institutions: { ...campaign.institutions, [id]: { ...runtime, ...changes } } };
}
describe("a department proposal for the week", () => {
    it("returns nothing when no chair is vacant and delivery holds", () => {
        const held = withRuntime(quiet(buildCampaign()), "INST-HUD", { implementationQuality: SLOW_WALK_QUALITY });
        expect(proposeThisWeek(held)).toBeNull();
    });
    it("yields one proposal for the fixture's vacant chairs", () => {
        const vacant = buildCampaign();
        expect(proposeThisWeek(vacant)).toEqual({
            role: "role-education-secretary",
            reason: "vacancy",
            week: vacant.turn,
        });
    });
    it("yields one proposal when a department is delivering below the line", () => {
        const hollow = withRuntime(quiet(buildCampaign()), "INST-DOD", { implementationQuality: 0.2 });
        expect(proposeThisWeek(hollow)).toEqual({
            role: "role-defense-minister",
            reason: "delivery",
            week: hollow.turn,
        });
    });
    it("yields one proposal when two departments are hollow, and the worse delivery wins", () => {
        const both = withRuntime(withRuntime(quiet(buildCampaign()), "INST-HUD", { implementationQuality: 0.4 }), "INST-ED", { implementationQuality: 0.2 });
        expect(proposeThisWeek(both)).toEqual({
            role: "role-education-secretary",
            reason: "delivery",
            week: both.turn,
        });
    });
    it("returns the same proposal on a second call", () => {
        const vacant = buildCampaign();
        const hollow = withRuntime(withRuntime(quiet(vacant), "INST-HUD", { implementationQuality: 0.4 }), "INST-VA", { implementationQuality: 0.4 });
        expect(proposeThisWeek(vacant)).toEqual(proposeThisWeek(vacant));
        expect(proposeThisWeek(hollow)).toEqual(proposeThisWeek(hollow));
        expect(proposeThisWeek(hollow)).toEqual({
            role: "role-veterans-secretary",
            reason: "delivery",
            week: hollow.turn,
        });
    });
});
