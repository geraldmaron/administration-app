import { describe, expect, it } from "vitest";
import { plankById, platformPlanks } from "./platform.js";

describe("the platform catalog", () => {
  it("offers eight to ten planks with unique ids and titles", () => {
    expect(platformPlanks.length).toBeGreaterThanOrEqual(8);
    expect(platformPlanks.length).toBeLessThanOrEqual(10);
    expect(new Set(platformPlanks.map((plank) => plank.id as string)).size).toBe(platformPlanks.length);
    expect(new Set(platformPlanks.map((plank) => plank.title)).size).toBe(platformPlanks.length);
  });

  it("indexes every plank by its id", () => {
    for (const plank of platformPlanks) expect(plankById.get(plank.id as string)).toBe(plank);
  });

  // A pledge is written as "the pledge to <title>", so a title has to be a
  // promise in the imperative that reads inside that sentence.
  it("titles every plank as a short imperative with no closing period", () => {
    for (const plank of platformPlanks) {
      expect(plank.title, plank.id).toMatch(/^[A-Z][^.]*[^.\s]$/);
      expect(plank.title.split(" ").length, plank.id).toBeLessThanOrEqual(7);
    }
  });

  it("courts each cohort at most once per plank", () => {
    for (const plank of platformPlanks) {
      expect(new Set(plank.courts).size, plank.id).toBe(plank.courts.length);
    }
  });

  // The flag prefix is `plank:`, and a colon inside an id would make the flag
  // key ambiguous to anything that splits it back apart.
  it("keeps ids flag-safe", () => {
    for (const plank of platformPlanks) expect(plank.id as string).toMatch(/^plank-[a-z0-9-]+$/);
  });
});
