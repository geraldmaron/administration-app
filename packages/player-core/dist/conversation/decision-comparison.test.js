import { describe, expect, it } from "vitest";
import { createRngStreams, openConversation, projectAction } from "@admin/engine";
import { formatMoney } from "../format/money";
import { openingCampaign } from "../__fixtures__/opening";
import { pendingConversations } from "./scripts";
import { decisionComparison } from "./decision-comparison";
const campaign = openingCampaign();
const decision = pendingConversations(campaign)[0];
const thread = openConversation(campaign, decision.script, createRngStreams(campaign.seed));
describe("decisionComparison", () => {
    const comparison = decisionComparison(campaign, decision.script, thread.replies, "Canada");
    it("lines up every reply on every row, so no option is silent on a criterion", () => {
        expect(comparison.options.map((o) => o.id)).toEqual(thread.replies.map((r) => r.option.id));
        for (const row of comparison.rows)
            expect(row.cells).toHaveLength(thread.replies.length);
    });
    it("always carries the cost, the odds, the timing, the downside, the reaction and the adviser", () => {
        const ids = comparison.rows.map((row) => row.id);
        for (const id of ["cost", "odds", "timing", "downside", "reaction", "counsel"])
            expect(ids).toContain(id);
    });
    it("gives every metric any reply moves its own row, banded the way the engine bands it", () => {
        const moved = new Set(thread.replies.flatMap((reply) => [
            ...Object.entries(reply.assessment?.spent ?? reply.cost).filter(([k, v]) => k !== "treasury" && v).map(([k]) => k),
            ...(reply.assessment?.assessed ?? []).map((impact) => impact.domain),
        ]));
        const effectRows = comparison.rows.filter((row) => row.topic === "effect").map((row) => row.id.replace("effect:", ""));
        expect(new Set(effectRows)).toEqual(moved);
    });
    it("reads a position's downside from its exposure and an instrument's from its risk branches", () => {
        const downside = comparison.rows.find((row) => row.id === "downside");
        thread.replies.forEach((reply, i) => {
            const expected = [...reply.risks.map((r) => r.description), ...(reply.exposure ?? []).map((e) => e.description)];
            const cell = downside.cells[i];
            if (expected.length === 0)
                expect(cell.kind).toBe("none");
            else
                expect(cell.kind === "lines" && expected.every((line) => cell.lines.includes(line))).toBe(true);
        });
    });
});
describe("decisionComparison on a locked reply", () => {
    it("names why it is locked and fills its cells with 'Not available' rather than a forecast", () => {
        const locked = { ...thread.replies[0], available: false, missingCapability: "Needs a seated Secretary of State" };
        const comparison = decisionComparison(campaign, decision.script, [locked, ...thread.replies.slice(1)], "Canada");
        expect(comparison.options[0]).toMatchObject({ available: false, locked: "Needs a seated Secretary of State" });
        for (const row of comparison.rows)
            expect(row.cells[0]).toEqual({ kind: "none", text: "Not available" });
    });
});
describe("decisionComparison on a position's relationship deltas", () => {
    it("adds a row for the counterpart's trust, favorable when it rises", () => {
        const base = thread.replies[0];
        const position = (trust) => ({
            ...base,
            available: true,
            option: { ...base.option, commitment: { kind: "position", cost: { standing: 0.01 }, remembered: "", relationship: { trust } } },
        });
        const comparison = decisionComparison(campaign, decision.script, [position(0.06), position(-0.05)], "Canada");
        const row = comparison.rows.find((r) => r.id === "relationship:trust");
        expect(row.label).toBe("Canada's trust");
        expect(row.cells[0]).toMatchObject({ kind: "impact", favorable: true });
        expect(row.cells[1]).toMatchObject({ kind: "impact", favorable: false });
    });
});
describe("decisionComparison on a force reply", () => {
    it("states how the cost was priced, with the same figure the cost row charges", () => {
        const projected = projectAction(campaign, { actor: campaign.founding.nation, target: "VEN", instrument: "military", rung: 4 }, createRngStreams(campaign.seed));
        expect(projected.ok).toBe(true);
        if (!projected.ok)
            return;
        const base = thread.replies[0];
        const strike = { ...base, available: true, cost: projected.projection.cost, costBasis: projected.projection.costBasis };
        const comparison = decisionComparison(campaign, decision.script, [strike, ...thread.replies.slice(1)], "Venezuela");
        const cost = comparison.rows.find((row) => row.id === "cost").cells[0];
        const basis = comparison.rows.find((row) => row.id === "cost-basis").cells;
        const charged = formatMoney(projected.projection.costBasis.upFront);
        expect(cost).toMatchObject({ kind: "money", text: `${charged} spent` });
        expect(basis[0].kind === "text" && basis[0].text).toContain(`${charged} now`);
        thread.replies.slice(1).forEach((reply, index) => {
            expect(basis[index + 1]).toEqual({ kind: "none", text: reply.available ? "No forces sent" : "Not available" });
        });
    });
    it("adds no basis row where no reply sends forces", () => {
        expect(decisionComparison(campaign, decision.script, thread.replies, "Canada").rows.some((row) => row.id === "cost-basis")).toBe(false);
    });
});
it("carries the real covert projection's independent exposure into the decision comparison", () => {
    // The watch takes a tone the borrowed first reply does not, so the pair stays a choice whatever the corpus deals.
    const tone = decision.script.options[0].tone === "firm" ? "coercive" : "firm";
    const script = { ...decision.script, counterpart: "CAN", options: [{
                id: "watch", tone, text: "Authorize a watch", commitment: { kind: "instrument", instrument: "covert", rung: 1 },
            }, decision.script.options[0]] };
    const offered = openConversation(campaign, script, createRngStreams(campaign.seed));
    const reply = offered.replies[0];
    expect(reply.successExposureChance).toBeDefined();
    const view = decisionComparison(campaign, script, offered.replies, "Canada");
    const downside = view.rows.find((row) => row.id === "downside").cells[0];
    expect(downside.kind === "lines" && downside.lines.some((line) => line.includes("Chance it comes out even if it works"))).toBe(true);
});
