import { describe, it, expect } from "vitest";
import { loadAverageLine } from "./measure-performance.js";

// A gate once compared a run's p50 against a baseline taken under a
// wildly different system load and read the result as a speedup. Nothing in
// the report said the two runs weren't taken under comparable conditions —
// this is the line that would have. The expected strings below are composed
// by hand from the inputs, not by re-deriving the implementation's formula,
// so a reformulation that changes the arithmetic still fails this test.
describe("loadAverageLine", () => {
  it("states start, end and per-core load exactly as measured", () => {
    expect(loadAverageLine(4.5, 3.9, 12)).toBe(
      "load average: 4.50 -> 3.90 across 12 cores (0.38 -> 0.33 per core) — only compare turn-time " +
        "figures against another run measured at a similar load; rerun both interleaved before quoting a delta",
    );
  });

  // The pair that was misread: a base run at load 11.07 read against a later
  // run at load 4.5 -> 3.9, on an 18-core machine.
  it("would have flagged the two runs as measured under different load", () => {
    const base = loadAverageLine(11.07, 11.07, 18);
    const w3 = loadAverageLine(4.5, 3.9, 18);
    expect(base).not.toBe(w3);
    expect(base).toContain("11.07 -> 11.07");
    expect(w3).toContain("4.50 -> 3.90");
  });

  it("divides by zero cores without throwing or producing NaN", () => {
    expect(loadAverageLine(1, 1, 0)).toBe(
      "load average: 1.00 -> 1.00 across 0 cores (0.00 -> 0.00 per core) — only compare turn-time " +
        "figures against another run measured at a similar load; rerun both interleaved before quoting a delta",
    );
  });
});
