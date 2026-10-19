import { describe, expect, it } from "vitest";
import { POLICY_DOMAINS, apply, enactPolicy, projectPolicyStance, selectPolicyStance, stancesForDomain, type Campaign, type Pledge } from "@admin/engine";
import { STATE_IDS, type PlankId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { alignmentCell, alignmentShiftWords, metricCell } from "./choice-table";
import { pledgesOnDomain, policyPortfolio, stateIndustryShares } from "./portfolio";
import { stanceComparison, stanceReview } from "./stance-comparison";

const base = openingCampaign();
const charter = charterOf(base);

function withPledge(campaign: Campaign, plank: string): Campaign {
  const pledge: Pledge = {
    id: `pledge:${plank}`,
    plank: plank as PlankId,
    madeDate: campaign.calendar,
    dueDate: { ...campaign.calendar, year: campaign.calendar.year + 1 },
    firstHundredDays: false,
    status: "open",
  };
  return { ...campaign, pledges: [...(campaign.pledges ?? []), pledge] };
}

/** A domain with a stance the opening campaign can adopt outright. */
function adoptable(campaign: Campaign): { readonly domain: (typeof POLICY_DOMAINS)[number]; readonly stance: string } {
  for (const domain of POLICY_DOMAINS) {
    const stance = stancesForDomain(domain).find((entry) => projectPolicyStance(campaign, charter, domain, entry.id).available);
    if (stance && enactPolicy(campaign, stance.id).ok) return { domain, stance: stance.id };
  }
  throw new Error("the opening campaign can adopt no stance at all");
}

describe("policyPortfolio", () => {
  it("lists the six domains in the engine's order with the stance in force", () => {
    const portfolio = policyPortfolio(base);
    expect(portfolio.map((row) => row.domain)).toEqual([...POLICY_DOMAINS]);
    for (const row of portfolio) {
      expect(row.stance.id).toBe(selectPolicyStance(base, row.domain).id);
      expect(row.alternatives).toBe(stancesForDomain(row.domain).length - 1);
      expect(row.shareWords.length).toBeGreaterThan(0);
    }
  });

  it("names a statute only where a position needs one", () => {
    const portfolio = policyPortfolio(base);
    expect(portfolio.find((row) => row.domain === "defense")!.byStatute).toBe(false);
  });

  it("reads a promise that rides on a domain", () => {
    const pledged = withPledge(base, "plank-rebuild-military");
    const pledges = pledgesOnDomain(pledged, "defense");
    expect(pledges).toHaveLength(1);
    expect(pledges[0]!).toMatchObject({ stance: "defense-rearmament", kind: "adopt" });
    expect(pledgesOnDomain(pledged, "fiscal")).toHaveLength(0);
  });
});

describe("stateIndustryShares", () => {
  it("gives every state a share between nothing and all of it", () => {
    const shares = stateIndustryShares("defense");
    expect(shares.size).toBe(STATE_IDS.length);
    for (const share of shares.values()) {
      expect(share).toBeGreaterThanOrEqual(0);
      expect(share).toBeLessThanOrEqual(1);
    }
  });

  it("sums two axes for a domain that lands on two", () => {
    const industry = stateIndustryShares("industry");
    const defense = stateIndustryShares("defense");
    expect([...industry.values()].some((share, index) => share !== [...defense.values()][index])).toBe(true);
  });
});

describe("stanceComparison", () => {
  it("offers every stance but the one in force, with every row read across every column", () => {
    for (const domain of POLICY_DOMAINS) {
      const table = stanceComparison(base, charter, domain);
      expect(table.current).toBe(selectPolicyStance(base, domain).id);
      expect(table.columns.map((column) => column.id)).not.toContain(table.current);
      expect(table.columns).toHaveLength(stancesForDomain(domain).length - 1);
      for (const row of table.rows) expect(row.cells).toHaveLength(table.columns.length);
    }
  });

  it("quotes the enactment price the projection charges", () => {
    const { domain, stance } = adoptable(base);
    const table = stanceComparison(base, charter, domain);
    const index = table.columns.findIndex((column) => column.id === stance);
    const priced = table.rows.find((row) => row.id === "enactment")!.cells[index]!;
    expect(priced).toEqual(metricCell(projectPolicyStance(base, charter, domain, stance).enactment, "Nothing up front"));
  });

  it("locks a column the desk would refuse, with the desk's reason", () => {
    for (const domain of POLICY_DOMAINS) {
      for (const column of stanceComparison(base, charter, domain).columns) {
        const result = enactPolicy(base, column.id);
        expect(column.locked).toBe(result.ok ? undefined : result.reason);
      }
    }
  });

  it("locks a revenue program until its statute passes", () => {
    const fiscal = stanceComparison(base, charter, "fiscal").columns;
    expect(fiscal.length).toBeGreaterThan(0);
    for (const column of fiscal) expect(column.locked).toMatch(/written in statute/);
  });

  it("names the promise an adopted stance keeps", () => {
    const pledged = withPledge(base, "plank-rebuild-military");
    const table = stanceComparison(pledged, charter, "defense");
    const index = table.columns.findIndex((column) => column.id === "defense-rearmament");
    expect(table.rows.find((row) => row.id === "pledges")!.cells[index]!.text).toMatch(/^Keeps/);
  });

  it("makes the enacted stance the new baseline once signed", () => {
    const { domain, stance } = adoptable(base);
    const result = enactPolicy(base, stance);
    if (!result.ok) throw new Error(result.reason);
    const after = apply(base, result.packet);
    expect(stanceComparison(after, charter, domain).current).toBe(stance);
  });

  it("says what signing does above the verb", () => {
    const { domain, stance } = adoptable(base);
    expect(stanceReview(base, charter, domain, stance)).toMatch(/^You will move .* policy from .* to .*Record\.$/);
  });
});

describe("alignmentShiftWords", () => {
  it("says nothing moved when nothing did", () => {
    expect(alignmentShiftWords({})).toBe("No change to where you stand");
  });

  it("names the heaviest pull first, and a sharp one as sharp", () => {
    expect(alignmentShiftWords({ economicLeftRight: -0.3, nationalistGlobalist: 0.1 })).toBe("Pulls you sharply left on the economy, and toward the nation first");
  });
});

describe("drawable cells", () => {
  it("keeps every metric movement as a signed number beside its words", () => {
    const priced = metricCell({ stability: -0.03, approval: 0.01 }, "Nothing up front");
    expect(priced.moves).toEqual([
      { label: "Political stability", value: -0.03, text: "−3 pts", tone: "adverse" },
      { label: "Public approval", value: 0.01, text: "+1 pts", tone: "favorable" },
    ]);
  });

  it("leaves an empty set without movements", () => {
    expect(metricCell({}, "Nothing up front")).toEqual({ text: "Nothing up front", tone: "neutral" });
  });

  it("draws a political pull on the side it pulls to, neither good nor bad", () => {
    const pulled = alignmentCell({ economicLeftRight: -0.3 });
    expect(pulled.text).toBe("Pulls you sharply left on the economy");
    expect(pulled.moves).toEqual([{ label: "On the economy", value: -0.3, text: "Sharply left", tone: "neutral" }]);
  });
});

describe("policyPortfolio people", () => {
  it("names the person running each seated department by id", () => {
    for (const row of policyPortfolio(base)) {
      if (row.minister === undefined) {
        expect(row.ministerId).toBeUndefined();
        continue;
      }
      expect(row.ministerId).toBeTruthy();
      expect(base.people[row.ministerId as never]?.base.name).toBe(row.minister);
    }
    expect(policyPortfolio(base).some((row) => row.ministerId !== undefined)).toBe(true);
  });
});
