import { describe, expect, it } from "vitest";
import { divergingPalettes, partyPalettes } from "@admin/design";
import { themes } from "./from-design";

describe("color-vision themes", () => {
  it("rewrites the party inks under each non-standard vision, in every scheme and section", () => {
    for (const vision of ["protan", "deutan", "tritan"] as const) {
      const palette = partyPalettes[vision];
      for (const key of [`light_${vision}`, `dark_contrast_${vision}`, `dark_${vision}_chrome`, `light_${vision}_paper`, `dark_contrast_${vision}_situation`] as const) {
        const roles = themes[key];
        expect([roles.partyDem, roles.partyRep, roles.partyInd]).toEqual([palette.democrat, palette.republican, palette.independent]);
      }
    }
  });

  it("rewrites the diverging and valence inks under each non-standard vision, and keeps success and danger on the standard palette", () => {
    for (const vision of ["protan", "deutan", "tritan"] as const) {
      const roles = themes[`dark_${vision}`];
      expect([roles.divergeCool, roles.divergeWarm]).toEqual([divergingPalettes[vision][1], divergingPalettes[vision][5]]);
      expect([roles.goodInk, roles.badInk]).toEqual([roles.divergeCool, roles.divergeWarm]);
    }
    expect([themes.dark.goodInk, themes.dark.badInk]).toEqual([themes.dark.successInk, themes.dark.danger]);
    expect([themes.light.goodInk, themes.light.badInk]).toEqual([themes.light.successInk, themes.light.danger]);
    expect([themes.dark_situation.goodInk, themes.dark_situation.badInk]).toEqual([themes.dark_situation.successInk, themes.dark_situation.danger]);
  });

  it("changes only the party, diverging and valence inks", () => {
    const changed = ["partyDem", "partyRep", "partyInd", "divergeCool", "divergeWarm", "goodInk", "badInk"] as const;
    const strip = (roles: Record<string, string>) => Object.fromEntries(Object.entries(roles).filter(([key]) => !(changed as readonly string[]).includes(key)));
    expect(strip(themes.dark_deutan)).toEqual(strip(themes.dark));
    expect(changed.some((key) => themes.dark_deutan[key] !== themes.dark[key])).toBe(true);
  });
});
