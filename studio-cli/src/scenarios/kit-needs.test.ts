import { describe, expect, it } from "vitest";
import { parseCell } from "../cli.js";
import { readPlayerBundleBodies } from "../corpus/player-bundle.js";
import { CONTESTED_ISSUES, kitNeeds, suggestCells } from "./kit-needs.js";
import { repoRoot } from "./reference.js";

const bodies = readPlayerBundleBodies(repoRoot());

describe("the corpus needs", () => {
  it("reads the corpus the game ships", () => {
    expect(bodies.length).toBeGreaterThan(0);
  });

  it("suggests cells a job command accepts, war cells cast on the war", () => {
    const cells = suggestCells(bodies);
    expect(cells.length).toBeGreaterThan(0);
    for (const { cell } of cells) expect(() => parseCell(cell)).not.toThrow();
    for (const { cell } of cells.filter(({ cell }) => cell.startsWith("war:"))) expect(cell).toMatch(/^war:warCounterpart:/);
  });

  it("is the same text for the same corpus and names every contested issue as not open", () => {
    const needs = kitNeeds(bodies);
    expect(kitNeeds(bodies)).toBe(needs);
    expect(needs).toContain("## Not yet: contested issues");
    for (const issue of CONTESTED_ISSUES) expect(needs).toContain(`- ${issue}`);
  });
});
