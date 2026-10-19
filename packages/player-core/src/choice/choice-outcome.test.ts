import { describe, expect, it } from "vitest";
import { bandEffect, moneyCost, pointsEffect, worstCaseOf } from "./choice-outcome";

describe("the choice outcome", () => {
  it("calls no money free and keeps the figure where money is paid", () => {
    expect(moneyCost(0)).toEqual({ text: "Free" });
    const paid = moneyCost(-2500);
    expect(paid.figure).toMatchObject({ kind: "amount", value: -2500, unit: "USD millions", stance: "adverse" });
    expect(paid.text).toMatch(/^\$2\.50B$/);
  });

  it("weights a move that can land either way by its chance, in points", () => {
    const effect = pointsEffect("press", "Press corps", { well: 0.1, badly: -0.05, chance: 0.6 });
    expect(effect.ifWell).toBe(10);
    expect(effect.ifBadly).toBe(-5);
    expect(effect.value).toBeCloseTo(4, 5);
    expect(effect.tone).toBe("favorable");
  });

  it("treats a move with no chance as certain, with no range", () => {
    const effect = pointsEffect("standing", "Standing", { well: -0.02 });
    expect(effect).toMatchObject({ value: -2, tone: "adverse", text: "−2 pts" });
    expect(effect.ifBadly).toBeUndefined();
  });

  it("keeps a band a band", () => {
    const effect = bandEffect("effect:approval", "Approval", { domain: "approval", direction: "down", band: "moderate", horizon: "next-turn", confidence: "modeled" }, false);
    expect(effect).toMatchObject({ unit: "band", value: -2, text: "Moderate fall", tone: "adverse" });
  });

  it("says the worst case as the readings that fall", () => {
    const effects = [pointsEffect("press", "Press corps", { well: 0.1, badly: -0.1, chance: 0.5 }), pointsEffect("standing", "Standing", { well: 0.01, badly: -0.017, chance: 0.5 })];
    expect(worstCaseOf(effects)).toBe("Press corps −10, Standing −1.7");
    expect(worstCaseOf([pointsEffect("a", "A", { well: 0.01 })])).toBeUndefined();
  });
});
