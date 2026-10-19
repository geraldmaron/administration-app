import { describe, expect, it } from "vitest";
import {
  budgetChair,
  classRoles,
  executionQuality,
  institutionTick,
  selectCounselRecord,
  stewardSway,
} from "@admin/engine";
import type { RoleId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { departmentScorecard } from "./scorecard";

// A row is honest only if the name it carries is a real engine rule
// that reads the ownership the row shows — never a label invented for the
// screen. Proved here by importing the named export for each `readBy` value:
// a row naming a function this file cannot import fails to compile, which is
// stronger than a string-equality check that a rename would silently pass.
const READ_BY_FUNCTION: Readonly<Record<string, unknown>> = {
  executionQuality,
  institutionTick,
  selectCounselRecord,
  stewardSway,
  budgetChair,
  classRoles,
};

describe("the department scorecard", () => {
  it("names a real, importable engine function on every row it draws", () => {
    const campaign = openingCampaign();
    const roles: readonly RoleId[] = [
      "role-treasury-minister" as RoleId,
      "role-homeland-secretary" as RoleId,
      "role-labor-secretary" as RoleId,
    ];
    let rowsChecked = 0;
    for (const role of roles) {
      for (const row of departmentScorecard(campaign, role)) {
        rowsChecked += 1;
        expect(typeof READ_BY_FUNCTION[row.readBy]).toBe("function");
      }
    }
    expect(rowsChecked).toBeGreaterThan(0);
  });

  it("draws the Treasury's own instruments, domain and budget line", () => {
    const campaign = openingCampaign();
    const rows = departmentScorecard(campaign, "role-treasury-minister" as RoleId);
    expect(rows.some((row) => row.key === "program:fiscal")).toBe(true);
    expect(rows.some((row) => row.key === "sway:economic")).toBe(true);
    expect(rows.some((row) => row.key === "budget:economic")).toBe(true);
  });

  it("draws no program or instrument row for a chair the ownership table seats no domain or instrument to", () => {
    const campaign = openingCampaign();
    const rows = departmentScorecard(campaign, "role-homeland-secretary" as RoleId);
    expect(rows.some((row) => row.key.startsWith("program:"))).toBe(false);
    expect(rows.some((row) => row.key.startsWith("sway:"))).toBe(false);
    const classes = rows.find((row) => row.key === "classes");
    expect(classes).toBeDefined();
    expect(classes!.reading.length).toBeGreaterThan(0);
  });

  it("names no responsibility for the head of state's own chair", () => {
    const campaign = openingCampaign();
    expect(departmentScorecard(campaign, campaign.founding.leadRole)).toEqual([]);
  });
});
