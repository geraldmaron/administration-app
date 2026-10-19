import { describe, expect, it } from "vitest";
import { NAMED_PALETTE, regionTable } from "./__fixtures__/map-fixtures";
import { regionKey } from "./data";
import { openingHarnessCampaign } from "./harness/fixture";
import { resolveLens } from "./lenses/registry";
import { arcPath } from "./MapArcs";

/** The control point of a path "M x0 y0 Q cx cy x1 y1". */
function control(path: string): readonly [number, number] {
  const [cx, cy] = path.split(" Q ")[1]!.split(" ").map(Number);
  return [cx!, cy!];
}

describe("the arcs between governments", () => {
  it("bows upward on screen whichever way the tie runs", () => {
    const right = control(arcPath([0, 100], [200, 100]));
    const left = control(arcPath([200, 100], [0, 100]));
    expect(right[1]).toBeLessThan(100);
    expect(left[1]).toBeLessThan(100);
  });

  it("bows by a share of its length and never sweeps further than a screen's corner of curve", () => {
    const short = control(arcPath([0, 100], [100, 100]));
    expect(100 - short[1]).toBeCloseTo(18, 5);
    const far = control(arcPath([0, 100], [5000, 100]));
    expect(100 - far[1]).toBeCloseTo(120, 5);
  });

  it("is a straight point for a tie that starts where it ends", () => {
    expect(arcPath([10, 10], [10, 10])).toMatch(/^M 10\.0 10\.0 Q /);
  });
});

describe("the trade lens", () => {
  const table = regionTable();
  const campaign = openingHarnessCampaign();
  const lens = resolveLens("trade-share", campaign, NAMED_PALETTE);

  it("colors a large partner above a small one, in words that carry the share", () => {
    const mexico = lens.read(table.byKey.get(regionKey("world", "MEX"))!, "nation");
    const tuvalu = lens.read(table.byKey.get(regionKey("world", "TUV"))!, "nation");
    expect(mexico?.rank).toBeGreaterThan(tuvalu?.rank ?? 0);
    expect(mexico?.text).toMatch(/% of US trade$/);
    expect(tuvalu?.text).toBe("Under 0.1% of US trade");
  });

  it("draws the President's own country in its own color and says nothing about a state", () => {
    expect(lens.read(table.byKey.get(regionKey("world", campaign.founding.nation))!, "nation")?.text).toBe("The United States");
    expect(lens.read(table.byKey.get(regionKey("states", "CA"))!, "state")).toBeNull();
  });
});
