import { describe, expect, it } from "vitest";
import { voteBudget } from "./balance-budget.js";
import { foundedForBalance } from "./balance-harness.js";
import { PROXY_PROFILES } from "./balance-proxies.js";
import type { Campaign } from "./state.js";

// Not a balance run: the rule for when a proxy sends its budget up, checked on
// one founded campaign, so the harness's budget half has a test of its own.

const { campaign: FOUNDED } = foundedForBalance("balance-budget");
const at = (turn: number): Campaign => ({ ...FOUNDED, turn });
const lead = FOUNDED.congress.appropriation.throughTurn - 13;

describe("the budget a proxy sends up", () => {
  it("goes up from a careful proxy a quarter before the book runs out, and is counted", () => {
    const voted = voteBudget(at(lead), PROXY_PROFILES.prudent!);
    expect(voted).not.toBe(at(lead));
    const book = voted.congress.appropriation;
    expect(book.onPriorYear || book.throughTurn > FOUNDED.congress.appropriation.throughTurn).toBe(true);
  });

  it("waits for a deadline, and never comes from a proxy that does not govern through the regular order", () => {
    expect(voteBudget(at(lead - 1), PROXY_PROFILES.prudent!)).toEqual(at(lead - 1));
    expect(voteBudget(at(lead), PROXY_PROFILES.passive!)).toEqual(at(lead));
    expect(voteBudget(at(lead), PROXY_PROFILES.reckless!)).toEqual(at(lead));
  });
});
