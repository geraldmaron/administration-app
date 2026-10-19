import { describe, expect, it } from "vitest";
import { ScenarioReply, LENGTH_FLOORS } from "./scenario.js";
// Commit 65635de7 renamed the cost key readiness ->
// militaryReadiness. The local corpus was migrated, but a remote content
// service can still serve shards cut before that rename, and a `.strict()`
// cost shape has no way to say "known old name" — it drops the whole
// scenario. This pins the normalization that stops that drop from recurring.
function reply(cost) {
    return {
        id: "r1",
        tone: "firm",
        text: "x".repeat(LENGTH_FLOORS.reply),
        commitment: {
            kind: "position",
            cost,
            remembered: "x".repeat(LENGTH_FLOORS.remembered),
            rejoinder: { speaker: { kind: "narrator" }, text: "x".repeat(LENGTH_FLOORS.beat) },
        },
    };
}
describe("MetricCostShape — the pre-rename readiness key", () => {
    it("normalizes a shard authored under the old readiness key to militaryReadiness", () => {
        const parsed = ScenarioReply.parse(reply({ readiness: -0.1 }));
        expect(parsed.commitment.kind).toBe("position");
        if (parsed.commitment.kind !== "position")
            throw new Error("unreachable");
        expect(parsed.commitment.cost).toEqual({ militaryReadiness: -0.1 });
    });
    it("still accepts the current militaryReadiness key unchanged", () => {
        const parsed = ScenarioReply.parse(reply({ militaryReadiness: -0.1 }));
        if (parsed.commitment.kind !== "position")
            throw new Error("unreachable");
        expect(parsed.commitment.cost).toEqual({ militaryReadiness: -0.1 });
    });
    it("rejects a cost carrying both keys at once — that is malformed, not a rename", () => {
        expect(() => ScenarioReply.parse(reply({ readiness: -0.1, militaryReadiness: -0.2 }))).toThrow();
    });
    it("still rejects a genuinely unrecognized cost key", () => {
        expect(() => ScenarioReply.parse(reply({ moxie: -0.1 }))).toThrow();
    });
});
