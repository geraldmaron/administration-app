import { describe, expect, it } from "vitest";
import { apply } from "./effects.js";
import { foundedForBalance } from "./balance-harness.js";
import { projectGovernorWillingness } from "./governors.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { GUARD_SUPPORT_COORDINATION_USD_MILLIONS, guardAskFor, guardEligibleCondition, guardRequestAnsweredFlag, requestGuardFederalization, } from "./guard-federalization.js";
const FOUNDED = foundedForBalance("guard-federalization").campaign;
const streams = createRngStreams(makeCampaignSeed("guard-federalization"));
/** A live, federally-deployable flood in Ohio, injected without touching condition-onset.ts. */
function withFlood(campaign, severity) {
    const condition = {
        id: "condition:flood:USA:1",
        nation: campaign.founding.nation,
        kind: "flood",
        scope: "region",
        severity,
        startedTurn: campaign.turn,
        status: "active",
        beats: [],
        state: "OH",
    };
    return { ...campaign, conditions: { ...campaign.conditions, [condition.id]: condition } };
}
describe("a governor's request for federal help (the President's ask, POL-26's model in the other direction)", () => {
    it("finds no eligible condition on a quiet state", () => {
        expect(guardEligibleCondition(FOUNDED, "OH")).toBeUndefined();
        const result = requestGuardFederalization(FOUNDED, "OH", streams);
        expect(result).toEqual({ ok: false, reason: "No emergency in this state calls for it right now." });
    });
    it("projects the forecast off the same terms the decision weighs, with no draw", () => {
        const campaign = withFlood(FOUNDED, 0.8);
        const condition = guardEligibleCondition(campaign, "OH");
        if (!condition)
            throw new Error("expected an eligible condition");
        expect(condition.id).toBe("condition:flood:USA:1");
        const projection = projectGovernorWillingness(campaign, "OH", guardAskFor(condition));
        expect(projection.question).toBe("governor-consent");
        expect(["likely", "unlikely", "close"]).toContain(projection.forecast);
    });
    it("carries the governor's own stamped reason, whichever way it goes", () => {
        const campaign = withFlood(FOUNDED, 0.9);
        const result = requestGuardFederalization(campaign, "OH", streams);
        if (!result.ok)
            throw new Error("expected an eligible condition");
        const applied = apply(campaign, result.packet);
        const causal = applied.ledger.at(-1).causal;
        expect(causal.decision.question).toBe("governor-consent");
        expect(causal.decision.acts).toBe(result.consents);
    });
    it("spends treasury and lifts stability only on a yes; either way it marks the state answered", () => {
        const campaign = withFlood(FOUNDED, 1);
        const result = requestGuardFederalization(campaign, "OH", streams);
        if (!result.ok)
            throw new Error("expected an eligible condition");
        const metricEffect = result.packet.effects.find((effect) => effect.kind === "metric");
        if (result.consents) {
            expect(metricEffect).toBeDefined();
            expect(metricEffect.deltas.treasury).toBeLessThan(0);
        }
        else {
            expect(metricEffect).toBeUndefined();
        }
        const flagEffect = result.packet.effects.find((effect) => effect.kind === "flag");
        expect(flagEffect?.set).toContain(guardRequestAnsweredFlag("OH", "condition:flood:USA:1"));
    });
    it("books ten USD millions for consent without claiming a force deployment", () => {
        const flooded = withFlood(FOUNDED, 1);
        const state = flooded.states.OH;
        if (!state?.governor)
            throw new Error("expected the seeded Ohio governor");
        const campaign = { ...flooded, states: { ...flooded.states, OH: { ...state, lean: 0, governor: { ...state.governor, disposition: 1, party: flooded.congress.caucusAnchor } } } };
        const result = requestGuardFederalization(campaign, "OH", createRngStreams(campaign.seed));
        if (!result.ok || !result.consents)
            throw new Error("expected the supportive governor to consent");
        const metric = result.packet.effects.find((effect) => effect.kind === "metric");
        expect(metric?.kind === "metric" ? metric.deltas.treasury : undefined).toBe(-10);
        expect(GUARD_SUPPORT_COORDINATION_USD_MILLIONS).toBe(10);
        const applied = apply(campaign, result.packet);
        expect(applied.security).toEqual(campaign.security);
        expect(result.packet.effects.every((effect) => effect.kind === "metric" || effect.kind === "flag")).toBe(true);
    });
    it("does not ask the same state about the same emergency twice inside the cooldown", () => {
        const campaign = withFlood(FOUNDED, 0.7);
        const first = requestGuardFederalization(campaign, "OH", streams);
        if (!first.ok)
            throw new Error("expected an eligible condition");
        const applied = apply(campaign, first.packet);
        expect(guardEligibleCondition(applied, "OH")).toBeUndefined();
        expect(requestGuardFederalization(applied, "OH", streams)).toEqual({
            ok: false,
            reason: "No emergency in this state calls for it right now.",
        });
    });
});
