import { describe, expect, it } from "vitest";
import { CORE_SCENARIOS } from "./packs/core.js";
import { auditPremiseAndContext } from "./scenario-audit-premise.js";
const base = CORE_SCENARIOS[0];
const withText = (text, over = {}) => ({
    ...base,
    conditions: [{ kind: "turn", atLeast: 3 }],
    opening: [{ speaker: { kind: "narrator" }, text }, ...base.opening.slice(1)],
    ...over,
});
const kinds = (def) => auditPremiseAndContext([def]).map((finding) => finding.kind);
describe("premise and context warnings", () => {
    it("flags a recession claim that nothing gates", () => {
        expect(kinds(withText("The recession has now run three quarters and the layoffs reach every county."))).toContain("premise-ungated");
    });
    it("accepts the same claim once an economic reading gates it", () => {
        const def = withText("The recession has now run three quarters.", { conditions: [{ kind: "cyclePhase", in: ["contraction"] }] });
        expect(kinds(def)).not.toContain("premise-ungated");
    });
    it("flags first-person claims on counterpart ground", () => {
        const def = withText("Freight backs up and our trucks sit a week at the crossing.", { locus: { ...base.locus, ground: "counterpart" } });
        expect(kinds(def)).toContain("context-first-person-abroad");
    });
    it("flags an unbound organization noun and accepts a subject slot", () => {
        expect(kinds(withText("The compact has not ruled on the review."))).toContain("context-body-unbound");
    });
    it("only ever warns", () => {
        expect(auditPremiseAndContext(CORE_SCENARIOS).every((finding) => finding.severity === "warning")).toBe(true);
    });
});
