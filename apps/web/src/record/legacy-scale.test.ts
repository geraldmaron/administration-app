import { describe, expect, it } from "vitest";
import { selectDateOfTurn } from "@admin/engine";
import { legacyReading } from "@admin/player-core";
import { openingHarnessCampaign } from "../map/harness/fixture";
import { legacyDomain, legacyPosition } from "./legacy-scale";

describe("signed legacy rates", () => {
  it("preserves actual negative inflation samples from a completed campaign", () => {
    const base = openingHarnessCampaign();
    const campaign = { ...base, turn: 2, calendar: selectDateOfTurn(base, 2), termClock: { ...base.termClock, outcome: "term-limited" as const }, economyHistory: [
      { turn: 1, growth: 0.02, inflation: 0.02, unemployment: 0.05, costOfLiving: 1 },
      { turn: 2, growth: -0.01, inflation: -0.03, unemployment: 0.06, costOfLiving: 0.97 },
    ] };
    const values = legacyReading(campaign)!.inflation.map((point) => point.value);
    expect(values).toEqual([2, -3]);
    const domain = legacyDomain(values);
    expect(domain[0]).toBeLessThan(-3);
    expect(domain[1]).toBeGreaterThan(2);
    expect(legacyPosition(-3, domain)).toBeGreaterThan(0);
    expect(legacyPosition(-3, domain)).toBeLessThan(legacyPosition(0, domain));
    expect(legacyPosition(0, domain)).toBeLessThan(legacyPosition(2, domain));
  });
  it("supports entirely negative rates and retains a fixed approval scale", () => {
    expect(legacyDomain([-4, -2])[0]).toBeLessThan(-4);
    expect(legacyPosition(-4, legacyDomain([-4, -2]))).not.toBe(legacyPosition(-2, legacyDomain([-4, -2])));
    expect(legacyDomain([58, 61], true)).toEqual([0, 100]);
  });
});
