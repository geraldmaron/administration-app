import { describe, expect, it } from "vitest";
import { vitalCohortEdges } from "./vital-edges.js";

describe("vitalCohortEdges — cost of living", () => {
  it("stamps nothing when the reading never crosses a threshold", () => {
    const effects = vitalCohortEdges(1, { costOfLiving: 1.0, crimeIndex: 0.2 }, { costOfLiving: 1.02, crimeIndex: 0.2 });
    expect(effects).toHaveLength(0);
  });

  it("stamps the class cohorts on the 1.05 edge, income-struggling hardest", () => {
    const effects = vitalCohortEdges(5, { costOfLiving: 1.02, crimeIndex: 0.2 }, { costOfLiving: 1.06, crimeIndex: 0.2 });
    const byCohort = Object.fromEntries(effects.map((e) => [e.cohort, e.addStrain!.weight]));
    expect(byCohort["income-struggling"]!).toBeGreaterThan(byCohort["income-comfortable"]!);
    expect(byCohort["income-comfortable"]!).toBeGreaterThan(byCohort["income-affluent"]!);
    for (const effect of effects) {
      expect(effect.addStrain!.valence).toBe(-1);
      expect(effect.addStrain!.createdTurn).toBe(5);
      expect(effect.addStrain!.cause).toBe("cost-of-living-edge:1.05");
    }
  });

  it("stamps twice as hard on the 1.12 edge as the 1.05 edge, at the same starting point", () => {
    const first = vitalCohortEdges(1, { costOfLiving: 1.0, crimeIndex: 0.2 }, { costOfLiving: 1.06, crimeIndex: 0.2 });
    const second = vitalCohortEdges(1, { costOfLiving: 1.0, crimeIndex: 0.2 }, { costOfLiving: 1.2, crimeIndex: 0.2 });
    const weight = (effects: readonly (typeof first)[number][]) =>
      effects.filter((e) => e.cohort === "income-struggling").reduce((sum, e) => sum + e.addStrain!.weight, 0);
    expect(weight(second)).toBeGreaterThan(weight(first));
  });

  it("does not restamp while the reading merely holds above the threshold", () => {
    const effects = vitalCohortEdges(9, { costOfLiving: 1.06, crimeIndex: 0.2 }, { costOfLiving: 1.07, crimeIndex: 0.2 });
    expect(effects.filter((e) => e.addStrain!.cause.startsWith("cost-of-living"))).toHaveLength(0);
  });

  it("does not fire on a decline back below a threshold it already crossed", () => {
    const effects = vitalCohortEdges(9, { costOfLiving: 1.06, crimeIndex: 0.2 }, { costOfLiving: 1.02, crimeIndex: 0.2 });
    expect(effects.filter((e) => e.addStrain!.cause.startsWith("cost-of-living"))).toHaveLength(0);
  });
});

describe("vitalCohortEdges — against the country's ordinary price path", () => {
  it("stamps nothing when prices rise only as fast as they usually do, however far the index has come", () => {
    const effects = vitalCohortEdges(
      200,
      { costOfLiving: 1.1, crimeIndex: 0.2 },
      { costOfLiving: 1.13, crimeIndex: 0.2 },
      { before: 1.1, after: 1.13 },
    );
    expect(effects).toHaveLength(0);
  });

  it("stamps the first edge when prices run five percent ahead of their ordinary path", () => {
    const effects = vitalCohortEdges(
      200,
      { costOfLiving: 1.15, crimeIndex: 0.2 },
      { costOfLiving: 1.17, crimeIndex: 0.2 },
      { before: 1.1, after: 1.11 },
    );
    expect(effects.map((effect) => effect.addStrain!.cause)).toContain("cost-of-living-edge:1.05");
    expect(effects.map((effect) => effect.addStrain!.cause)).not.toContain("cost-of-living-edge:1.12");
  });
});

describe("vitalCohortEdges — crime", () => {
  it("stamps the place cohorts on the crime edge, urban hardest", () => {
    const effects = vitalCohortEdges(3, { costOfLiving: 1.0, crimeIndex: 0.3 }, { costOfLiving: 1.0, crimeIndex: 0.45 });
    const byCohort = Object.fromEntries(effects.map((e) => [e.cohort, e.addStrain!.weight]));
    expect(byCohort.urban!).toBeGreaterThan(byCohort.suburban!);
    expect(byCohort.suburban!).toBeGreaterThan(byCohort.rural!);
    for (const effect of effects) expect(effect.addStrain!.cause).toBe("crime-index-edge");
  });

  it("does not restamp while crime merely holds above its edge", () => {
    const effects = vitalCohortEdges(9, { costOfLiving: 1.0, crimeIndex: 0.45 }, { costOfLiving: 1.0, crimeIndex: 0.46 });
    expect(effects).toHaveLength(0);
  });
});

describe("vitalCohortEdges — the one channel a vital reaches a cohort through", () => {
  it("emits only cohort effects — no state, no metric, no opinion effect of its own", () => {
    const effects = vitalCohortEdges(1, { costOfLiving: 1.0, crimeIndex: 0.2 }, { costOfLiving: 1.06, crimeIndex: 0.45 });
    expect(effects.length).toBeGreaterThan(0);
    for (const effect of effects) expect(effect.kind).toBe("cohort");
  });

  it("both edges can fire the same turn without interfering", () => {
    const effects = vitalCohortEdges(1, { costOfLiving: 1.0, crimeIndex: 0.2 }, { costOfLiving: 1.06, crimeIndex: 0.45 });
    const causes = new Set(effects.map((e) => e.addStrain!.cause));
    expect(causes.has("cost-of-living-edge:1.05")).toBe(true);
    expect(causes.has("crime-index-edge")).toBe(true);
  });
});
