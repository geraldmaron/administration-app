import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CountedHolding } from "@admin/player-core";
import { HoldingsTable } from "./HoldingsTable";

const HOLDINGS: readonly CountedHolding[] = [
  { domain: "air", branch: "air", unitType: "air.fighter", label: "Fighter aircraft", total: 1550, committed: 120, available: 1100, belowReadiness: 330 },
  { domain: "sea", branch: "navy", unitType: "navy.aircraft-carrier", label: "Aircraft carriers", total: 11, committed: 3, available: 6, belowReadiness: 2 },
  { domain: "ground", branch: "army", unitType: "army.brigade-combat-team", label: "Brigade combat teams", total: 31, committed: 4, available: 20, belowReadiness: 7 },
];

describe("the holdings table", () => {
  const html = renderToStaticMarkup(<HoldingsTable holdings={HOLDINGS} caption="What the United States fields" />);

  it("carries a glyph, a name, a number and the unit on every row", () => {
    expect(html.match(/data-glyph="unit[A-Za-z]+"/g)).toHaveLength(3);
    expect(html).toContain("Fighter aircraft");
    expect(html).toMatch(/1,550<\/span> <span class="asset-figure__unit">airframes/);
    expect(html).toMatch(/>11<\/span> <span class="asset-figure__unit">hulls/);
    expect(html).toMatch(/>31<\/span> <span class="asset-figure__unit">formations/);
  });

  it("lays fielded, committed, free and not ready in four aligned columns", () => {
    for (const heading of ["Fielded", "Abroad", "Free", "Not ready"]) expect(html).toContain(`<th scope="col">${heading}</th>`);
    expect(html).toMatch(/data-valence="good">1,100<\/td>/);
    expect(html).toMatch(/data-valence="bad">(<!-- -->)?▼ ?(<!-- -->)?330/);
    expect(html).toContain("<caption");
  });

  it("sorts by asset name only, since each count is in its own unit, and keeps the listed order until pressed", () => {
    expect(html.match(/aria-sort="none"/g)).toHaveLength(1);
    expect(html.indexOf("Fighter aircraft")).toBeLessThan(html.indexOf("Aircraft carriers"));
  });
});
