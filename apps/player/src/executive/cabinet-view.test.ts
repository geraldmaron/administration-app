import { describe, expect, it } from "vitest";
import { executiveOverview } from "@admin/player-core";
import { opening } from "../dossier/opening.test-fixture";
import { cabinetGroups, executiveSearch, searchParams, selectedOffice } from "./cabinet-view";

const campaign = opening();
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

describe("the address round trip", () => {
  it("reads back what it writes, and drops cleared settings", () => {
    const search = { scope: "departments", office: "x", view: "roster" as const, need: true as const, q: "state", staffing: "acting" as const, group: "assessment" as const, order: "delivery" as const };
    const written = Object.fromEntries(Object.entries(searchParams(search)).filter(([, value]) => value !== undefined));
    expect(executiveSearch(written)).toEqual(search);
    expect(Object.values(searchParams({})).every((value) => value === undefined)).toBe(true);
  });

  it("opens the inspector on the named office, else the first that needs the President", () => {
    const groups = cabinetGroups(campaign, sections, {});
    const first = groups[0]!.offices[0]!;
    expect(selectedOffice(groups, first.node.office)).toBe(first);
    expect(selectedOffice(groups, "no-such-office")).toBeDefined();
    expect(selectedOffice([], undefined)).toBeUndefined();
  });
});
