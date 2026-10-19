import { describe, expect, it } from "vitest";
import { SECTOR_IDS } from "../schemas/sector.js";
import { STATE_ECONOMY_AXES } from "../schemas/state.js";
import { SECTOR_AXIS } from "./sector-axis.js";

describe("the fold from the closed 23 sectors to the six state economy axes", () => {
  it("names an axis for every declared sector, and no other keys", () => {
    expect(Object.keys(SECTOR_AXIS).sort()).toEqual([...SECTOR_IDS].sort());
  });

  it("only ever names an axis the schema declares", () => {
    for (const sector of SECTOR_IDS) {
      expect(STATE_ECONOMY_AXES).toContain(SECTOR_AXIS[sector]);
    }
  });
});
