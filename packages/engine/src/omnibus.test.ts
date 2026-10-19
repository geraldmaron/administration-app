import { describe, expect, it } from "vitest";
import { projectAppropriation } from "./appropriation.js";
import { foundedForBalance } from "./balance-harness.js";
import { projectBudgetDraft } from "./budget-draft.js";
import { selectBudget } from "./budget.js";
import { apply } from "./effects.js";
import { projectOmnibus, requestOmnibus } from "./omnibus.js";

const { campaign: FOUNDED } = foundedForBalance("omnibus");

function reallocation() {
  const standing = selectBudget(FOUNDED);
  const draft = projectBudgetDraft(FOUNDED, { military: standing.military - 0.002, domestic: standing.domestic + 0.002 });
  if (!draft.ok) throw new Error(draft.reason);
  return draft.candidate;
}

describe("a full-year book both sides wrote", () => {
  it("clears the sixty the President's own lines do not", () => {
    const candidate = reallocation();
    expect(projectAppropriation(FOUNDED, candidate).wouldPass).toBe(false);
    expect(projectOmnibus(FOUNDED, candidate).carries).toBe(true);
  });

  it("gives half of every change away, funds the year and costs standing", () => {
    const candidate = reallocation();
    const standing = selectBudget(FOUNDED);
    const result = requestOmnibus(FOUNDED, candidate);
    if (!result.ok) throw new Error(result.reason);
    const after = apply(FOUNDED, result.packet);
    expect(selectBudget(after).domestic - standing.domestic).toBeCloseTo(0.001, 6);
    expect(after.congress.appropriation.onPriorYear).toBe(false);
    expect(after.congress.appropriation.throughTurn).toBeGreaterThanOrEqual(FOUNDED.congress.appropriation.throughTurn);
    expect(after.player.metrics.standing).toBeLessThan(FOUNDED.player.metrics.standing);
  });

  it("is refused, and leaves the stopgap, when the President's side holds too few seats to carry it", () => {
    const senate = FOUNDED.congress.chambers.senate;
    const rout = { ...senate, administration: 10, opposition: senate.seats - 10 - senate.independent };
    const outnumbered = { ...FOUNDED, congress: { ...FOUNDED.congress, chambers: { ...FOUNDED.congress.chambers, senate: rout } } };
    expect(requestOmnibus(outnumbered, reallocation()).ok).toBe(false);
  });
});
