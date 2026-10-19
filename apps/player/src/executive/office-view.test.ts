import { describe, expect, it } from "vitest";
import { executiveOverview, officeFile } from "@admin/player-core";
import { opening } from "../dossier/opening.test-fixture";
import { CONDITION_KEYS, againstBranch, branchAverages, chairActsFor, fillOf, officeAttention, officeViewOf } from "./office-view";

const campaign = opening();
const offices = executiveOverview(campaign).sections.flatMap((section) => section.offices.map((office) => office.node.office));

describe("the office file", () => {
  it("reads the view and the fill from the address, refusing anything else", () => {
    expect(officeViewOf("record")).toBe("record");
    expect(officeViewOf(["actions"])).toBe("actions");
    expect(officeViewOf("secret")).toBe("overview");
    expect(fillOf("acting")).toBe("acting");
    expect(fillOf("dismiss")).toBeUndefined();
  });

  it("averages each operating reading over the branch, on the same 0 to 1 scale", () => {
    const averages = branchAverages(campaign)!;
    for (const key of CONDITION_KEYS) {
      expect(averages[key]).toBeGreaterThanOrEqual(0);
      expect(averages[key]).toBeLessThanOrEqual(1);
    }
    const file = offices.map((id) => officeFile(campaign, id)).find((entry) => entry?.condition);
    const gap = againstBranch(file!.condition!, averages);
    expect(gap.capacity).toBe(Math.round((file!.condition!.capacity - averages.capacity) * 100));
  });

  it("offers dismissal only on a confirmed cabinet chair, and says why an empty chair needs the President", () => {
    for (const id of offices) {
      const file = officeFile(campaign, id);
      if (!file) continue;
      const acts = chairActsFor(file);
      if (acts.includes("dismiss")) expect(file.staffing === "confirmed" && file.lever === "cabinet").toBe(true);
      if (file.staffing === "vacant") expect(officeAttention(file)[0]).toMatch(/Nobody is in the job/);
    }
  });
});
