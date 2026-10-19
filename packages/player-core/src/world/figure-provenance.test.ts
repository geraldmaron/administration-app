import { describe, expect, it } from "vitest";
import { NATION_FIGURES } from "@admin/world";
import { figureProvenance } from "./figure-provenance.js";

describe("figureProvenance", () => {
  it("says nothing for a country the dataset states in full", () => {
    expect(figureProvenance("USA")).toBeUndefined();
    expect(figureProvenance("ISL")).toBeUndefined();
  });

  it("names the sources, the year, the estimates and the missing brief for a thin country", () => {
    const tuvalu = NATION_FIGURES.TUV!;
    const line = figureProvenance("TUV")!;
    expect(line).toContain("World Bank");
    expect(line).toContain(`from ${tuvalu.provenance.vintage}`);
    expect(line).toContain(`${tuvalu.provenance.priors.length} numbers have no source, so they're estimates based on its region.`);
    expect(line).toContain("It doesn't have a full background brief yet.");
  });

  it("says a standard record's aims are researched rather than its region's", () => {
    const line = figureProvenance("FIN", "standard")!;
    expect(line).toContain("goals, its red line, and which side it leans toward are researched");
    expect(line).not.toContain("We haven't researched");
  });
});
