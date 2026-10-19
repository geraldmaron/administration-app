import { describe, expect, it } from "vitest";
import { TRUST_STANCE_CUTS, stanceForTrust } from "@admin/player-core";
import { TRUST_BAND_AXIS_TICKS, bandWordAt, trustOnBandAxis } from "./trust-axis";

describe("trust band axis", () => {
  it("puts each cut on a quarter and the ends on 0 and 1", () => {
    expect(trustOnBandAxis(-1)).toBeCloseTo(0);
    expect(trustOnBandAxis(TRUST_STANCE_CUTS.caution)).toBeCloseTo(0.25);
    expect(trustOnBandAxis(TRUST_STANCE_CUTS.neutral)).toBeCloseTo(0.5);
    expect(trustOnBandAxis(TRUST_STANCE_CUTS.favorable)).toBeCloseTo(0.75);
    expect(trustOnBandAxis(1)).toBeCloseTo(1);
  });

  it("names the band a value is drawn in by the same function the rest of the player uses", () => {
    for (let trust = -1; trust <= 1; trust += 0.05) {
      const word = bandWordAt(trustOnBandAxis(trust));
      expect(word).toBe(bandWordAt((["adverse", "caution", "neutral", "favorable"] as const).indexOf(stanceForTrust(trust)) / 4 + 0.125));
    }
  });

  it("ticks once in the middle of each band", () => {
    expect(TRUST_BAND_AXIS_TICKS).toEqual([0.125, 0.375, 0.625, 0.875]);
  });
});
