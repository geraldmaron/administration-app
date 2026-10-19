import { CONDITION_KINDS, INSTITUTION_CATALOG, isFederallyDeployable } from "@admin/engine";
import { describe, expect, it } from "vitest";
import { openingCampaign } from "../__fixtures__/opening";
import { anchored, place } from "../navigation/places";
import { pledgeDoor } from "../record/promises";
import { institutionActionsHref, roleActionsHref } from "../shell/office-of";
import { attentionItems } from "./attention";
import { conditionRoute } from "./condition-route";
import { BUDGET_FUNDING } from "./family-sources";
// A notification deep-links to the component that shows it: the href ends in
// #<id>, and apps/web draws that id (scripts/verify-attention-anchors.mjs).
const hashOf = (href) => new URL(href, "https://example.test").hash;
const kindWhere = (deployable) => CONDITION_KINDS.find((kind) => isFederallyDeployable(kind) === deployable);
describe("anchored", () => {
    it("puts the anchor after the query", () => {
        expect(anchored(place.budgetView("books"), "books-position")).toBe("/nation/budget?view=books#books-position");
    });
});
describe("where an emergency at home opens", () => {
    it("lands a deployable one on the incident list, and a state's own on its conditions view", () => {
        expect(conditionRoute({ id: "c1", kind: kindWhere(true) })).toBe("/nation/emergency?incident=c1#emergency-incidents");
        expect(conditionRoute({ id: "c2", kind: kindWhere(false), state: "MI" })).toBe("/nation/state/MI?view=conditions#state-conditions");
    });
    it("sends a national condition to the states view of the Nation, which has no country file of its own", () => {
        expect(conditionRoute({ id: "c3", kind: kindWhere(false) })).toBe("/nation?view=states#nation-conditions");
    });
});
describe("the doors that ask a role or a body", () => {
    it("open the chair's pending acts", () => {
        expect(hashOf(roleActionsHref("role-foreign-minister"))).toBe("#office-actions");
        expect(hashOf(institutionActionsHref(INSTITUTION_CATALOG.find((def) => def.offices.length > 0).id))).toBe("#office-actions");
    });
});
describe("the sources the Desk raises on a fresh term", () => {
    const campaign = openingCampaign();
    it("name the component for every calendar date", () => {
        const dates = attentionItems(campaign).filter((item) => item.id.startsWith("milestone:"));
        expect(dates.length).toBeGreaterThan(0);
        for (const item of dates)
            expect(hashOf(item.href), item.id).not.toBe("");
    });
    it("open the funding clock for the budget deadline", () => {
        expect(BUDGET_FUNDING).toBe("/nation/budget#budget-status");
        expect(place.approval()).toBe("/nation?view=opinion#elec-topline");
    });
    it("open a pledge on the order it asks for, and a program pledge on the proposals", () => {
        expect(pledgeDoor("plank-secure-border")?.href).toMatch(/#order-status$/);
        expect(pledgeDoor("plank-fair-share")?.href).toMatch(/#policy-proposals$/);
    });
});
