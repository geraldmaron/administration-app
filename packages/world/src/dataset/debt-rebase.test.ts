import { describe, expect, it } from "vitest";
import { applyDebtRebase, type DebtRebaseRow } from "./debt-rebase.js";

// The override table sets a nation's stock to its sourced ratio on the same
// identity the ratio is read back through, and touches nobody without a row.

const nations = [
  { id: "AAA", stats: { economy: { gdp: 1000, debt: 100, costOfLiving: 1.2 } } },
  { id: "BBB", stats: { economy: { gdp: 500, debt: 400 } } },
] as const;

describe("the debt rebase", () => {
  it("is the identity with no rows", () => {
    expect(applyDebtRebase(nations, [])).toBe(nations);
  });

  it("sets a listed stock to ratio × output × price level and leaves the rest", () => {
    const table: DebtRebaseRow[] = [{ nation: "AAA", ratio: 0.9, source: "a test", opened: "2026-09-28" }];
    const [rebased, untouched] = applyDebtRebase(nations, table);
    expect(rebased!.stats.economy.debt).toBe(Math.round(0.9 * 1000 * 1.2));
    expect(untouched).toBe(nations[1]);
  });
});
