import { describe, expect, it } from "vitest";
import { countryReferences, countryReferenceFor } from "./country-reference.js";
import { CHINA_ID, RUSSIA_ID, UK_ID, US_ID, worldNations } from "./nations.js";

describe("country reference stubs", () => {
  it("parses every authored stub under the schema", () => {
    expect(countryReferences.length).toBeGreaterThanOrEqual(4);
    for (const entry of countryReferences) {
      expect(entry.executiveSummary).toMatch(/\n\n/);
      expect(entry.whyItMatters.length).toBeGreaterThanOrEqual(40);
    }
  });

  it("covers USA and major allies or rivals that exist in the dataset", () => {
    const nationIds = new Set(worldNations.map((nation) => nation.id as string));
    for (const id of [US_ID, UK_ID, CHINA_ID, RUSSIA_ID] as const) {
      expect(nationIds.has(id as string)).toBe(true);
      expect(countryReferenceFor(id as string)?.nationId).toBe(id);
    }
  });

  it("returns undefined for nations without a stub yet", () => {
    expect(countryReferenceFor("ISL")).toBeUndefined();
  });
});
