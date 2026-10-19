import { describe, expect, it } from "vitest";
import { NATION_LEADER_CONSTRAINTS } from "./nation-leaders.generated.js";
import { nationCabinetRoles, nationLeadRole } from "./nation-titles.js";
import { cabinetWomenShareFor, nationGenderPriorFor } from "./portrait-priors.js";

const ROWS = Object.values(NATION_LEADER_CONSTRAINTS);

describe("how a foreign government's chairs divide by presentation", () => {
  it("draws every lead chair as the table's leader, whatever the cabinet around it", () => {
    for (const row of ROWS) {
      const prior = nationGenderPriorFor(row.nation as string, nationLeadRole(row.nation as string)!)!;
      expect(prior.feminine, row.nation as string).toBe(row.sex === "F" ? 1 : 0);
      expect(prior.masculine, row.nation as string).toBe(row.sex === "M" ? 1 : 0);
      expect(prior.androgynous).toBe(0);
    }
  });

  it("keeps the Marshall Islands' woman President separate from a cabinet recorded with none", () => {
    expect(nationGenderPriorFor("MHL", nationLeadRole("MHL")!)!.feminine).toBe(1);
    expect(nationGenderPriorFor("MHL", "role-foreign-minister")!.feminine).toBe(0);
  });

  it("reads each cabinet chair at the share the table records where that share describes the sitting cabinet", () => {
    for (const row of ROWS.filter((entry) => !entry.shareFlagged)) {
      for (const role of nationCabinetRoles(row.nation as string).slice(1)) {
        const prior = nationGenderPriorFor(row.nation as string, role)!;
        expect(prior.feminine, `${row.nation} ${role}`).toBe(row.womenCabinetShare);
        expect(prior.androgynous).toBe(0);
      }
    }
  });

  it("seats no woman in the Saudi cabinet, a researched zero rather than a data lag", () => {
    expect(NATION_LEADER_CONSTRAINTS.SAU!.shareFlagged).toBe(false);
    for (const role of ["role-court-chancellor", "role-treasury-minister", "role-defense-minister", "role-foreign-minister", "role-opposition-leader"]) {
      expect(nationGenderPriorFor("SAU", role)!.feminine, role).toBe(0);
    }
  });

  it("floors a share that predates the sitting cabinet at its region's mean, so Hungary's new cabinet is not all men", () => {
    const hungary = NATION_LEADER_CONSTRAINTS.HUN!;
    expect(hungary.shareFlagged).toBe(true);
    expect(hungary.womenCabinetShare).toBe(0);
    expect(cabinetWomenShareFor("HUN")!).toBeGreaterThan(0.1);
    for (const row of ROWS.filter((entry) => entry.shareFlagged)) {
      expect(cabinetWomenShareFor(row.nation as string)!, row.nation as string).toBeGreaterThanOrEqual(row.womenCabinetShare);
    }
  });

  it("balances a foreign journalist's presentation, and leaves the United States to its own bench", () => {
    expect(nationGenderPriorFor("SAU", "role-journalist")).toEqual({ masculine: 0.5, feminine: 0.5, androgynous: 0 });
    expect(nationGenderPriorFor("USA", "role-foreign-minister")).toBeUndefined();
  });
});
