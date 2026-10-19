import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { seasonWeight } from "./condition-seasons.js";
import { onsetCandidates } from "./condition-onset.js";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const USA = "USA" as NationId;
const AUSTRALIA = "AUS" as NationId;

function meanWeight(kind: "cyclone" | "flood", latitude: number): number {
  const total = MONTHS.reduce((sum, month) => sum + seasonWeight(kind, month, latitude), 0);
  return total / MONTHS.length;
}

describe("hurricane season", () => {
  it("is shut outside June through November in the northern hemisphere", () => {
    for (const month of [12, 1, 2, 3, 4, 5]) expect(seasonWeight("cyclone", month, 38.9)).toBe(0);
    for (const month of [6, 7, 8, 9, 10, 11]) expect(seasonWeight("cyclone", month, 38.9)).toBe(2);
  });

  it("flips the window six months south of the equator", () => {
    expect(seasonWeight("cyclone", 1, -35.28)).toBe(2);
    expect(seasonWeight("cyclone", 7, -35.28)).toBe(0);
    expect(seasonWeight("cyclone", 1, -35.28)).toBe(seasonWeight("cyclone", 7, 38.9));
  });

  it("averages to 1 across the twelve months, so the annual rate is unchanged", () => {
    expect(meanWeight("cyclone", 38.9)).toBe(1);
    expect(meanWeight("cyclone", -35.28)).toBe(1);
    expect(meanWeight("flood", 38.9)).toBe(1);
    expect(seasonWeight("wildfire", 1, 38.9)).toBe(1);
  });
});

describe("onset multiplies the hurricane weight and adds no draw", () => {
  const { campaign: founded } = foundedForBalance("condition-seasons");
  const inMonth = (month: number) => ({ ...founded, calendar: { ...founded.calendar, month } });
  const hurricane = (month: number, nation: NationId) =>
    onsetCandidates(inMonth(month)).find((candidate) => candidate.nation === nation && candidate.kind === "cyclone");

  it("gives a January hurricane candidate in the United States weight 0", () => {
    expect(hurricane(1, USA)?.chance ?? 0).toBe(0);
  });

  it("keeps a July hurricane in the United States and a January hurricane in Australia", () => {
    expect(hurricane(7, USA)?.chance ?? 0).toBeGreaterThan(0);
    expect(hurricane(1, AUSTRALIA)?.chance ?? 0).toBeGreaterThan(0);
  });
});
