import { describe, expect, it } from "vitest";
import { executiveOverview } from "@admin/player-core";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { cabinetGroups, executiveSearch } from "./cabinet-view";

const campaign = openingHarnessCampaign();
const sections = executiveOverview(campaign).sections;
describe("office exploration context", () => {
  it("rejects invented states, bounds query input, and preserves a space while typing a person or office name", () => {
    expect(executiveSearch({ staffing: "secret", order: "private-score", group: "hidden" })).toEqual({});
    expect(executiveSearch({ q: "Federal " }).q).toBe("Federal ");
    expect(executiveSearch({ q: "x".repeat(200) }).q).toHaveLength(120);
  });
  it("combines staffing and subject search without mutating the source roster", () => {
    const count = sections.reduce((sum, section) => sum + section.offices.length, 0);
    const found = cabinetGroups(campaign, sections, { q: "Federal Reserve", group: "staffing", order: "delivery" });
    expect(found.flatMap((group) => group.offices)).toHaveLength(1);
    expect(found[0]!.offices[0]!.node.name).toContain("Federal Reserve");
    expect(cabinetGroups(campaign, sections, { q: "Federal Reserve", staffing: "vacant" })).toHaveLength(0);
    expect(sections.reduce((sum, section) => sum + section.offices.length, 0)).toBe(count);
  });
});
