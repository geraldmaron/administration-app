import { describe, expect, it } from "vitest";
import { executiveOrder } from "@admin/engine";
import { reversedEffects, unreversedCost } from "./case-effects";
const priceControls = executiveOrder("order-price-controls");
describe("reversedEffects", () => {
    it("lists every nonzero country effect the order carries", () => {
        const effects = reversedEffects(priceControls.nationEffects);
        expect(effects.length).toBe(Object.keys(priceControls.nationEffects).length);
        expect(effects.map((effect) => effect.label)).not.toContain("");
    });
    it("reads nothing off an order with no nation effects", () => {
        expect(reversedEffects({})).toHaveLength(0);
    });
});
describe("unreversedCost", () => {
    it("states the treasury share an order already spent, which a strike-down does not claw back", () => {
        const cost = unreversedCost(priceControls);
        expect(cost).toBeDefined();
        expect(cost).toContain("%");
        expect(cost).toContain("not what it already cost");
    });
    it("says nothing for an order that spent no treasury share", () => {
        expect(unreversedCost({ ...priceControls, treasuryOfGdp: undefined })).toBeUndefined();
        expect(unreversedCost({ ...priceControls, treasuryOfGdp: 0 })).toBeUndefined();
    });
});
