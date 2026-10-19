import { describe, expect, it } from "vitest";
import { worldDataset } from "@admin/world";
// @ts-expect-error — plain ESM beside the dev server, not built TypeScript.
import { applyEdits, isStale, mergeNation, rejectionFor, scalarLeafPaths, valueAtPath, withValueAtPath} from "../overlay-model.mjs";

const usa = worldDataset.nations.find((nation) => String(nation.id) === "USA")!;

const edit = (fieldPath: string, newValue: unknown, baseValue: unknown = valueAtPath(usa, fieldPath)) => ({
  recordId: "USA",
  fieldPath,
  baseValue,
  newValue,
});

describe("which fields the console offers", () => {
  it("reaches scalars nested three deep", () => {
    expect(scalarLeafPaths(usa)).toContain("stats.military.branchStrength.naval");
  });

  it("offers no derived field, because publishing one would be overwritten at the next assembly", () => {
    const paths = scalarLeafPaths(usa);
    expect(paths.some((path: string) => path.startsWith("bands."))).toBe(false);
    expect(paths.some((path: string) => path.startsWith("memberships"))).toBe(false);
  });

  it("offers no id, which is a rename across the dataset rather than a field edit", () => {
    expect(scalarLeafPaths(usa)).not.toContain("id");
  });

  it("offers no list or weighted mix, whose entries have to agree with something outside this record", () => {
    const paths = scalarLeafPaths(usa);
    expect(paths).not.toContain("geo.neighbors");
    expect(paths).not.toContain("stats.energy.mix");
    expect(paths).not.toContain("stats.trade.topExports");
  });
});

describe("applying an edit", () => {
  it("leaves the seed record untouched — it is module state the whole console reads", () => {
    const before = usa.stats.economy.inflation;
    withValueAtPath(usa, "stats.economy.inflation", 0.9);
    expect(usa.stats.economy.inflation).toBe(before);
  });

  it("copies only the path it changes", () => {
    const next = withValueAtPath(usa, "stats.economy.inflation", 0.09);
    expect(valueAtPath(next, "stats.economy.inflation")).toBe(0.09);
    expect(next.stats.demography).toBe(usa.stats.demography);
  });

  it("applies edits in order, so the last write to a field wins", () => {
    const merged = applyEdits(usa, [edit("identity.capital", "First"), edit("identity.capital", "Second")]);
    expect(valueAtPath(merged, "identity.capital")).toBe("Second");
  });
});

describe("what an edit is refused for", () => {
  it("refuses a field that does not exist", () => {
    expect(rejectionFor(usa, edit("stats.economy.vibes", 1))?.reason).toMatch(/no field/);
  });

  it("refuses a list, even a well-formed one", () => {
    expect(rejectionFor(usa, edit("geo.neighbors", ["CAN"]))?.reason).toMatch(/not a scalar/);
  });

  it("refuses a number field handed a string, which is what an unparsed form body is", () => {
    expect(rejectionFor(usa, edit("stats.economy.inflation", "0.04"))?.reason).toMatch(/is a number, got string/);
  });

  it("refuses NaN, which is typeof number and passes every other check", () => {
    expect(rejectionFor(usa, edit("stats.economy.inflation", Number.NaN))?.reason).toMatch(/finite/);
  });
});

describe("merging against the schema", () => {
  it("accepts a plausible change", () => {
    const outcome = mergeNation(usa, [edit("stats.economy.inflation", 0.06)]);
    expect(outcome.ok).toBe(true);
  });

  it("refuses a value only the schema knows is out of range", () => {
    const outcome = mergeNation(usa, [edit("stats.economy.debtToGdp", 40)]);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.rejections[0]?.fieldPath).toBe("stats.economy.debtToGdp");
  });

  it("refuses an enum the schema does not carry", () => {
    expect(mergeNation(usa, [edit("doctrine.posture", "belligerent")]).ok).toBe(false);
  });

  it("refuses an empty string where the schema wants prose", () => {
    expect(mergeNation(usa, [edit("identity.capital", "")]).ok).toBe(false);
  });
});

describe("staleness against hand edits to source", () => {
  it("passes an edit written against what source still says", () => {
    expect(isStale(usa, edit("doctrine.posture", "defensive"))).toBe(false);
  });

  it("catches an edit whose base no longer matches, rather than discarding the other change", () => {
    expect(isStale(usa, edit("doctrine.posture", "defensive", "isolationist"))).toBe(true);
  });
});

describe("what the registry adds to a rejection", () => {
  it("refuses a value outside the schema's bounds at save time, not only at publish", () => {
    expect(rejectionFor(usa, edit("stats.economy.inflation", 3))).toMatchObject({ reason: expect.stringMatching(/at most 2/) });
    expect(rejectionFor(usa, edit("stats.economy.inflation", 0.05))).toBeUndefined();
  });

  it("refuses an option the posture enum does not admit", () => {
    expect(rejectionFor(usa, edit("doctrine.posture", "hostile"))).toMatchObject({ reason: expect.stringMatching(/one of defensive/) });
  });
});
