import { describe, expect, it } from "vitest";
import type { Campaign, ChamberComposition, UsMajorParty } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { chamberMajorityLine, chamberMajorityParty, presidentialRelation } from "./party-words";

const base = openingCampaign();

function withCongress(administrationParty: Campaign["congress"]["administrationParty"], caucusAnchor: UsMajorParty, senate: Partial<ChamberComposition>): Campaign {
  const chambers = { ...base.congress.chambers, senate: { ...base.congress.chambers.senate, ...senate } };
  return { ...base, congress: { ...base.congress, administrationParty, caucusAnchor, chambers } };
}

describe("party and caucus words", () => {
  it("names the President's party only for a President who belongs to it", () => {
    const democrat = withCongress("democrat", "democrat", {});
    expect(presidentialRelation(democrat, "democrat")).toBe("the President's party");
    expect(presidentialRelation(democrat, "republican")).toBeUndefined();
    expect(presidentialRelation(democrat, "independent")).toBeUndefined();
  });

  it("gives an independent President a nearest caucus and no party", () => {
    const independent = withCongress("independent", "republican", {});
    expect(presidentialRelation(independent, "republican")).toBe("the caucus nearest the President");
    expect(presidentialRelation(independent, "democrat")).toBeUndefined();
  });

  it("counts the independents in Congress with the Democrats whichever side the President sits nearest", () => {
    // 48 Republicans against 49 Democrats and 3 independents: a Democratic Senate either way.
    const senate = { seats: 100, administration: 48, opposition: 49, independent: 3 };
    const republicanAnchored = withCongress("republican", "republican", senate);
    expect(chamberMajorityParty(republicanAnchored, "senate")).toBe("democrat");
    expect(chamberMajorityLine(republicanAnchored, "senate")).toBe("Democrats hold the Senate, counting 3 independents who vote with them.");
  });

  it("never says 'your' about a chamber", () => {
    for (const party of ["democrat", "republican", "independent"] as const) {
      const anchor: UsMajorParty = party === "independent" ? "democrat" : party;
      const campaign = withCongress(party, anchor, {});
      for (const chamber of ["house", "senate"] as const) expect(chamberMajorityLine(campaign, chamber)).not.toMatch(/\byour\b/i);
    }
  });
});
