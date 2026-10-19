// Two modes must disagree on a stated bucket, and an unseated mode must say so
// instead of inventing a party color.

import { describe, expect, it } from "vitest";
import { MAP_UNSEATED, electoralBucket, mapBucketWord, mapLegend, mapRegionFill } from "./map-modes";

describe("map region fills", () => {
  it("paints their trust and your read as different fills when the buckets differ", () => {
    expect(mapRegionFill("trust", "adverse")).toBe("map-board-adverse");
    expect(mapRegionFill("reading", "favorable")).toBe("map-board-favorable");
    expect(mapRegionFill("trust", "adverse")).not.toBe(mapRegionFill("reading", "favorable"));
  });

  it("keeps trust on the modeled land when there is no stance, so the default board is not blank", () => {
    expect(mapRegionFill("trust", undefined)).toBe("map-board-modeled");
  });

  it("returns the empty state for an unapportioned House delegation and an unseated governor", () => {
    expect(mapRegionFill("house", undefined)).toBe("empty");
    expect(mapRegionFill("governors", undefined)).toBe("empty");
    expect(mapBucketWord("house", undefined)).toBe(MAP_UNSEATED);
    expect(mapBucketWord("governors", undefined)).toBe(MAP_UNSEATED);
  });

  it("paints a governor, or a House delegation's majority party, only from a real party id", () => {
    expect(mapRegionFill("governors", "democrat")).toBe("color-party-democrat");
    expect(mapRegionFill("governors", "republican")).not.toBe(mapRegionFill("governors", "democrat"));
    expect(mapRegionFill("house", "democrat")).toBe("color-party-democrat");
    expect(mapRegionFill("house", "republican")).toBe("color-party-republican");
    expect(mapBucketWord("house", "democrat")).toBe("Democrat");
  });
});

describe("a House delegation with no majority party", () => {
  it("paints an even split and a non-voting place with their own fills and words, and lists both in the legend", () => {
    expect(mapRegionFill("house", "split")).toBe("map-board-split");
    expect(mapBucketWord("house", "split")).toBe("Evenly split");
    expect(mapRegionFill("house", "nonvoting")).toBe("map-board-land");
    expect(mapBucketWord("house", "nonvoting")).toBe("No voting member");
    expect(mapLegend("house").map((row) => row.word)).toEqual(["Democrat", "Republican", "Independent", "Evenly split", "No voting member"]);
    expect(mapLegend("governors").map((row) => row.word)).not.toContain("Evenly split");
  });
});

describe("the five W5 lenses", () => {
  it("the electoral lens buckets on the same 0.08 cut the board calls competitive", () => {
    expect(electoralBucket(-0.2)).toBe("lean-democrat");
    expect(electoralBucket(-0.08)).toBe("lean-democrat");
    expect(electoralBucket(0)).toBe("tossup");
    expect(electoralBucket(0.08)).toBe("lean-republican");
    expect(electoralBucket(0.2)).toBe("lean-republican");
  });

  it("the senate lens paints only a real party, the hazards lens tells a declaration from a live condition", () => {
    expect(mapRegionFill("senate", "democrat")).toBe("color-party-democrat");
    expect(mapRegionFill("senate", undefined)).toBe("empty");
    expect(mapRegionFill("hazards", "declared")).toBe("map-board-adverse");
    expect(mapRegionFill("hazards", "condition")).toBe("map-board-caution");
    expect(mapBucketWord("hazards", "declared")).not.toBe(mapBucketWord("hazards", "condition"));
  });

  it("the deployments and sanctions lenses paint only a positive count", () => {
    expect(mapRegionFill("deployments", 0)).toBe("empty");
    expect(mapRegionFill("deployments", 2)).toBe("map-board-modeled");
  });
});
