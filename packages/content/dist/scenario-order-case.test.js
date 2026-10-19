import { describe, expect, it } from "vitest";
import { apply, commitReply, createRngStreams, projectReply } from "@admin/engine";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { auditScenarioCommands } from "./scenario-audit-command.js";
import { castScenario, castStillBound } from "./scenario-cast.js";
import { orderCaseBoards } from "./preview-board-order-case.js";
import { auditReachability } from "./scenario-reachability.js";
const base = FIXTURE_SCENARIOS[0];
const scenario = { ...base, id: "pending-order-case-probe", cast: { pick: "pendingOrderCase" },
    conditions: [{ kind: "pendingOrderCase" }], subject: "A live challenge to {{courtOrder}}",
    opening: [{ speaker: { kind: "narrator" }, text: "The Court is hearing this question: {{courtQuestion}} Rescission ends the order's future operation, but it does not dismiss the case." }],
    replies: [{ ...base.replies[0], commitment: { kind: "position", cost: {}, orderRescission: { action: "rescind" },
                remembered: "The President rescinded an order while its court case remained pending.",
                rejoinder: { speaker: { kind: "narrator" }, text: "The order's future authority ends. The pending case remains on the docket." } } }],
};
const lowerScenario = { ...scenario, id: "adverse-order-case-probe",
    conditions: [{ kind: "pendingOrderCase", posture: "adverse-lower", ruleState: "operative" }],
    replies: ["accept", "seek", "seek-with-stay"].map((choice) => ({ ...base.replies[0], id: choice,
        tone: choice === "accept" ? "principled" : choice === "seek" ? "firm" : "conciliatory",
        commitment: { kind: "position", cost: {}, orderReview: { choice },
            remembered: `The President chose ${choice} after the lower judgment.`,
            rejoinder: { speaker: { kind: "narrator" }, text: "The court response is recorded." } } })) };
describe("pending order case scenario binding", () => {
    it("routes each adverse lower answer to the pinned engine case and disables stale answers", () => {
        const state = orderCaseBoards([lowerScenario]).find((board) => castScenario(board, lowerScenario));
        const cast = castScenario(state, lowerScenario);
        const frozen = cast.orderCase;
        const findings = [];
        auditScenarioCommands(lowerScenario, findings);
        expect(findings).toEqual([]);
        for (const option of cast.script.options) {
            expect(projectReply(state, cast.script, option, createRngStreams(state.seed)).available).toBe(true);
            const committed = commitReply(state, cast.script, option, createRngStreams(state.seed));
            expect(committed.ok).toBe(true);
            if (!committed.ok)
                continue;
            const after = apply(state, committed.packet);
            expect(after.cases?.[`case:review:${frozen.proceedingId}`]?.status).toBe("acted");
            expect(after.judiciary.proceedings?.find((entry) => entry.id === frozen.proceedingId)?.governmentReview)
                .toBe(option.commitment.kind === "position" ? option.commitment.orderReview?.choice : undefined);
            expect(projectReply(after, cast.script, option, createRngStreams(after.seed)).available).toBe(false);
        }
    });
    it("reaches an actual adverse lower judgment over an operative rule", () => {
        const def = { ...scenario, id: "adverse-operative",
            conditions: [{ kind: "pendingOrderCase", posture: "adverse-lower", ruleState: "operative" }] };
        const boards = orderCaseBoards([def]);
        expect(boards.some((state) => castScenario(state, def)?.orderCase?.ruleState === "operative")).toBe(true);
        expect(auditReachability([def])).toEqual([]);
    });
    it("freezes an actual pending proceeding and rescinds prospectively without erasing it", () => {
        const state = orderCaseBoards([scenario])[0];
        expect(state).toBeDefined();
        if (!state)
            return;
        const cast = castScenario(state, scenario);
        const frozen = cast.orderCase;
        expect(cast.occurrence).toBe(`${scenario.id}@court:${frozen.proceedingId}`);
        expect(cast.script.subject).toContain(frozen.orderName);
        expect(cast.script.opening[0].text).toContain(frozen.question);
        const option = cast.script.options[0];
        expect(projectReply(state, cast.script, option, createRngStreams(state.seed)).available).toBe(true);
        const committed = commitReply(state, cast.script, option, createRngStreams(state.seed));
        expect(committed.ok).toBe(true);
        if (!committed.ok)
            return;
        const after = apply(state, committed.packet);
        expect(after.orders.find((order) => order.id === frozen.recordId)?.rescindedTurn).toBe(state.turn);
        expect(after.judiciary.proceedings?.some((proceeding) => proceeding.id === frozen.proceedingId)).toBe(true);
        expect(castStillBound(after, cast)).toBe(false);
    });
    it("disables a stale reply when the proceeding moves", () => {
        const state = orderCaseBoards([scenario])[0];
        const cast = castScenario(state, scenario);
        const frozen = cast.orderCase;
        const changed = { ...state, judiciary: { ...state.judiciary, proceedings: state.judiciary.proceedings?.map((entry) => entry.id === frozen.proceedingId ? { ...entry, stage: "final" } : entry) } };
        expect(castStillBound(changed, cast)).toBe(false);
        expect(projectReply(changed, cast.script, cast.script.options[0], createRngStreams(changed.seed)).available).toBe(false);
        expect(commitReply(changed, cast.script, cast.script.options[0], createRngStreams(changed.seed)).ok).toBe(false);
    });
    it("requires its paired case gate", () => {
        const findings = [];
        auditScenarioCommands(scenario, findings);
        expect(findings).toEqual([]);
        auditScenarioCommands({ ...scenario, conditions: [] }, findings);
        expect(findings.some((finding) => finding.kind === "ungrounded-command")).toBe(true);
    });
});
