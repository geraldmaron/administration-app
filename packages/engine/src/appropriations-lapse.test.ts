import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { carried } from "./congress.js";
import { projectPassage } from "./bill-stages.js";
import { legislationPhase } from "./legislation.js";
import { legislativeAct } from "./legislative-acts.js";
import type { Campaign } from "./state.js";

const STOPGAP_ACT = "act-continuing-resolution";
const ORDINARY_ACT = "act-infrastructure-investment";

function hostile(campaign: Campaign): Campaign {
  const senate = campaign.congress.chambers.senate;
  return {
    ...campaign,
    congress: {
      ...campaign.congress,
      disposition: 0,
      chambers: {
        ...campaign.congress.chambers,
        senate: { ...senate, seats: 100, administration: 45, opposition: 53, independent: 2 },
      },
    },
  };
}

function fundingAt(campaign: Campaign, throughTurn: number, onPriorYear: boolean): Campaign {
  return {
    ...campaign,
    congress: {
      ...campaign.congress,
      appropriation: {
        ...campaign.congress.appropriation,
        throughTurn,
        onPriorYear,
      },
    },
  };
}

describe("appropriations lapse stopgaps", () => {
  it("originates and carries a stopgap when appropriations are due or already lapsed", () => {
    const base = hostile(buildCampaign());
    const cases = [
      ["closing", fundingAt(base, base.turn + 1, false)],
      ["lapsed", fundingAt(base, base.turn - 1, true)],
    ] as const;

    for (const [label, campaign] of cases) {
      const after = legislationPhase(campaign).reduce((state, packet) => apply(state, packet), campaign);
      const stopgap = Object.values(after.bills).find((bill) => bill.act === STOPGAP_ACT);
      expect(stopgap?.status, label).toBe("on-the-desk");
      expect(stopgap && carried(stopgap.passage), label).toBe(true);
    }
  });

  it("does not carry an unrelated bill in the same hostile chamber", () => {
    const campaign = hostile(fundingAt(buildCampaign(), buildCampaign().turn + 1, false));
    const votes = projectPassage(campaign, legislativeAct(ORDINARY_ACT)!);
    expect(carried(votes)).toBe(false);
  });
});
