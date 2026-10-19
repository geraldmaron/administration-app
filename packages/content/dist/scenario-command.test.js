import { describe, expect, it } from "vitest";
import { apply, commitReply, createRngStreams, createSave, loadSave, projectReply } from "@admin/engine";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { oversightBoard } from "./preview-board-oversight.js";
import { tradeBoards } from "./preview-board-trade.js";
import { auditScenarioCommands } from "./scenario-audit-command.js";
import { castScenario, castStillBound } from "./scenario-cast.js";
const base = FIXTURE_SCENARIOS[0];
const tariff = { ...base, id: "test-pinned-tariff", cast: { pick: "tradeMeasure" },
    conditions: [{ kind: "tradeMeasure", origin: "retaliation", responseSector: "energy-refined", responseRate: 0.15 }],
    replies: [{ ...base.replies[0], commitment: { kind: "position", cost: {}, tariff: { sector: "energy-refined", rate: 0.15 },
                remembered: "The President signed a tariff answering the landed foreign measure.",
                rejoinder: { speaker: { kind: "narrator" }, text: "The order went to Customs; the cost will appear in the trade ledger." } } }],
};
const directive = { ...base, id: "test-pinned-matter", cast: { pick: "none" },
    conditions: [{ kind: "oversightMatter", origin: "inspector-general", institution: "INST-DOJ", stage: "opened", public: false }],
    replies: [{ ...base.replies[0], commitment: { kind: "position", cost: {}, directive: { kind: "investigation" },
                remembered: "The President directed an investigation into the open departmental matter.",
                rejoinder: { speaker: { kind: "narrator" }, text: "The directive reached the department, where its answer is now on the record." } } }],
};
describe("record-bound authored commands", () => {
    it("uses an engine-landed retaliation and executes the tariff after save/reopen", () => {
        const board = tradeBoards([tariff])[0];
        expect(board).toBeDefined();
        const cast = castScenario(board, tariff);
        expect(cast.tradeMeasure?.id).toMatch(/^retaliation-measure:/);
        expect(castStillBound(loadSave(JSON.parse(JSON.stringify(createSave(board)))), cast)).toBe(true);
        const option = cast.script.options[0];
        expect(projectReply(board, cast.script, option, createRngStreams(board.seed)).available).toBe(true);
        const committed = commitReply(board, cast.script, option, createRngStreams(board.seed));
        expect(committed.ok).toBe(true);
        if (!committed.ok)
            return;
        expect(Object.values(apply(board, committed.packet).trade.measures).some((measure) => measure.origin === "us" &&
            measure.target === cast.counterpart && measure.sector === "energy-refined")).toBe(true);
        const source = cast.tradeMeasure;
        const changed = { ...board, trade: { ...board.trade, measures: { ...board.trade.measures,
                    [source.id]: { ...board.trade.measures[source.id], rate: source.rate + 0.01 } } } };
        expect(castStillBound(changed, cast)).toBe(false);
    });
    it("pins an engine-opened inspector-general file and executes its directive", () => {
        const board = oversightBoard();
        const cast = castScenario(board, directive);
        expect(cast.matter?.id).toMatch(/^matter:ig:/);
        expect(castStillBound(loadSave(JSON.parse(JSON.stringify(createSave(board)))), cast)).toBe(true);
        const option = cast.script.options[0];
        expect(projectReply(board, cast.script, option, createRngStreams(board.seed)).available).toBe(true);
        const committed = commitReply(board, cast.script, option, createRngStreams(board.seed));
        expect(committed.ok).toBe(true);
        if (!committed.ok)
            return;
        expect(committed.packet.effects.some((effect) => effect.kind === "institution")).toBe(true);
    });
    it("refuses commands with unpinned or mismatched authoring", () => {
        const findings = [];
        // Off a retaliation cast the tariff is laid on the counterpart, so only the orphaned gate is refused.
        auditScenarioCommands({ ...tariff, cast: { pick: "tensest" } }, findings);
        auditScenarioCommands({ ...directive, conditions: [] }, findings);
        expect(findings.filter((finding) => finding.kind === "ungrounded-command")).toHaveLength(2);
    });
});
