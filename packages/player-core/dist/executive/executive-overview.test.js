import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening.js";
import { executiveTree } from "../government/executive-tree.js";
import { chairCounts, executiveMatters, executiveOverview } from "./executive-overview.js";
const matter = (id, href) => ({ id, kind: "row", kindLabel: "Matter", kindIcon: "brief", title: id, reason: "", urgency: "soft", stance: "neutral", holds: false, ...(href ? { href } : {}) });
describe("the executive overview", () => {
    const campaign = openingCampaign({ seedText: "executive-overview" });
    const overview = executiveOverview(campaign);
    it("counts every chair once, and the three ways a chair is held add up to all of them", () => {
        const { chairs } = overview;
        expect(chairs.confirmed + chairs.acting + chairs.vacant).toBe(chairs.total);
        expect(chairs).toEqual(chairCounts(campaign, executiveTree(campaign).flatMap((section) => section.nodes)));
        expect(overview.sections.reduce((sum, section) => sum + section.offices.reduce((inner, office) => inner + 1 + office.agencies, 0), 0)).toBe(chairs.total);
    });
    it("carries the branch figure and the delivery rows from the delivery reading", () => {
        const drawn = overview.sections.flatMap((section) => section.offices.flatMap((office) => [...(office.delivery ? [office.delivery.institution] : []), ...office.agencyDelivery.map((agency) => agency.row.institution)]));
        expect([...drawn].sort()).toEqual(overview.delivery.rows.map((row) => row.institution).sort());
        expect(overview.bodiesCounted).toBeGreaterThanOrEqual(overview.delivery.rows.length);
    });
    it("tallies every service once and names the longest wait without pooling", () => {
        const { serviceTally, services, longestWait } = overview;
        expect(serviceTally.total).toBe(services.rows.length);
        expect(serviceTally.good + serviceTally.watch + serviceTally.bad + serviceTally.neutral).toBe(serviceTally.total);
        if (longestWait)
            for (const row of services.rows.filter((entry) => entry.status !== "opening"))
                expect(longestWait.pendingWeeks).toBeGreaterThanOrEqual(row.pendingWeeks);
    });
    it("gives each department the tally of the services it owns", () => {
        const owned = overview.sections.flatMap((section) => section.offices).reduce((sum, office) => sum + (office.services?.total ?? 0), 0);
        expect(owned).toBeLessThanOrEqual(overview.services.rows.length);
    });
});
describe("matters answered in the executive branch", () => {
    it("keeps Washington's executive pages and drops the other branches and other modes", () => {
        const kept = executiveMatters([
            matter("a", "/washington"),
            matter("b", "/washington/office/state#actions"),
            matter("c", "/washington/person/p1"),
            matter("d", "/washington/congress?view=nominations"),
            matter("e", "/washington/courts/case/1"),
            matter("f", "/washington/oversight"),
            matter("g", "/brief/decision/x"),
            matter("h", undefined),
            matter("i", "/washington-extra"),
        ]);
        expect(kept.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    });
});
