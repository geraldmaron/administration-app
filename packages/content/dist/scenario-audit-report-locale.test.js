import { describe, expect, it } from "vitest";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { auditCollectionReport } from "./scenario-audit-report.js";
const base = FIXTURE_SCENARIOS[0];
function reporting(condition, act) {
    return {
        ...base, id: `locale-audit-${act}-${condition}`,
        cast: { pick: "collectionReport", bind: "home" },
        conditions: [{ kind: "collectionReport", targetKind: "domestic-state", topic: "domestic-security",
                basis: "governor-request", condition, confidence: "low" }],
        replies: base.replies.map((reply, index) => index === 0 && reply.commitment.kind === "position"
            ? { ...reply, commitment: { ...reply.commitment, cost: {}, impact: undefined, localeAct: act } } : reply),
    };
}
const messages = (def) => {
    const findings = [];
    auditCollectionReport(def, findings);
    return findings.map((finding) => finding.message);
};
describe("coercive state responses", () => {
    it("accept unrest and refuse a disaster for a property surge", () => {
        expect(messages(reporting("unrest", "property-surge")).filter((m) => m.includes("coercive"))).toEqual([]);
        expect(messages(reporting("wildfire", "property-surge")).some((m) => m.includes("coercive"))).toBe(true);
    });
    it("keep relief on an acute disaster only", () => {
        expect(messages(reporting("wildfire", "relief")).filter((m) => m.includes("acute"))).toEqual([]);
        expect(messages(reporting("unrest", "relief")).some((m) => m.includes("acute"))).toBe(true);
    });
});
describe("court flag reads", () => {
    it("refuse the application flag and accept the ruling flag", () => {
        const read = (flag) => ({ ...base, conditions: [{ kind: "flag", flag, is: true }] });
        expect(messages(read("court-application:search-warrant:MN"))).toHaveLength(1);
        expect(messages(read("court-order-granted:search-warrant:MN"))).toEqual([]);
    });
});
