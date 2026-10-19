import { describe, expect, it } from "vitest";
import { institutionDef, officeDef } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening.js";
import { officeOrganogram } from "./organogram.js";
function hrefOfficeId(href) {
    const match = /^\/washington\/office\/(.+)$/.exec(href);
    return match ? decodeURIComponent(match[1]) : undefined;
}
/** Every organogram door must resolve to a catalog office id, never StaleEntity. */
function officeHrefResolves(id) {
    return officeDef(id) !== undefined;
}
function assertEveryHrefResolves(campaign, institutionId) {
    const def = institutionDef(institutionId);
    expect(def).toBeDefined();
    const sections = officeOrganogram(campaign, def);
    for (const section of sections) {
        for (const entry of section.entries) {
            const officeId = hrefOfficeId(entry.href);
            expect(officeId, entry.href).toBeDefined();
            expect(officeHrefResolves(officeId), entry.href).toBe(true);
        }
    }
}
describe("officeOrganogram", () => {
    it("every href on a component organogram resolves to a catalog office", () => {
        const campaign = openingCampaign({ seedText: "cab21-organogram-fema" });
        const sections = officeOrganogram(campaign, institutionDef("INST-FEMA"));
        expect(sections.length).toBeGreaterThan(0);
        assertEveryHrefResolves(campaign, "INST-FEMA");
    });
    it("every href on the Fed chair file's organogram resolves when sections exist", () => {
        const campaign = openingCampaign({ seedText: "cab21-organogram-fed" });
        assertEveryHrefResolves(campaign, "INST-FED");
    });
});
