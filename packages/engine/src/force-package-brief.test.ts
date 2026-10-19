import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { composeForcePackages, FORCE_PACKAGE_SPECS } from "./force-packages.js";
import {
  ASSISTANCE_PACKAGE_BRIEFS,
  allPackageBriefs,
  objectivesForPackage,
  packageBrief,
  resolvePackageCount,
  type CommitmentLevel,
} from "./force-package-brief.js";

const USA = "USA" as NationId;

describe("force package briefs", () => {
  it("authors a brief for every FORCE_PACKAGE_SPECS id", () => {
    expect(allPackageBriefs()).toHaveLength(FORCE_PACKAGE_SPECS.length);
    for (const spec of FORCE_PACKAGE_SPECS) {
      const brief = packageBrief(spec);
      expect(brief.specId).toBe(spec.id);
      expect(brief.purpose.length).toBeGreaterThan(20);
      expect(brief.effect.length).toBeGreaterThan(20);
      expect(brief.componentsProse.length).toBeGreaterThan(20);
      expect(brief.strategicCost.length).toBeGreaterThan(20);
      expect(brief.authorityNote.length).toBeGreaterThan(20);
      expect(brief.riskNote.length).toBeGreaterThan(20);
      expect(objectivesForPackage(spec.id).length).toBeGreaterThan(0);
    }
  });

  it("authors assistance briefs for rungs 1 through 5", () => {
    expect(ASSISTANCE_PACKAGE_BRIEFS.map((brief) => brief.rung)).toEqual([1, 2, 3, 4, 5]);
    for (const brief of ASSISTANCE_PACKAGE_BRIEFS) {
      expect(brief.purpose.length).toBeGreaterThan(20);
      expect(brief.recipients.length).toBeGreaterThan(20);
      expect(brief.mechanism.length).toBeGreaterThan(20);
      expect(brief.costFraming.length).toBeGreaterThan(20);
    }
  });

  it("resolvePackageCount maps commitment levels inside composed min and max", () => {
    const campaign = buildCampaign();
    for (const composed of composeForcePackages(campaign, USA)) {
      const levels: CommitmentLevel[] = ["limited", "standard", "reinforced"];
      for (const level of levels) {
        const count = resolvePackageCount(composed, level);
        expect(count).toBeGreaterThanOrEqual(composed.min);
        expect(count).toBeLessThanOrEqual(composed.max);
      }
      expect(resolvePackageCount(composed, "limited")).toBe(composed.min);
      expect(resolvePackageCount(composed, "standard")).toBe(composed.defaultCount);
      expect(resolvePackageCount(composed, "reinforced")).toBe(composed.max);
    }
  });
});
