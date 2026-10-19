/**
 * A standoff uses reach the profile already has. An unknown stock does not fire.
 */
import { describe, expect, it } from "vitest";
import { proxyReach, standoffStrike } from "./standoff-strike.js";
import type { ForceProjectionProfile } from "./warfighting.js";

const quiet: ForceProjectionProfile = {
  adjacentConflict: 0,
  regionalProjection: 0,
  expeditionary: 0,
  globalReach: 0,
  nuclearDeterrent: false,
};

describe("standoff strike", () => {
  it("refuses a class whose stock was never stated", () => {
    const result = standoffStrike({ ...quiet, expeditionary: 0.4 }, null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("The stock is not known.");
  });

  it("calls an ocean reach expeditionary and a neighbor regional", () => {
    const far = standoffStrike({ ...quiet, globalReach: 0.2 }, 0.5);
    const near = standoffStrike({ ...quiet, regionalProjection: 0.4 }, 0.5);
    expect(far).toEqual({ ok: true, band: "expeditionary" });
    expect(near).toEqual({ ok: true, band: "regional" });
    expect(proxyReach({ ...quiet, regionalProjection: 0.4 })).toBe(true);
    expect(proxyReach({ ...quiet, regionalProjection: 0.4, expeditionary: 0.1 })).toBe(false);
  });
});
