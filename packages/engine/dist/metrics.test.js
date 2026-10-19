import { describe, it, expect } from "vitest";
import { buildCampaign, relationship } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { selectApprovalMoves, treasuryHealth, TREASURY_REFERENCE } from "./metrics.js";
import { selectApproval } from "./opinion.js";
describe("treasuryHealth", () => {
    it("saturates at 1 at and above the reference point", () => {
        expect(treasuryHealth(TREASURY_REFERENCE)).toBe(1);
        expect(treasuryHealth(TREASURY_REFERENCE * 2)).toBe(1);
        expect(treasuryHealth(0)).toBe(0);
    });
    it("clamps a debt to 0 rather than reporting negative health", () => {
        expect(treasuryHealth(-1_000_000)).toBe(0);
    });
    it("opens a founding campaign off the floor and off the ceiling", () => {
        // The calibration is load-bearing: a reference well below the founding
        // reserve pins health at 1 on turn one and makes every treasury movement in
        // the game invisible to the `services` judgment. See TREASURY_REFERENCE.
        const health = treasuryHealth(buildCampaign().player.metrics.treasury);
        expect(health).toBeGreaterThan(0);
        expect(health).toBeLessThan(1);
    });
});
describe("apply() settles approval from the public, never from an effect", () => {
    it("recomputes the headline away when an effect tries to set it directly", () => {
        // A score an effect can set is a score nothing has to explain. The public
        // is the only writer, so a metric effect naming `approval` is inert.
        const state = buildCampaign();
        const next = apply(state, {
            source: "action",
            actor: "player",
            turn: state.turn + 1,
            narration: { summary: "The administration declares itself popular" },
            // @ts-expect-error approval is not a metric an effect may write; the
            // runtime path is still proven inert for a packet that arrives untyped.
            effects: [{ kind: "metric", deltas: { approval: 0.5 } }],
        });
        expect(next.player.metrics.approval).toBe(state.player.metrics.approval);
    });
    it("moves the headline when a judgment the public actually holds moves", () => {
        const state = buildCampaign();
        const next = apply(state, {
            source: "action",
            actor: "player",
            turn: state.turn + 1,
            narration: { summary: "The border is quiet for the first time in a year" },
            effects: [{ kind: "opinion", deltas: { security: 0.2 } }],
        });
        expect(next.player.metrics.approval).toBeGreaterThan(state.player.metrics.approval);
        // The stored headline is the same figure the selector derives from the mood
        // it was settled against — one number, not two that can drift apart.
        expect(next.player.metrics.approval).toBeCloseTo(selectApproval(next), 6);
    });
    it("leaves the headline alone for an effect that touches no judgment", () => {
        const state = buildCampaign();
        const next = apply(state, {
            source: "conversation",
            actor: "player",
            turn: state.turn + 1,
            narration: { summary: "A minor treaty is signed" },
            effects: [{ kind: "relationship", from: relationship.from, to: relationship.to, addTreaty: "TRT-2" }],
        });
        expect(next.player.metrics.approval).toBe(state.player.metrics.approval);
    });
});
describe("selectApprovalMoves", () => {
    it("surfaces only ledger entries where approval actually moved, with in-fiction narration", () => {
        const state = buildCampaign();
        const afterMove = apply(state, {
            source: "action",
            actor: "player",
            turn: state.turn + 1,
            narration: { summary: "Your handling of the border dispute reassures the country" },
            effects: [{ kind: "opinion", deltas: { security: 0.2 } }],
        });
        const afterUnrelatedTreaty = apply(afterMove, {
            source: "conversation",
            actor: "player",
            turn: afterMove.turn + 1,
            narration: { summary: "A trade protocol is signed" },
            effects: [{ kind: "relationship", from: relationship.from, to: relationship.to, addTreaty: "TRT-3" }],
        });
        const moves = selectApprovalMoves(afterUnrelatedTreaty);
        expect(moves).toHaveLength(1);
        expect(moves[0].description).toBe("Your handling of the border dispute reassures the country");
        expect(moves[0].approvalDelta).toBeCloseTo(afterMove.player.metrics.approval - state.player.metrics.approval, 6);
    });
    it("respects the sinceTurn filter", () => {
        const state = buildCampaign();
        const next = apply(state, {
            source: "action",
            actor: "player",
            turn: state.turn + 1,
            narration: { summary: "The country feels better served after the drills" },
            effects: [{ kind: "opinion", deltas: { services: 0.1 } }],
        });
        expect(selectApprovalMoves(next, next.turn + 100)).toEqual([]);
    });
});
