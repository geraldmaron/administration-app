import { describe, expect, it } from "vitest";
import { FORCE_ASSETS } from "../schemas/force-asset.js";
import { CARGO_BUCKETS, CHOKEPOINT_CARGO } from "./chokepoint-cargo.js";
import { CHOKEPOINT_FLOWS } from "./chokepoint-flows.js";
import { worldNations } from "./nations.js";
import { US_HULLS } from "./us-hulls.js";

// The two naval tables name things other tables own: a hull's unit type is a
// catalog id the order of battle counts, and a cargo's destination is a
// government on the roster or a bucket the source never split. A row that
// names neither would be read as a hull nobody can lose or a flag nobody can
// pass.

const roster = new Set(worldNations.map((nation) => nation.id as string));

describe("the US hull register", () => {
  it("files every hull under a navy platform the catalog counts", () => {
    for (const row of US_HULLS) {
      const asset = FORCE_ASSETS[row.unitType as keyof typeof FORCE_ASSETS];
      expect(asset?.branch, row.hull).toBe("navy");
      expect(asset?.echelon, row.hull).toBe("platform");
    }
  });

  it("lists each hull number once", () => {
    expect(new Set(US_HULLS.map((row) => row.hull)).size).toBe(US_HULLS.length);
  });
});

describe("where a strait's cargo is bound", () => {
  it("names a roster government or an unsplit bucket for every destination", () => {
    for (const row of CHOKEPOINT_CARGO) expect(roster.has(row.destination) || CARGO_BUCKETS.includes(row.destination), row.destination).toBe(true);
  });

  it("splits only a strait and commodity the flow table prices", () => {
    for (const row of CHOKEPOINT_CARGO) {
      expect(CHOKEPOINT_FLOWS.some((flow) => flow.chokepoint === row.chokepoint && flow.commodity === row.commodity)).toBe(true);
    }
  });
});
