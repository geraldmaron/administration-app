import { describe, expect, it } from "vitest";
import { assertPlayable } from "@admin/engine";
import { auditScenarios } from "../scenario-audit.js";
import { GROUNDING_FINDING_KINDS } from "../scenario-grounding.js";
import { SPEAKER_FINDING_KINDS } from "../scenario-audit-speakers.js";
import { castScenario, scenarioLive } from "../scenario-cast.js";
import { previewBoards } from "../preview-board.js";
import { auditReachability } from "../scenario-reachability.js";
import { ScenarioDef, ScenarioPack } from "../scenario.js";
import { PILOT_SCENARIOS, pilotPack } from "./pilot.js";
// The pilot pack exists to prove the five newest condition kinds are usable
// rather than merely parseable. So it is held to everything the bundled pack
// is — and to the one thing the bundled pack is not asked, reachability, since
// a condition kind with no board on which it holds is the exact failure these
// pilots were written to rule out.
const CONDITION_KINDS = [
    "coalition",
    "sharedMembership",
    "policyStance",
    "operatorPressure",
    "geography",
];
describe("the pilot pack ships clean", () => {
    it("every scenario parses as the schema the pipeline validates", () => {
        for (const scenario of PILOT_SCENARIOS) {
            expect(() => ScenarioDef.parse(scenario), scenario.id).not.toThrow();
        }
        expect(() => ScenarioPack.parse(pilotPack)).not.toThrow();
    });
    // Same scoping as the core pack: the grounding rules postdate this pack, so
    // its debt is counted and every other rule stays at zero tolerance. The one
    // grounding *error* the rules found here — a scenario carrying no
    // particulars at all — was fixed rather than allowed, because zero
    // particulars is a defect at any severity (§6.1).
    const PILOT_GROUNDING_DEBT = 1;
    // The speaker rule also postdates the pack: a cabinet line handed to a
    // department with no brief in the week's class still plays, so it is
    // counted with the grounding debt and never asserted away.
    const PILOT_SPEAKER_DEBT = 8;
    it("passes every rule outside the grounding family with zero findings", () => {
        const findings = auditScenarios(PILOT_SCENARIOS);
        const debt = (finding) => GROUNDING_FINDING_KINDS.has(finding.kind) || SPEAKER_FINDING_KINDS.has(finding.kind);
        expect(findings.filter((finding) => !debt(finding))).toEqual([]);
        expect(findings.filter((finding) => finding.severity === "error")).toEqual([]);
        expect(findings.filter((finding) => SPEAKER_FINDING_KINDS.has(finding.kind)).length).toBeLessThanOrEqual(PILOT_SPEAKER_DEBT);
        expect(findings.length).toBeLessThanOrEqual(PILOT_GROUNDING_DEBT + PILOT_SPEAKER_DEBT);
    });
    it("every scenario, cast on the real dataset, clears the engine's playability gate", () => {
        for (const scenario of PILOT_SCENARIOS) {
            const cast = castScenario(previewBoards()[0], scenario);
            expect(cast, scenario.id).toBeDefined();
            expect(() => assertPlayable(cast.script), scenario.id).not.toThrow();
        }
    });
    it("every scenario is reachable on the preview boards", () => {
        expect(auditReachability(PILOT_SCENARIOS)).toEqual([]);
    });
    it("pilots one scenario per new condition kind", () => {
        for (const kind of CONDITION_KINDS) {
            const carrying = PILOT_SCENARIOS.filter((def) => def.conditions.some((condition) => condition.kind === kind));
            expect(carrying.length, kind).toBeGreaterThanOrEqual(1);
        }
    });
    it("each new kind is true on at least one preview board, not merely satisfiable in principle", () => {
        const boards = previewBoards({ "kept-the-yards-on-naval-orders": true, "bought-the-hulls-abroad": true });
        for (const kind of CONDITION_KINDS) {
            const def = PILOT_SCENARIOS.find((candidate) => candidate.conditions.some((condition) => condition.kind === kind));
            const live = boards.filter((board) => {
                const cast = castScenario(board, def);
                return cast !== undefined && scenarioLive(board, def, cast.counterpart);
            });
            expect(live.length, kind).toBeGreaterThanOrEqual(1);
        }
    });
});
