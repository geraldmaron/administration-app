import { describe, expect, it } from "vitest";
import { ARREARS_STABILITY_COST, POLICY_TURN_SHARE, authorityCeiling, selectBudget, selectBudgetOutlook, selectSolvency, weeklyApportionment, type BudgetAllocation } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { authorityFlow, capabilityHorizons, fundedThroughIfCarried, laddersOpen } from "./draft-consequence";

const base = openingCampaign();
const standing = selectBudget(base);
const raised = (account: keyof BudgetAllocation, by: number): BudgetAllocation => ({ ...standing, [account]: Math.round((standing[account] + by) * 10_000) / 10_000 });

describe("the budget authority a draft draws", () => {
  it("reads the budget in force as the week's release less what the accounts and commitments draw", () => {
    const flow = authorityFlow(base);
    const solvency = selectSolvency(base);
    expect(flow.held).toBe(base.player.metrics.treasury);
    expect(flow.release).toBe(weeklyApportionment(base));
    expect(flow.accountsDraw).toBe(solvency.appropriationCost);
    expect(flow.net).toBe(flow.release - solvency.weeklyDraw);
    expect(flow.lapsed).toBe(false);
    expect(flow.atCeiling).toBe(base.player.metrics.treasury >= authorityCeiling(base));
  });

  it("draws more and carries fewer weeks when an account is raised above its line", () => {
    const now = authorityFlow(base);
    const draft = authorityFlow(base, raised("military", 0.01));
    expect(draft.accountsDraw).toBeGreaterThan(now.accountsDraw);
    expect(draft.net).toBeLessThan(now.net);
    expect(draft.annualClaim).toBeGreaterThan(now.annualClaim);
    expect(draft.turnsFunded).toBeLessThanOrEqual(now.turnsFunded);
  });

  it("prices an unpaid week the way the budget phase prices arrears, on the week's own shortfall", () => {
    const draft = { ...raised("covert", 0.03), military: raised("military", 0.02).military, diplomatic: raised("diplomatic", 0.01).diplomatic };
    const flow = authorityFlow(base, draft);
    const gdp = selectBudgetOutlook(base, draft).gdp;
    const unpaid = Math.min(flow.accountsDraw, Math.max(0, -flow.net));
    const expected = Math.round(((unpaid / POLICY_TURN_SHARE) / gdp) * ARREARS_STABILITY_COST * 1000) / 1000;
    expect(flow.net).toBeLessThan(0);
    expect(flow.arrearsPerWeek).toBe(expected);
    expect(flow.arrearsPerWeek).toBeGreaterThan(0);
  });

  it("owes nothing while the week's release covers the draw", () => {
    const flow = authorityFlow(base, raised("covert", 0.0005));
    expect(flow.net).toBeGreaterThanOrEqual(0);
    expect(flow.arrearsPerWeek).toBe(0);
  });

  it("owes no arrears on a cut, which is money no longer spent", () => {
    const cut = authorityFlow(base, { ...standing, domestic: 0 });
    expect(cut.accountsDraw).toBeLessThan(0);
    expect(cut.arrearsPerWeek).toBe(0);
  });
});

describe("what the draft buys on the ladders", () => {
  it("brings a rung closer when the account that buys it is raised", () => {
    const rows = capabilityHorizons(base, raised("covert", 0.01));
    const covert = rows.find((row) => row.account === "covert");
    if (!covert) {
      expect(laddersOpen(base)).toContain("covert");
      return;
    }
    expect(covert.draftTurns).toBeDefined();
    if (covert.nowTurns !== undefined) expect(covert.draftTurns!).toBeLessThan(covert.nowTurns);
    expect(covert.current).toBeLessThan(covert.required);
  });

  it("gives every ladder account either a row or a place among the open ladders", () => {
    const rows = capabilityHorizons(base, standing).map((row) => row.account);
    const open = laddersOpen(base);
    for (const account of ["diplomatic", "covert", "military"] as const) expect(rows.includes(account) !== open.includes(account)).toBe(true);
  });
});

describe("where the money runs to if the book carries", () => {
  it("never moves the date back", () => {
    const funded = fundedThroughIfCarried(base);
    expect(funded.turn).toBeGreaterThanOrEqual(base.congress.appropriation.throughTurn);
    expect(funded.date).toMatch(/\d{4}/);
  });
});

describe("the date funding runs through", () => {
  it("names the fiscal year's statutory last day, not the first day of the week that holds it", () => {
    const campaign = openingCampaign();
    const carried = fundedThroughIfCarried(campaign);
    expect(carried.date).toMatch(/^September 30, \d{4}$/);
  });
});
