import { describe, expect, it } from "vitest";
import { FORCE_ASSET_IDS, forceAssetFor } from "@admin/world";
import { assetGlyph, figureWords, unitNoun } from "./units";

describe("the unit a force count is read in", () => {
  it("names hulls, airframes and formations apart, so a column of mixed holdings is never one quantity", () => {
    expect(unitNoun("navy.aircraft-carrier", 11)).toBe("hulls");
    expect(unitNoun("air.fighter", 1550)).toBe("airframes");
    expect(unitNoun("army.brigade-combat-team", 31)).toBe("formations");
    expect(unitNoun("air.fighter-squadron", 12)).toBe("formations");
  });

  it("uses the singular for exactly one", () => {
    expect(unitNoun("navy.aircraft-carrier", 1)).toBe("hull");
    expect(unitNoun("space.navigation-satellite", 1)).toBe("satellite");
    expect(unitNoun("cyber.national-mission-team", 1)).toBe("team");
    expect(unitNoun("army.air-defense-battery", 1)).toBe("battery");
  });

  it("puts the number first and the unit after, with thousands grouped", () => {
    expect(figureWords("air.fighter", 1550)).toBe("1,550 airframes");
    expect(figureWords("navy.attack-submarine", 1)).toBe("1 hull");
  });

  it("gives every asset in the catalog a glyph and a counting noun", () => {
    for (const id of FORCE_ASSET_IDS) {
      expect(assetGlyph(id), id).toBeTruthy();
      expect(unitNoun(id, 2), id).toBe(forceAssetFor(id).counts);
    }
  });
});
