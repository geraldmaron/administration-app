import { describe, expect, it } from "vitest";
import type { ScenarioReply } from "./scenario.js";
import { costAndImpactBothPriced } from "./scenario-audit-contract.js";

function positionReply(overrides: {
  readonly treasury?: number;
  readonly financialScale?: "none" | "discretionary" | "supplemental" | "emergency" | "structural";
}): ScenarioReply {
  return {
    id: "test-reply",
    tone: "firm",
    text: "A reply long enough to clear the schema's own floor for reply prose.",
    commitment: {
      kind: "position",
      cost: overrides.treasury !== undefined ? { treasury: overrides.treasury } : {},
      remembered: "What was decided, restated for the record the player reads back later.",
      rejoinder: { speaker: { kind: "narrator" as const }, text: "The room's own answer to what just happened, true on every branch of it." },
      ...(overrides.financialScale !== undefined
        ? { impact: { financial: { scale: overrides.financialScale }, agency: "our-doing" as const } }
        : {}),
    },
  };
}

describe("costAndImpactBothPriced", () => {
  it("does not flag a reply that only prices one book", () => {
    expect(costAndImpactBothPriced(positionReply({ treasury: -80 }))).toBe(false);
    expect(costAndImpactBothPriced(positionReply({ financialScale: "emergency" }))).toBe(false);
  });

  it("does not flag a light treasury line beside a heavy financial band — two real pots, not one restated", () => {
    expect(costAndImpactBothPriced(positionReply({ treasury: -10, financialScale: "structural" }))).toBe(false);
  });

  it("does not flag a heavy treasury line beside a small financial band", () => {
    expect(costAndImpactBothPriced(positionReply({ treasury: -80, financialScale: "discretionary" }))).toBe(false);
  });

  it("flags a heavy treasury line beside an emergency-or-larger band as worth a second read", () => {
    expect(costAndImpactBothPriced(positionReply({ treasury: -80, financialScale: "emergency" }))).toBe(true);
    expect(costAndImpactBothPriced(positionReply({ treasury: 80, financialScale: "structural" }))).toBe(true);
  });

  it("never flags a non-position commitment", () => {
    const instrument: ScenarioReply = {
      id: "test-instrument",
      tone: "firm",
      text: "An instrument reply long enough to clear the schema's own floor for reply prose.",
      commitment: { kind: "instrument", instrument: "military", rung: 3 },
    };
    expect(costAndImpactBothPriced(instrument)).toBe(false);
  });
});
