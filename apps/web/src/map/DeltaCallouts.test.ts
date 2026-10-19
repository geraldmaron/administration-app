import { describe, expect, it } from "vitest";
import { largestMoves } from "./DeltaCallouts";

describe("delta callouts", () => {
  it("names the largest moves either way, skipping what nobody would notice", () => {
    const before = { OH: 0.5, TX: 0.4, CA: 0.6, VT: 0.7, WY: 0.3 };
    const after = { OH: 0.52, TX: 0.37, CA: 0.6005, VT: 0.701, WY: 0.3 };
    expect(largestMoves(before, after)).toEqual([
      { id: "TX", delta: expect.closeTo(-0.03, 6) },
      { id: "OH", delta: expect.closeTo(0.02, 6) },
      { id: "VT", delta: expect.closeTo(0.001, 6) },
    ]);
  });
});
