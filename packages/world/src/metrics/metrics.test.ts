import { describe, expect, it } from "vitest";
import { resample } from "./aggregate.js";
import { checkComparison } from "./compatibility.js";
import {
  ALL_METRIC_DEFINITIONS as D,
  REFERENCE_DEFINITIONS as R,
  SIMULATED_DEFINITIONS as S,
  WORLD_DEFINITIONS as W,
  WORLD_DEFINITIONS,
  type MetricDefinition,
} from "./definitions.js";
import { MetricObservation, valueOf } from "./observation.js";
import {
  WORLD_REFERENCE_MANIFEST,
  WORLD_REFERENCE_OBSERVATIONS,
  worldWindow,
} from "./world-pack.js";
import {
  US_REFERENCE_MANIFEST,
  US_REFERENCE_OBSERVATIONS,
  referenceWindow,
} from "./reference-pack.js";

const def = (
  id: string,
  over: Partial<MetricDefinition>,
): MetricDefinition => ({ ...D["us.unemployment"]!, id, ...over });

describe("checking a comparison", () => {
  it("accepts a series against itself", () => {
    expect(
      checkComparison(R["us.unemployment"]!, R["us.unemployment"]!),
    ).toEqual({ status: "compatible" });
  });

  it("brings the campaign's unemployment fraction to the agency's percent and weekly to monthly, by declared steps", () => {
    const verdict = checkComparison(
      S["sim.unemployment"]!,
      R["us.unemployment"]!,
    );
    expect(verdict.status).toBe("transform");
    if (verdict.status === "transform") {
      expect(verdict.approximate).toBe(false);
      expect(verdict.steps.join(" ")).toMatch(/multiply the fraction by 100/);
      expect(verdict.steps.join(" ")).toMatch(
        /last weekly reading in each monthly period/,
      );
    }
  });

  it("marks reading an annual rate as a twelve-month change as approximate", () => {
    const verdict = checkComparison(S["sim.inflation"]!, R["us.inflation"]!);
    expect(verdict).toMatchObject({ status: "transform", approximate: true });
  });

  it("refuses real against nominal, different denominators, other concepts and mismatched index bases", () => {
    expect(
      checkComparison(
        S["sim.growth"]!,
        def("x", {
          concept: "output-growth",
          kind: "rate",
          priceBasis: "nominal",
          denominator: S["sim.growth"]!.denominator,
        }),
      ),
    ).toMatchObject({
      status: "incompatible",
      reason: expect.stringMatching(/real.*nominal/),
    });
    expect(
      checkComparison(
        R["us.unemployment"]!,
        def("y", { denominator: "population" }),
      ),
    ).toMatchObject({
      status: "incompatible",
      reason: expect.stringMatching(/denominators/),
    });
    expect(checkComparison(R["us.unemployment"]!, R["us.cpi"]!)).toMatchObject({
      status: "incompatible",
      reason: expect.stringMatching(/measures/),
    });
    expect(
      checkComparison(R["us.cpi"]!, {
        ...R["us.cpi"]!,
        id: "z",
        indexBase: "2015=100",
      }),
    ).toMatchObject({
      status: "incompatible",
      reason: expect.stringMatching(/bases/),
    });
  });

  it("refuses seasonally adjusted against not adjusted, and a coarser series read finer", () => {
    expect(
      checkComparison(
        R["us.unemployment"]!,
        def("na", { adjustment: "not-adjusted" }),
      ),
    ).toMatchObject({ status: "incompatible" });
    expect(
      checkComparison(R["us.gdp-growth"]!, {
        ...R["us.gdp-growth"]!,
        id: "g",
        frequency: "monthly",
      }),
    ).toMatchObject({ status: "transform" });
    expect(
      checkComparison(
        def("q", { frequency: "quarterly" }),
        def("m", { frequency: "monthly", kind: "rate" }),
      ).status,
    ).toBe("transform");
  });

  it("never offers a transform that invents observations", () => {
    expect(() => resample(R["us.unemployment"]!, [], "weekly")).toThrow(
      /without inventing/,
    );
  });
});

describe("the offline United States reference pack", () => {
  it("parses against the observation schema and keeps zero, gaps and values distinct", () => {
    for (const rows of Object.values(US_REFERENCE_OBSERVATIONS))
      for (const o of rows) MetricObservation.parse(o);
    const unemployment = US_REFERENCE_OBSERVATIONS["us.unemployment"]!;
    const october = unemployment.find((o) => o.period === "2025-10")!;
    expect(october.result.status).toBe("missing");
    expect(valueOf(october)).toBeUndefined();
    expect(valueOf(unemployment.find((o) => o.period === "2019-09")!)).toBe(
      3.5,
    );
  });

  it("declares coverage in its manifest that matches the data, for every definition", () => {
    expect(US_REFERENCE_MANIFEST.series.map((s) => s.metric).sort()).toEqual(
      Object.keys(R).sort(),
    );
    for (const s of US_REFERENCE_MANIFEST.series) {
      const rows = US_REFERENCE_OBSERVATIONS[s.metric]!;
      expect([s.coverage.first, s.coverage.last]).toEqual([
        rows[0]!.period,
        rows[rows.length - 1]!.period,
      ]);
    }
  });

  it("derives twelve-month inflation only where both months were published", () => {
    const inflation = US_REFERENCE_OBSERVATIONS["us.inflation"]!;
    expect(inflation.find((o) => o.period === "2025-10")!.result.status).toBe(
      "missing",
    );
    expect(inflation.find((o) => o.period === "2026-08")).toBeDefined();
    const jan2017 = inflation.find((o) => o.period === "2017-01")!;
    const cpi = (p: string) =>
      valueOf(
        US_REFERENCE_OBSERVATIONS["us.cpi"]!.find((o) => o.period === p)!,
      )!;
    expect(valueOf(jan2017)).toBeCloseTo(
      (cpi("2017-01") / cpi("2016-01") - 1) * 100,
      10,
    );
  });

  it("answers a window inside coverage and refuses one outside it, with the reason", () => {
    const ok = referenceWindow("us.unemployment", "2019-01", "2019-12");
    expect(ok.ok && ok.observations).toHaveLength(12);
    const quarterly = referenceWindow("us.gdp-growth", "2019-01", "2019-12");
    expect(quarterly.ok && quarterly.observations.map((o) => o.period)).toEqual(
      ["2019-Q1", "2019-Q2", "2019-Q3", "2019-Q4"],
    );
    const bad = referenceWindow("us.unemployment", "1973-01", "1982-12");
    expect(bad).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/outside it/),
    });
  });
});

describe("resampling by the series' own rule", () => {
  const unemployment = US_REFERENCE_OBSERVATIONS["us.unemployment"]!;

  it("takes a rate's last reading in a quarter rather than averaging it", () => {
    const quarterly = resample(
      { ...R["us.unemployment"]!, frequency: "monthly" },
      unemployment.filter((o) => o.period.startsWith("2019")),
      "quarterly",
    );
    expect(quarterly.map((o) => o.period)).toEqual([
      "2019-Q1",
      "2019-Q2",
      "2019-Q3",
      "2019-Q4",
    ]);
    expect(valueOf(quarterly[0]!)).toBe(3.8);
  });

  it("sums a flow across a quarter and leaves a quarter missing when a month is", () => {
    const flow = {
      ...R["us.unemployment"]!,
      kind: "flow" as const,
      reference: "period-total" as const,
      unit: "count" as const,
    };
    const mk = (period: string, value?: number): MetricObservation => ({
      ...unemployment[0]!,
      id: period,
      period,
      result:
        value === undefined
          ? { status: "missing" }
          : { status: "value", value },
    });
    const out = resample(
      flow,
      [
        mk("2020-01", 1),
        mk("2020-02", 2),
        mk("2020-03", 3),
        mk("2020-04", 1),
        mk("2020-05"),
        mk("2020-06", 3),
      ],
      "quarterly",
    );
    expect(valueOf(out[0]!)).toBe(6);
    expect(out[1]!.result.status).toBe("missing");
  });

  it("drops a period the series does not cover in full", () => {
    const out = resample(
      R["us.unemployment"]!,
      unemployment.filter((o) => o.period <= "2019-02"),
      "quarterly",
    );
    expect(out.map((o) => o.period)).not.toContain("2019-Q1");
  });
});

describe("the World Bank reference pack", () => {
  it("parses, names the license and the entities, and matches its manifest coverage", () => {
    for (const byCountry of Object.values(WORLD_REFERENCE_OBSERVATIONS))
      for (const rows of Object.values(byCountry))
        for (const o of rows) MetricObservation.parse(o);
    expect(WORLD_REFERENCE_MANIFEST.license).toMatch(
      /Creative Commons Attribution 4\.0/,
    );
    expect(WORLD_REFERENCE_MANIFEST.entities).toEqual([
      "USA",
      "GBR",
      "DEU",
      "FRA",
      "JPN",
      "CAN",
    ]);
    expect(WORLD_REFERENCE_MANIFEST.series.map((s) => s.metric).sort()).toEqual(
      Object.keys(WORLD_DEFINITIONS).sort(),
    );
    const unemployment = WORLD_REFERENCE_MANIFEST.series.find(
      (s) => s.metric === "wb.unemployment",
    )!;
    expect(unemployment.coverage.first).toBe("1991");
  });

  it("holds the published figures it was vendored with", () => {
    const at = (metric: string, country: string, year: string) =>
      valueOf(
        WORLD_REFERENCE_OBSERVATIONS[metric]![country]!.find(
          (o) => o.period === year,
        )!,
      );
    expect(at("wb.unemployment", "USA", "2020")).toBeCloseTo(8.055, 3);
    expect(at("wb.inflation", "USA", "2022")).toBeCloseTo(8.0028, 3);
    expect(at("wb.gdp-growth", "USA", "2020")).toBeCloseTo(-2.0814, 3);
  });

  it("marks the ILO unemployment figure as an estimate and the other two as observed", () => {
    expect(
      WORLD_REFERENCE_OBSERVATIONS["wb.unemployment"]!.USA![0]!.evidence,
    ).toBe("estimated-reference");
    expect(
      WORLD_REFERENCE_OBSERVATIONS["wb.inflation"]!.USA![0]!.evidence,
    ).toBe("observed-reference");
  });

  it("answers a window inside a country's coverage and refuses one outside it, with the covered range", () => {
    const ok = worldWindow("wb.inflation", "GBR", "1973", "1982");
    expect(ok.ok && ok.observations).toHaveLength(10);
    expect(worldWindow("wb.unemployment", "GBR", "1973", "1982")).toMatchObject(
      { ok: false, reason: expect.stringMatching(/covers 1991 to/) },
    );
    expect(worldWindow("wb.inflation", "XXX", "1973", "1982")).toMatchObject({
      ok: false,
    });
  });

  it("sets countries beside each other in the same series, and refuses to mix a World Bank line with an agency line", () => {
    for (const id of Object.keys(WORLD_DEFINITIONS))
      expect(checkComparison(W[id]!, W[id]!)).toEqual({ status: "compatible" });
    expect(
      checkComparison(W["wb.unemployment"]!, R["us.unemployment"]!),
    ).toMatchObject({ status: "incompatible" });
    expect(
      checkComparison(W["wb.inflation"]!, R["us.inflation"]!),
    ).toMatchObject({
      status: "incompatible",
      reason: expect.stringMatching(
        /annual-change.*change-on-year-earlier|change-on-year-earlier.*annual-change/,
      ),
    });
    expect(
      checkComparison(W["wb.gdp-growth"]!, R["us.gdp-growth"]!),
    ).toMatchObject({ status: "incompatible" });
  });
});

describe("scores the game invents have no history to compare with", () => {
  const stability: MetricDefinition = {
    id: "sim.stability",
    label: "Stability",
    concept: "regime-stability",
    definition: "A zero-to-one composite the campaign computes.",
    kind: "modeled-score",
    unit: "fraction",
    frequency: "weekly",
    reference: "point",
    adjustment: "not-applicable",
    priceBasis: "not-applicable",
    scope: "national",
    origin: "simulated",
  };

  it("refuses a modeled score against every published series, whatever year it is offered against", () => {
    for (const reference of [...Object.values(R), ...Object.values(W)]) {
      expect(checkComparison(stability, reference).status, reference.id).toBe(
        "incompatible",
      );
    }
  });

  it("holds no published definition that is itself a modeled score", () => {
    for (const def of [...Object.values(R), ...Object.values(W)]) {
      expect(def.kind).not.toBe("modeled-score");
      expect(def.origin).toBe("reference");
    }
  });
});
