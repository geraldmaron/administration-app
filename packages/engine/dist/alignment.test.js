import { describe, it, expect } from "vitest";
import { buildCampaign, nationA } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { alignmentAffinity, factionApproval, npcTrustAffinity, removalPressureFromAlignment } from "./alignment.js";
function nudge(state, turn, pull, summary) {
    return apply(state, { source: "action", actor: "player", turn, narration: { summary }, effects: [{ kind: "alignment", pull }] });
}
describe("accumulateAlignment", () => {
    it("accumulates across decisions rather than overwriting on the last one", () => {
        let state = buildCampaign();
        state = nudge(state, 1, { authLibertarian: 0.1 }, "Cracks down on dissent");
        state = nudge(state, 2, { authLibertarian: 0.1 }, "Cracks down again");
        state = nudge(state, 3, { authLibertarian: 0.1 }, "And again");
        expect(state.player.alignments.authLibertarian).toBeCloseTo(0.3);
    });
    it("clamps each axis to [-1, 1]", () => {
        let state = buildCampaign();
        for (let i = 0; i < 20; i++)
            state = nudge(state, i, { nationalistGlobalist: 0.2 }, "Unilateral move");
        expect(state.player.alignments.nationalistGlobalist).toBe(1);
    });
});
describe("alignmentAffinity", () => {
    it("is 1 for an identical stance and -1 for a maximally opposed one", () => {
        const alignment = { economicLeftRight: 0, authLibertarian: 1, nationalistGlobalist: 0 };
        expect(alignmentAffinity(alignment, { authLibertarian: 1 })).toBeCloseTo(1);
        expect(alignmentAffinity(alignment, { authLibertarian: -1 })).toBeCloseTo(-1);
    });
    it("is 0 when the stance shares no axis with the query", () => {
        const alignment = { economicLeftRight: 0.5, authLibertarian: -0.5, nationalistGlobalist: 0.2 };
        expect(alignmentAffinity(alignment, {})).toBe(0);
    });
});
describe("two players with identical metrics but opposite alignments face a measurably different game", () => {
    it("differs in NPC trust affinity, faction approval, and removal pressure", () => {
        const base = buildCampaign();
        let coercive = base;
        let multilateral = base;
        for (let turn = 1; turn <= 5; turn++) {
            coercive = nudge(coercive, turn, { authLibertarian: 0.15, nationalistGlobalist: 0.15 }, "Chooses coercion");
            multilateral = nudge(multilateral, turn, { authLibertarian: -0.15, nationalistGlobalist: -0.15 }, "Builds a coalition");
        }
        // Same metrics either way — only alignment history differs.
        expect(coercive.player.metrics).toEqual(base.player.metrics);
        expect(multilateral.player.metrics).toEqual(base.player.metrics);
        const nation = coercive.nations[nationA.id];
        const coerciveTrust = npcTrustAffinity(coercive.player.alignments, nation);
        const multilateralTrust = npcTrustAffinity(multilateral.player.alignments, nation);
        expect(Math.abs(coerciveTrust - multilateralTrust)).toBeGreaterThan(0.3);
        const internationalistFactionStance = { authLibertarian: -0.8, nationalistGlobalist: -0.8 };
        const coerciveApproval = factionApproval(coercive.player.alignments, internationalistFactionStance);
        const multilateralApproval = factionApproval(multilateral.player.alignments, internationalistFactionStance);
        expect(multilateralApproval).toBeGreaterThan(coerciveApproval);
        const charterExpectedAlignment = { authLibertarian: -0.5, nationalistGlobalist: -0.5 };
        const coercivePressure = removalPressureFromAlignment(coercive.player.alignments, charterExpectedAlignment);
        const multilateralPressure = removalPressureFromAlignment(multilateral.player.alignments, charterExpectedAlignment);
        expect(coercivePressure).toBeGreaterThan(multilateralPressure);
        // The fourth consequence — that alignment changes which content reaches
        // the desk — is proven in packages/content's scenario-eligibility.test.ts
        // against `selectScenario`. The engine cannot prove it: it must not import
        // @admin/content, and it owns none of the selection.
    });
});
