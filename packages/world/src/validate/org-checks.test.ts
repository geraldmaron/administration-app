import { describe, expect, it } from "vitest";
import { worldDataset } from "../dataset/index.js";
import { FOUNDING_DYADS } from "../dataset/dyads.js";
import type { OrgId, WorldDataset } from "../schemas/index.js";
import { checkOrganizations, dyadErrors } from "./org-checks.js";

// The registry's authored ties are refused without the page they were read
// from, and a defense scope is refused anywhere it would bind nothing.

function withOrg(dataset: WorldDataset, id: string, patch: Partial<WorldDataset["organizations"][number]>): WorldDataset {
  return {
    ...dataset,
    organizations: dataset.organizations.map((org) => (org.id === (id as OrgId) ? { ...org, ...patch } : org)),
  };
}

describe("the organization registry's cross-record rules", () => {
  it("passes the shipped registry and the shipped dyads", () => {
    expect(checkOrganizations(worldDataset)).toEqual([]);
  });

  it("refuses a defense scope on a body that is not a defense body", () => {
    const broken = withOrg(worldDataset, "ORG-G7", { defenseScope: { kind: "parties-territory", source: "https://example.org/g7" } });
    expect(checkOrganizations(broken).some((error) => error.path === "organizations.ORG-G7.defenseScope")).toBe(true);
  });

  it("refuses an area scope that names no area", () => {
    const broken = withOrg(worldDataset, "ORG-US-KOREA", { defenseScope: { kind: "area", area: [], source: "https://example.org/korea" } });
    expect(checkOrganizations(broken).map((error) => error.path)).toContain("organizations.ORG-US-KOREA.defenseScope");
  });

  it("refuses a government inside two customs unions", () => {
    const broken = withOrg(worldDataset, "ORG-MERCOSUR", {
      members: [...worldDataset.organizations.find((org) => org.id === ("ORG-MERCOSUR" as OrgId))!.members, "FRA" as never],
    });
    expect(checkOrganizations(broken).some((error) => error.message.includes("FRA is in two customs unions"))).toBe(true);
  });

  it("refuses a sourced pair with no link or no opened date", () => {
    const row = FOUNDING_DYADS[0]!;
    expect(dyadErrors({ ...row, source: "" }, 0).map((error) => error.message)).toContain("a sourced pair names no page it was read from");
    expect(dyadErrors({ ...row, opened: "last week" }, 0).map((error) => error.message)).toContain("a sourced pair has no day its source was opened");
    expect(dyadErrors(row, 0)).toEqual([]);
  });

  it("refuses a level outside its schema range", () => {
    const row = FOUNDING_DYADS.find((entry) => entry.levels)!;
    const broken = { ...row, levels: { ...row.levels!, tension: 1.4 } };
    expect(dyadErrors(broken, 0).map((error) => error.message)).toContain("a level is outside its schema range");
  });
});
