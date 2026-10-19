import { describe, expect, it } from "vitest";
import { Relationship } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { requireAtLeast } from "./instrument-gates.js";
import { projectAction } from "./resolution.js";
import { projectSuccessEffects } from "./success-effects.js";
import { counterpartTrustFloor, counterpartWillingness } from "./treaty-counterpart.js";
import { createRngStreams } from "./rng.js";
import { relationshipKey } from "./state.js";
// The readings a screen needs to set options side by side and to say what a
// locked one waits on: a refused trust gate's floor, a rung's success effects
// before it is taken, and where a counterpart's trust would have to stand to sign.
const USA = "USA";
const ALP = "ALP";
function paired(trust) {
    const edge = (from, to) => Relationship.parse({ from, to, trust, alignment: 0.1, tension: 0.1, tradeDependence: 0.3, militaryThreat: 0.1, treaties: [], grudges: [], history: [] });
    return { ...buildCampaign(), relationships: { [relationshipKey(USA, ALP)]: edge(USA, ALP), [relationshipKey(ALP, USA)]: edge(ALP, USA) } };
}
const request = (rung) => ({ actor: USA, target: ALP, instrument: "assistance", rung });
describe("gate readings", () => {
    it("carries the floor and the reading only where a gate names one", () => {
        expect(requireAtLeast(0.1, 0.15, "enough trust", "trust")).toEqual({ ok: false, missingCapability: "enough trust", shortfall: { reading: "trust", have: 0.1, need: 0.15 } });
        expect(requireAtLeast(10, 150, "reserves")).toEqual({ ok: false, missingCapability: "reserves" });
        expect(requireAtLeast(0.2, 0.15, "enough trust", "trust")).toEqual({ ok: true });
    });
    it("returns a refused trust gate's floor on the projection", () => {
        const campaign = paired(0.05);
        const projected = projectAction(campaign, request(4), createRngStreams(campaign.seed));
        expect(projected.ok).toBe(false);
        if (projected.ok)
            return;
        expect(projected.shortfall).toEqual({ reading: "trust", have: 0.05, need: 0.15 });
    });
    it("reads a rung's success effects without the gate, and the same resolve the commit runs", () => {
        const locked = paired(0.05);
        const effects = projectSuccessEffects(locked, request(4), createRngStreams(locked.seed));
        const toward = effects?.find((effect) => effect.kind === "relationship" && effect.from === ALP && effect.to === USA);
        expect(toward?.kind === "relationship" ? toward.deltas?.trust : undefined).toBeGreaterThan(0);
        const again = projectSuccessEffects(locked, request(4), createRngStreams(locked.seed));
        expect(again).toEqual(effects);
    });
    it("says where their trust would have to stand for the counterpart's weighing to clear", () => {
        const campaign = paired(-0.3);
        const floor = counterpartTrustFloor(campaign, ALP, "executive-agreement");
        expect(floor).toBeDefined();
        const edgeBack = { ...campaign.relationships[relationshipKey(ALP, USA)], trust: floor + 0.001 };
        const lifted = { ...campaign, relationships: { ...campaign.relationships, [relationshipKey(ALP, USA)]: edgeBack } };
        expect(counterpartWillingness(lifted, ALP, "executive-agreement").margin).toBeGreaterThanOrEqual(-0.001);
        expect(counterpartWillingness(campaign, ALP, "executive-agreement").margin).toBeLessThan(counterpartWillingness(lifted, ALP, "executive-agreement").margin);
    });
});
