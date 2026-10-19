import { describe, expect, it } from "vitest";
import { APPROPRIATION_DOOR, obligationHint, obligationHref } from "./obligation-doors";
describe("obligation doors", () => {
    it("sends the appropriation's lapse to the budget, which carries the whole of it", () => {
        expect(obligationHref(APPROPRIATION_DOOR)).toBe("/nation/budget");
        expect(obligationHint(APPROPRIATION_DOOR)).toBe("Opens the Budget.");
    });
    it("resolves a subject-kind door through the shared subject table", () => {
        const named = { kind: "subject", ref: { kind: "nation", id: "VEN" }, name: "Venezuela" };
        expect(obligationHref(named)).toBe("/world/nation/VEN");
        expect(obligationHint(named)).toContain("Venezuela");
    });
    it("is a real absence for a door built from no obligation at all", () => {
        expect(obligationHref(null)).toBeUndefined();
        expect(obligationHint(null)).toBeUndefined();
    });
});
