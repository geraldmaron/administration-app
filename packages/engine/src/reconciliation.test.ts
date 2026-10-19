import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { projectPassage } from "./bill-stages.js";
import { fiscalYearOf } from "./clock.js";
import { apply } from "./effects.js";
import { legislativeAct } from "./legislative-acts.js";
import { hasReconciliationInstruction, requestBudgetResolution } from "./reconciliation.js";
import { createSave, loadSave } from "./save.js";
import type { Bill, Campaign } from "./state.js";

const TAX = "act-tax-relief-and-growth";
const OTHER_TAX = "act-tax-fairness-and-revenue";

function pending(campaign: Campaign, actId = TAX): Campaign {
  const act = legislativeAct(actId)!;
  const bill: Bill = {
    id: `bill:${actId}:${campaign.turn}`, act: actId, title: act.title,
    sponsor: act.sponsor, introducedTurn: campaign.turn, status: "in-progress",
    stage: "markup", passage: projectPassage(campaign, act),
  };
  return { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
}

describe("congressional budget instructions", () => {
  it("keeps the tax bill on ordinary cloture until both chambers adopt a matching instruction", () => {
    const base = buildCampaign();
    const campaign = pending({ ...base, congress: { ...base.congress, disposition: 0.95 } });
    const act = legislativeAct(TAX)!;
    expect(projectPassage(campaign, act).find((vote) => vote.chamber === "senate")?.cloture).toBeDefined();
    const result = requestBudgetResolution(campaign, `bill:${TAX}:${campaign.turn}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.adopted).toBe(true);
    expect(result.record.votes).toHaveLength(2);
    const adopted = apply(campaign, result.packet);
    const billId = `bill:${TAX}:${campaign.turn}`;
    expect(hasReconciliationInstruction(adopted, act, billId)).toBe(true);
    expect(projectPassage(adopted, act, 0, billId).find((vote) => vote.chamber === "senate")?.cloture).toBeUndefined();
    expect(projectPassage(adopted, legislativeAct(OTHER_TAX)!).find((vote) => vote.chamber === "senate")?.cloture).toBeDefined();
    const reintroduced = `bill:${TAX}:${campaign.turn + 1}`;
    expect(hasReconciliationInstruction(adopted, act, reintroduced)).toBe(false);
    expect(projectPassage(adopted, act, 0, reintroduced).find((vote) => vote.chamber === "senate")?.cloture).toBeDefined();
    expect(requestBudgetResolution(adopted, `bill:${TAX}:${campaign.turn}`).ok).toBe(false);
    expect(adopted.bills[`bill:${TAX}:${campaign.turn}`]?.status).toBe("in-progress");
    expect(adopted.congress.budgetResolutions?.[0]?.fiscalYear).toBe(fiscalYearOf(campaign.calendar));
    const restored = loadSave(JSON.parse(JSON.stringify(createSave(adopted))));
    expect(restored.congress.budgetResolutions).toEqual(adopted.congress.budgetResolutions);
  });

  it("records a failed chamber vote without granting the expedited route", () => {
    const base = buildCampaign();
    const campaign = pending({ ...base, congress: { ...base.congress, disposition: 0.05 } });
    const result = requestBudgetResolution(campaign, `bill:${TAX}:${campaign.turn}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.adopted).toBe(false);
    const rejected = apply(campaign, result.packet);
    expect(hasReconciliationInstruction(rejected, legislativeAct(TAX)!, `bill:${TAX}:${campaign.turn}`)).toBe(false);
    expect(requestBudgetResolution(rejected, `bill:${TAX}:${campaign.turn}`).ok).toBe(false);
  });

  it("refuses an ineligible bill and expires an adopted instruction with the fiscal year", () => {
    const base = buildCampaign();
    const campaign = pending({ ...base, congress: { ...base.congress, disposition: 0.95 } });
    const result = requestBudgetResolution(campaign, `bill:${TAX}:${campaign.turn}`);
    if (!result.ok) throw new Error(result.reason);
    const adopted = apply(campaign, result.packet);
    const nextYear = { ...adopted, calendar: { ...adopted.calendar, year: adopted.calendar.year + 1 } };
    expect(hasReconciliationInstruction(nextYear, legislativeAct(TAX)!, `bill:${TAX}:${campaign.turn}`)).toBe(false);
    const mixed = pending(campaign, "act-debt-limit-deal");
    expect(requestBudgetResolution(mixed, `bill:act-debt-limit-deal:${campaign.turn}`).ok).toBe(false);
  });
});
