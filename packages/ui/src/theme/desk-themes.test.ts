import { describe, expect, it } from "vitest";
import { AA_NON_TEXT, AA_NORMAL_TEXT, AAA_NORMAL_TEXT, composite, contrastRatio } from "@admin/design";
import { themes, type ThemeRoles } from "./from-design";

// The token test measures the desk's roles; this measures what components
// actually receive once a zone has re-mapped them. Every text role on every
// surface it can sit on, in every scheme, contrast setting and zone. The
// contrast themes hold text to AAA.

type Role = keyof ThemeRoles;

const GROUNDS: readonly Role[] = ["surface", "surfaceRaised", "surfaceHover"];
const INKS: readonly Role[] = ["color", "colorSecondary", "colorTertiary"];
const FILLS: readonly (readonly [Role, Role])[] = [["accentInk", "accentFill"], ["accentInk", "accentFillHover"], ["goldInk", "goldFill"], ["dangerInk", "dangerFill"], ["dangerInk", "dangerFillHover"]];
const MARKS: readonly Role[] = ["borderColorStrong", "outlineColor"];

const BASE = Object.keys(themes).filter((key) => !/protan|deutan|tritan/.test(key)) as (keyof typeof themes)[];

function measure(roles: ThemeRoles, ink: Role, ground: Role): number {
  const plane = roles.surface;
  return contrastRatio(composite(roles[ink], plane), composite(roles[ground], plane));
}

describe("every theme a component can sit under", () => {
  for (const key of BASE) {
    const roles = themes[key];
    const floor = key.includes("contrast") ? AAA_NORMAL_TEXT : AA_NORMAL_TEXT;

    it(`${key}: text clears ${floor}:1 on every surface`, () => {
      for (const ground of GROUNDS) for (const ink of INKS) expect(measure(roles, ink, ground), `${ink} on ${ground}`).toBeGreaterThanOrEqual(floor);
    });

    it(`${key}: an action's label clears AA on its fill`, () => {
      for (const [ink, fill] of FILLS) expect(measure(roles, ink, fill), `${ink} on ${fill}`).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it(`${key}: control edges and the focus ring clear 3:1`, () => {
      for (const mark of MARKS) expect(measure(roles, mark, "surface"), mark).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  }
});
