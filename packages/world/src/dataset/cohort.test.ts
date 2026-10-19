import { describe, expect, it } from "vitest";
import { COHORT_AXES, COHORT_AXIS, COHORT_IDS, cohortsOfAxis } from "../schemas/cohort.js";
import { StateCohortMix } from "../schemas/state.js";

describe("the twenty-nine cohorts and their ten axes", () => {
  it("names an axis for every declared cohort, and no other keys", () => {
    expect(Object.keys(COHORT_AXIS).sort()).toEqual([...COHORT_IDS].sort());
  });

  it("only ever names an axis the schema declares", () => {
    for (const cohort of COHORT_IDS) {
      expect(COHORT_AXES).toContain(COHORT_AXIS[cohort]);
    }
  });

  it("partitions the twenty-nine cohorts across the ten axes with no overlap and no gap", () => {
    const cells = COHORT_AXES.flatMap((axis) => cohortsOfAxis(axis));
    expect(cells.sort()).toEqual([...COHORT_IDS].sort());
  });

  it("derives axis membership from COHORT_AXIS rather than a second list", () => {
    for (const axis of COHORT_AXES) {
      for (const cohort of cohortsOfAxis(axis)) {
        expect(COHORT_AXIS[cohort]).toBe(axis);
      }
    }
  });

  it("keeps age, class and place at three cells and schooling at two", () => {
    expect(cohortsOfAxis("age")).toHaveLength(3);
    expect(cohortsOfAxis("class")).toHaveLength(3);
    expect(cohortsOfAxis("schooling")).toHaveLength(2);
    expect(cohortsOfAxis("place")).toHaveLength(3);
    expect(cohortsOfAxis("work")).toHaveLength(5);
  });

  it("holds race at five cells and sex, nativity, disability and veteran status at two", () => {
    expect(cohortsOfAxis("race")).toHaveLength(5);
    for (const axis of ["sex", "nativity", "disability", "veteran"] as const) expect(cohortsOfAxis(axis)).toHaveLength(2);
    expect(COHORT_IDS).toHaveLength(29);
  });

  it("names no religion axis: there is no Census source for one", () => {
    expect(COHORT_AXES as readonly string[]).not.toContain("religion");
  });
});

describe("StateCohortMix", () => {
  const validMix = {
    age: { "age-under-35": 0.3, "age-35-64": 0.5, "age-65-plus": 0.2 },
    class: { "income-struggling": 0.3, "income-comfortable": 0.5, "income-affluent": 0.2 },
    schooling: { "no-degree": 0.6, degree: 0.4 },
    place: { urban: 0.3, suburban: 0.4, rural: 0.3 },
    work: {
      "goods-producing": 0.2,
      "frontline-services": 0.2,
      "professional-technical": 0.2,
      "public-and-uniformed": 0.2,
      "not-in-the-workforce": 0.2,
    },
    race: { "race-hispanic": 0.2, "race-black": 0.2, "race-asian": 0.2, "race-white": 0.2, "race-other": 0.2 },
    sex: { "sex-female": 0.5, "sex-male": 0.5 },
    nativity: { "foreign-born": 0.1, "us-born": 0.9 },
    disability: { "with-disability": 0.1, "no-disability": 0.9 },
    veteran: { veteran: 0.05, "non-veteran": 0.95 },
  };

  it("accepts a mix carrying exactly the twenty-nine declared cells", () => {
    expect(() => StateCohortMix.parse(validMix)).not.toThrow();
  });

  it("rejects an unknown cell within an axis", () => {
    const withExtra = { ...validMix, age: { ...validMix.age, "age-under-18": 0.1 } };
    expect(() => StateCohortMix.parse(withExtra)).toThrow();
  });

  it("rejects a missing cell within an axis", () => {
    const { "age-65-plus": _dropped, ...rest } = validMix.age;
    const withMissing = { ...validMix, age: rest };
    expect(() => StateCohortMix.parse(withMissing)).toThrow();
  });

  it("rejects an unknown axis", () => {
    const withExtraAxis = { ...validMix, religion: { a: 1 } };
    expect(() => StateCohortMix.parse(withExtraAxis)).toThrow();
  });
});

describe("the Census-based demographics table", () => {
  it("gives every state ten axes that each sum to one and no cell outside zero to one", async () => {
    const { worldStates } = await import("./states.js");
    expect(worldStates).toHaveLength(51);
    for (const state of worldStates) {
      for (const axis of COHORT_AXES) {
        const cells = Object.values(state.character.cohorts[axis] as Record<string, number>);
        expect(cells.reduce((a, b) => a + b, 0), `${state.id} ${axis}`).toBeCloseTo(1, 3);
        for (const share of cells) expect(share).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("matches what is publicly known at the extremes, within the approximation", async () => {
    const { stateById } = await import("./states.js");
    const cell = (id: string, axis: "race" | "nativity" | "disability" | "veteran", key: string) => (stateById.get(id)!.character.cohorts[axis] as Record<string, number>)[key]!;
    expect(cell("DC", "race", "race-black")).toBeGreaterThan(0.4);
    expect(cell("HI", "race", "race-asian")).toBeGreaterThan(0.3);
    expect(cell("ME", "race", "race-white")).toBeGreaterThan(0.9);
    expect(cell("CA", "nativity", "foreign-born")).toBeGreaterThan(0.25);
    expect(cell("WV", "nativity", "foreign-born")).toBeLessThan(0.03);
    expect(cell("WV", "disability", "with-disability")).toBeGreaterThan(0.18);
    expect(cell("AK", "veteran", "veteran")).toBeGreaterThan(cell("DC", "veteran", "veteran"));
  });

  it("holds the national totals to the published anchors, weighted by population", async () => {
    const { worldStates } = await import("./states.js");
    const total = worldStates.reduce((s, st) => s + st.population, 0);
    const mean = (axis: "nativity" | "disability", key: string) => worldStates.reduce((s, st) => s + st.population * (st.character.cohorts[axis] as Record<string, number>)[key]!, 0) / total;
    expect(mean("nativity", "foreign-born")).toBeCloseTo(0.143, 2);
    expect(mean("disability", "with-disability")).toBeCloseTo(0.136, 2);
  });
});
