import { describe, expect, it } from "vitest";
import { apply, commitReply, createRngStreams, projectReply, selectCustomsReceipts } from "@admin/engine";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { tradeBoards } from "./preview-board-trade.js";
import { auditScenarioCommands } from "./scenario-audit-command.js";
import { auditTradeActs } from "./scenario-audit-trade.js";
import { castBound, castScenario } from "./scenario-cast.js";
import { previewScenario } from "./scenario-reply-preview.js";
const base = FIXTURE_SCENARIOS[0];
const rejoinder = { speaker: { kind: "narrator" }, text: "The order went to Customs, and the change is on the trade ledger." };
const pinned = [
    { kind: "tariffInForce", present: true },
    { kind: "tradeMeasure", origin: "retaliation", responseSector: "energy-refined", responseRate: 0.15 },
];
const lift = (theirs) => ({ ...base, id: `test-lift-${theirs}`, cast: { pick: "tradeMeasure" }, conditions: pinned,
    replies: [{ ...base.replies[0], text: "Lift our tariff today.", commitment: { kind: "position", cost: {}, tariffLift: { theirs },
                remembered: "The President lifted the tariff.", rejoinder } }],
});
const direct = { ...base, id: "test-direct-tariff", cast: { pick: "tensest" }, conditions: [],
    replies: [{ ...base.replies[0], text: "Impose a fifteen-percent tariff on their refined fuel.", commitment: { kind: "position", cost: {},
                tariff: { sector: "energy-refined", rate: 0.15 }, remembered: "The President imposed a tariff on refined fuel.", rejoinder } }],
};
const board = tradeBoards([lift(true)])[0];
const commit = (campaign, def, counterpart) => {
    const cast = counterpart ? castBound(campaign, def, counterpart) : castScenario(campaign, def);
    const option = cast.script.options[0];
    return { cast, projected: projectReply(campaign, cast.script, option, createRngStreams(campaign.seed)),
        committed: commitReply(campaign, cast.script, option, createRngStreams(campaign.seed)) };
};
describe("scenario trade acts run through the trade engine", () => {
    it("lifts our answered tariff, and with theirs the retaliation, and customs stops collecting ours", () => {
        for (const theirs of [false, true]) {
            const { cast, committed } = commit(board, lift(theirs));
            expect(committed.ok).toBe(true);
            if (!committed.ok)
                return;
            const after = apply(board, committed.packet);
            const retaliation = after.trade.measures[cast.tradeMeasure.id];
            const record = board.trade.retaliation.find((candidate) => `retaliation-measure:${candidate.id}` === cast.tradeMeasure.id);
            expect(board.trade.measures[record.answering]?.liftedTurn).toBeUndefined();
            expect(after.trade.measures[record.answering]?.liftedTurn).toBe(board.turn);
            expect(retaliation.liftedTurn !== undefined).toBe(theirs);
            expect(selectCustomsReceipts(after)).toBeLessThan(selectCustomsReceipts(board));
        }
    });
    it("refuses the lift once our tariff is already off", () => {
        const lifted = { ...board, trade: { ...board.trade, measures: Object.fromEntries(Object.entries(board.trade.measures)
                    .map(([id, measure]) => [id, measure.origin === "us" ? { ...measure, liftedTurn: board.turn } : measure])) } };
        const cast = castBound(board, lift(false), castScenario(board, lift(false)).counterpart);
        const projected = projectReply(lifted, cast.script, cast.script.options[0], createRngStreams(board.seed));
        expect(projected.available).toBe(false);
        expect(projected.missingCapability).toBe("The tariff this answer lifts is no longer in force.");
    });
    it("lays a stated tariff on the cast counterpart under the law that fits, and refuses where none does", () => {
        const answering = castScenario(board, lift(true)).tradeMeasure.actor;
        const { committed } = commit(board, direct, answering);
        expect(committed.ok).toBe(true);
        if (!committed.ok)
            return;
        const imposed = Object.values(apply(board, committed.packet).trade.measures).find((measure) => measure.origin === "us" && measure.target === answering && measure.sector === "energy-refined");
        expect(imposed?.rate).toBe(0.15);
        const uncovered = Object.keys(board.nations).find((id) => id !== board.founding.nation && id !== answering &&
            !commit(board, direct, id).projected.available);
        expect(uncovered).toBeDefined();
        expect(commit(board, direct, uncovered).projected.missingCapability).toBe("No trade law covers this tariff at that rate.");
    });
});
describe("the trade-act audit", () => {
    const kinds = (def) => {
        const findings = [];
        auditTradeActs(def, findings);
        return findings.map((finding) => finding.kind);
    };
    const withReply = (text, commitment) => ({ ...base, id: "test-trade-audit", replies: [{ ...base.replies[0], text, commitment }] });
    const position = (extra) => ({ kind: "position", cost: { standing: -0.02 }, remembered: "Recorded.", rejoinder, ...extra });
    it("refuses a lift, a pause or sanctions the reply never routes", () => {
        expect(kinds(withReply("Announce the thirty-day pause on our tariff.", position({})))).toEqual(["unrouted-trade-act"]);
        expect(kinds(withReply("Condemn them and announce sectoral sanctions.", position({})))).toEqual(["unrouted-trade-act"]);
        expect(kinds(withReply("Lift our tariff today.", position({ cost: {}, tariffLift: { theirs: false } })))).toEqual([]);
    });
    it("reads a declined act or a proposal for talks as no act", () => {
        expect(kinds(withReply("Keep our tariff for now. We do not lift a duty on an offer with no check attached.", position({})))).toEqual([]);
        expect(kinds(withReply("Send the envoy: talks held on the frontier, with the duty lifted while they run.", position({})))).toEqual([]);
    });
    it("refuses a rate, goods or scope the route does not lay", () => {
        const tariff = (text) => withReply(text, position({ cost: {}, tariff: { sector: "energy-refined", rate: 0.15 } }));
        expect(kinds(tariff("Impose a twenty-percent tariff on their refined fuel."))).toEqual(["trade-act-terms-mismatch"]);
        expect(kinds(tariff("Impose a 15% tariff on their steel."))).toEqual(["trade-act-terms-mismatch"]);
        expect(kinds(tariff("Answer with a fifteen-percent U.S. tariff on their refined fuel."))).toEqual([]);
        const rung = (text) => withReply(text, { kind: "instrument", instrument: "economic", rung: 2, rejoinder });
        expect(kinds(rung("Raise our tariff to match theirs exactly."))).toEqual(["trade-act-terms-mismatch"]);
        expect(kinds(rung("Match their tariffs on everything that moves across the border."))).toEqual(["trade-act-terms-mismatch"]);
        expect(kinds(rung("Put a ten-percent tariff on the goods we buy most from them."))).toEqual([]);
    });
    it("refuses a tariff the reply's words never mention", () => {
        const rung = withReply("Put the agreement back on the table beside the coastal file.", { kind: "instrument", instrument: "economic", rung: 2, rejoinder });
        expect(kinds(rung)).toEqual(["unstated-trade-act"]);
    });
    it("holds a lift to the retaliation and the tariff the week is about", () => {
        const findings = [];
        auditScenarioCommands({ ...lift(false), conditions: [pinned[1]] }, findings);
        auditScenarioCommands({ ...direct, cast: { pick: "none" } }, findings);
        auditScenarioCommands({ ...direct, replies: [{ ...direct.replies[0], commitment: { ...direct.replies[0].commitment, tariff: { sector: "semiconductor-equipment", rate: 0.1 } } }] }, findings);
        expect(findings.filter((finding) => finding.kind === "ungrounded-command")).toHaveLength(3);
        const priced = (cost) => {
            const def = lift(false);
            const found = [];
            auditScenarioCommands({ ...def, replies: [{ ...def.replies[0], commitment: { ...def.replies[0].commitment, cost } }] }, found);
            return found.filter((finding) => finding.kind === "ungrounded-command").length;
        };
        expect(priced({ stability: -0.04, standing: 0.03 })).toBe(0);
        expect(priced({ treasury: 20 })).toBe(1);
        const clean = [];
        auditScenarioCommands(lift(true), clean);
        auditScenarioCommands(direct, clean);
        expect(clean).toEqual([]);
    });
});
describe("a lift of the tariff laid back in kind", () => {
    const response = { ...lift(true), id: "test-lift-response",
        conditions: [{ kind: "tariffInForce", present: true, of: "response" }, pinned[1]],
        replies: [{ ...lift(true).replies[0], commitment: { ...lift(true).replies[0].commitment, tariffLift: { theirs: true, which: "response" } } }],
    };
    it("lifts the response tariff and their duty, and leaves the tariff they answered in force", () => {
        const preview = previewScenario(response);
        expect(preview.boards.length).toBeGreaterThan(0);
        const lifted = preview.replies[0].lifted;
        expect(lifted.map((measure) => `${measure.origin}:${measure.sector}`).sort()).toEqual(["retaliation:" + lifted.find((m) => m.origin === "retaliation").sector, "us:energy-refined"].sort());
    });
    it("is refused by the audit when its gate names the other tariff", () => {
        const findings = [];
        auditScenarioCommands({ ...response, conditions: [pinned[0], pinned[1]] }, findings);
        expect(findings.filter((finding) => finding.kind === "ungrounded-command")).toHaveLength(1);
    });
});
describe("the developer preview of a scenario", () => {
    it("runs every reply on a live board and never recasts against the President's own country", () => {
        const preview = previewScenario(lift(false), 0, "USA");
        expect(preview.board?.counterpart).not.toBe("USA");
        expect(preview.replies[0]?.available).toBe(true);
        expect(preview.replies[0]?.customs?.after).toBeLessThan(preview.replies[0].customs.before);
    });
});
