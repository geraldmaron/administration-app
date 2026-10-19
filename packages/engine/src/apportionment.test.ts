import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { BUDGET_ACCOUNT_SPECS } from "./budget.js";
import {
  APPORTIONING_INSTITUTION,
  DOMESTIC_ADEQUACY_GAIN,
  FUNDED_BUDGET_ADEQUACY,
  apportionmentShare,
  domesticNetShare,
  settledBudgetAdequacy,
  settledFromNetShare,
} from "./funding.js";
import { institutionDef, deriveImplementationQuality } from "./institutions.js";
import type { Campaign } from "./state.js";

function withOmbQuality(campaign: Campaign, quality: number): Campaign {
  const omb = campaign.institutions[APPORTIONING_INSTITUTION]!;
  return {
    ...campaign,
    institutions: {
      ...campaign.institutions,
      [APPORTIONING_INSTITUTION]: { ...omb, implementationQuality: quality },
    },
  };
}

function withDomesticLine(campaign: Campaign, share: number): Campaign {
  return {
    ...campaign,
    player: { ...campaign.player, budget: { ...campaign.player.budget, domestic: share } },
  };
}

describe("the appropriation reaches an agency through OMB", () => {
  it("passes everything through when there is no budget office at all", () => {
    const campaign = buildCampaign();
    const { [APPORTIONING_INSTITUTION]: _absent, ...rest } = campaign.institutions;
    expect(apportionmentShare({ ...campaign, institutions: rest })).toBe(1);
  });

  it("loses more of a raise the worse the budget office is running", () => {
    const campaign = buildCampaign();
    const healthy = apportionmentShare(withOmbQuality(campaign, 1));
    const hollow = apportionmentShare(withOmbQuality(campaign, 0));
    expect(healthy).toBe(1);
    expect(hollow).toBe(0.5);
    expect(apportionmentShare(withOmbQuality(campaign, 0.6))).toBeGreaterThan(hollow);
    expect(apportionmentShare(withOmbQuality(campaign, 0.6))).toBeLessThan(healthy);
  });

  it("opens below a full pass-through, because the Director's chair opens empty", () => {
    const campaign = buildCampaign();
    const omb = campaign.institutions[APPORTIONING_INSTITUTION]!;
    expect(omb.vacancy).toBe(true);
    const quality = deriveImplementationQuality(omb, institutionDef(APPORTIONING_INSTITUTION)!);
    expect(quality).toBeLessThan(1);
    expect(apportionmentShare(campaign)).toBeLessThan(1);
    expect(apportionmentShare(campaign)).toBeGreaterThan(0.5);
  });

  it("discounts a raise and never a cut", () => {
    const raise = 0.005;
    expect(settledFromNetShare(raise, 0.5)).toBeLessThan(settledFromNetShare(raise, 1));
    expect(settledFromNetShare(raise, 1)).toBeCloseTo(
      FUNDED_BUDGET_ADEQUACY + raise * DOMESTIC_ADEQUACY_GAIN,
      3,
    );
    // A budget office cannot apportion money nobody voted, so a starved
    // establishment starves at the same rate however well it is run.
    const cut = -0.005;
    expect(settledFromNetShare(cut, 0.5)).toBe(settledFromNetShare(cut, 1));
  });

  it("changes nothing for an administration that leaves the line where it found it", () => {
    // The property the whole account rests on: doing nothing to the domestic
    // line costs nothing, so an apportionment discount cannot become an
    // ambient tax on a president who never touched the budget.
    const campaign = buildCampaign();
    expect(domesticNetShare(campaign)).toBe(0);
    expect(settledBudgetAdequacy(campaign)).toBe(FUNDED_BUDGET_ADEQUACY);
    expect(settledBudgetAdequacy(withOmbQuality(campaign, 0))).toBe(FUNDED_BUDGET_ADEQUACY);
  });

  it("banks more of the same appropriation for a president who staffed OMB", () => {
    const raised = withDomesticLine(
      buildCampaign(),
      BUDGET_ACCOUNT_SPECS.domestic.sustainAtFull * FUNDED_BUDGET_ADEQUACY + 0.004,
    );
    expect(domesticNetShare(raised)).toBeGreaterThan(0);
    const led = settledBudgetAdequacy(withOmbQuality(raised, 0.95));
    const hollow = settledBudgetAdequacy(withOmbQuality(raised, 0.2));
    expect(led).toBeGreaterThan(hollow);
    expect(hollow).toBeGreaterThan(FUNDED_BUDGET_ADEQUACY);
  });
});
