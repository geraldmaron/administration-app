import { describe, expect, it } from "vitest";
import { worldDataset } from "../dataset/index.js";
import { validateDataset } from "../validate/dataset-validator.js";
import { DefenseScope, Organization } from "./org-cradle-charter.js";

const NATO = worldDataset.organizations.find((org) => org.id === "ORG-NATO")!;
const G7 = worldDataset.organizations.find((org) => org.id === "ORG-G7")!;

describe("what a body binds its members to", () => {
  it("reads an authored body with no trade competence or defense scope as none and everywhere", () => {
    expect(G7.tradeCompetence).toBeUndefined();
    expect(G7.defenseScope).toBeUndefined();
  });

  it("accepts a treaty's own area, and refuses a scope with no source", () => {
    const scoped = Organization.parse({
      ...NATO,
      tradeCompetence: "none",
      defenseScope: { kind: "area", area: ["region-europe"], source: "https://example.org/treaty-text" },
    });
    expect(scoped.defenseScope?.kind).toBe("area");
    expect(DefenseScope.safeParse({ kind: "parties-territory", source: "" }).success).toBe(false);
    expect(Organization.safeParse({ ...NATO, tradeCompetence: "common-market" }).success).toBe(false);
  });

  it("leaves the shipped dataset valid with every new field absent", () => {
    const stripped = {
      ...worldDataset,
      organizations: worldDataset.organizations.map(({ tradeCompetence: _trade, defenseScope: _scope, ...org }) => org),
      nations: worldDataset.nations.map((nation) => {
        const { declared: _declared, ...arsenal } = nation.stats.military.arsenal;
        return { ...nation, stats: { ...nation.stats, military: { ...nation.stats.military, arsenal } } };
      }),
    };
    expect(validateDataset(worldDataset)).toEqual([]);
    expect(validateDataset(stripped)).toEqual([]);
  });
});
