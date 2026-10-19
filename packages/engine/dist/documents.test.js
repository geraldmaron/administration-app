import { describe, expect, it } from "vitest";
import { classificationForSeverity, classificationHelper, defaultClassificationForFamily, documentFamilyLabel, documentMarking, } from "./documents.js";
describe("classificationForSeverity", () => {
    it("maps scenario severity to handling levels", () => {
        expect(classificationForSeverity("routine")).toBe("UNCLASSIFIED");
        expect(classificationForSeverity("serious")).toBe("CONFIDENTIAL");
        expect(classificationForSeverity("critical")).toBe("SECRET");
    });
});
describe("defaultClassificationForFamily", () => {
    it("marks the daily brief secret", () => {
        expect(defaultClassificationForFamily("presidential-daily-brief")).toBe("SECRET");
    });
    it("defaults the decision memo to confidential", () => {
        expect(defaultClassificationForFamily("presidential-decision-memo")).toBe("CONFIDENTIAL");
    });
});
describe("documentMarking", () => {
    it("gives every level a handling line, so a banner is never drawn without a reason", () => {
        const levels = ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET"];
        for (const level of levels) {
            expect(classificationHelper(level).length).toBeGreaterThan(0);
        }
    });
    it("stamps the family default with its handling caveats", () => {
        const marking = documentMarking({ family: "presidential-daily-brief" });
        expect(marking.level).toBe("SECRET");
        expect(marking.caveats).toContain("NOFORN");
        expect(marking.line).toBe("SECRET // NOFORN // ORCON");
    });
    it("lets the week's severity decide the level, so a routine memo is not stamped", () => {
        expect(documentMarking({ family: "presidential-decision-memo", severity: "routine" }).level).toBe("UNCLASSIFIED");
        expect(documentMarking({ family: "presidential-decision-memo", severity: "serious" }).level).toBe("CONFIDENTIAL");
        expect(documentMarking({ family: "presidential-decision-memo", severity: "critical" }).level).toBe("SECRET");
    });
    it("falls back to the family default when no severity is supplied", () => {
        expect(documentMarking({ family: "presidential-decision-memo" }).level).toBe("CONFIDENTIAL");
    });
    it("releases a signed decision memo to the public record and drops its caveats", () => {
        const draft = documentMarking({ family: "presidential-decision-memo" });
        expect(draft.level).toBe("CONFIDENTIAL");
        expect(draft.caveats).toContain("PRE-DECISIONAL");
        const signed = documentMarking({ family: "presidential-decision-memo", released: true });
        expect(signed.level).toBe("UNCLASSIFIED");
        expect(signed.caveats).toEqual([]);
        expect(signed.line).toBe("UNCLASSIFIED");
    });
    it("names every remaining family in words", () => {
        const families = ["presidential-daily-brief", "presidential-decision-memo"];
        for (const family of families) {
            expect(documentFamilyLabel(family).length).toBeGreaterThan(0);
        }
    });
});
