import { describe, expect, it } from "vitest";
import { actSearchOf, parseActConfig } from "./config";

describe("an act's settings in the address", () => {
  it("reads every setting an address can carry", () => {
    expect(parseActConfig({ goal: "force", option: "military-3", count: "4", support: "seek", partners: "GBR,FRA", strikeObjective: "logistics", civilianProtection: "additional-assessment" })).toEqual({
      goal: "force",
      option: "military-3",
      count: 4,
      support: "seek",
      partners: ["GBR", "FRA"],
      strikeObjective: "logistics",
      civilianProtection: "additional-assessment",
    });
  });

  it("reads a tariff's goods and rate, and a standing thing to end", () => {
    expect(parseActConfig({ option: "tariff", sector: "steel", rate: 25 })).toEqual({ option: "tariff", sector: "steel", rate: 25 });
    expect(parseActConfig({ manage: "tariff:MEX:steel:3" })).toEqual({ manage: "tariff:MEX:steel:3" });
  });

  it("drops what it cannot make sense of", () => {
    expect(parseActConfig({ goal: "conquest", option: "nonsense", count: "-2", support: "maybe", strikeObjective: "all", civilianProtection: "none", partners: "" })).toEqual({});
  });

  it("canonicalizes old generic tariff links while preserving selected terms", () => {
    expect(parseActConfig({ option: "economic-2", sector: "steel", rate: "15" })).toEqual({ option: "tariff", sector: "steel", rate: 15 });
  });

  it("retains invalid explicit rates for validation instead of silently using a default", () => {
    for (const rate of [0, -5, 1.5, 101]) expect(parseActConfig({ option: "tariff", rate }).rate).toBe(rate);
    expect(parseActConfig({ option: "tariff", rate: "abc" }).rate).toBeNaN();
    expect(parseActConfig({ option: "tariff", sector: "" }).sector).toBe("");
    expect(parseActConfig({ option: "tariff", sector: 123 }).sector).toBe("");
  });

  it("round-trips through the address", () => {
    const config = parseActConfig({ goal: "trade", option: "tariff", sector: "steel", rate: "15" });
    expect(parseActConfig(actSearchOf(config))).toEqual(config);
  });
});
