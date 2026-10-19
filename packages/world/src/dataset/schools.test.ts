import { describe, expect, it } from "vitest";
import { almaMatersFor, schools, schoolsFor, SCHOOL_NATIONS, schoolById } from "./schools.js";
import { worldNations } from "./nations.js";

describe("the school catalogue", () => {
  // The whole point of throwing in `schoolsFor` rather than falling back: a
  // missing nation must be a build failure, not a country whose entire
  // government quietly graduates from somewhere else's list.
  it("covers every nation in the world", () => {
    const missing = worldNations.filter((nation) => {
      try {
        return schoolsFor(nation.id as string).length === 0;
      } catch {
        return true;
      }
    });
    expect(missing.map((n) => n.id)).toEqual([]);
  });

  it("refuses a nation it does not cover", () => {
    expect(() => schoolsFor("ZZZ")).toThrow(/no schools authored/);
  });

  it("gives every school a unique id", () => {
    expect(new Set(schools.map((s) => s.id)).size).toBe(schools.length);
  });

  it("files every school under a real nation", () => {
    const real = new Set(SCHOOL_NATIONS);
    for (const school of schools) expect(real.has(school.nation as string)).toBe(true);
  });

  it("indexes every school by id", () => {
    for (const school of schools) expect(schoolById.get(school.id as string)).toBe(school);
  });

  // A school with no field is one nobody can graduate in a subject from, which
  // would strand the education draw.
  it("says what every school is known for", () => {
    for (const school of schools) expect(school.fields.length).toBeGreaterThan(0);
  });

  // A country whose only school is a military academy would produce a cabinet
  // of officers by construction rather than by simulation.
  it("gives every nation at least one civilian school", () => {
    for (const nation of SCHOOL_NATIONS) {
      const civilian = schoolsFor(nation).filter((s) => s.tier !== "service-academy");
      expect(civilian.length, `${nation} has only service academies`).toBeGreaterThan(0);
    }
  });
});

describe("the founding list of alma maters", () => {
  it("offers a President more schools than the cast is drawn from, every one of them known by id", () => {
    const cast = schoolsFor("USA");
    const choices = almaMatersFor("USA");
    expect(choices.length).toBeGreaterThan(cast.length * 3);
    expect(choices.slice(0, cast.length)).toEqual(cast);
    for (const school of choices) expect(schoolById.get(school.id as string)).toBe(school);
  });

  it("leaves a nation without a founding list on its cast's schools", () => {
    expect(almaMatersFor("FRA")).toEqual(schoolsFor("FRA"));
  });
});
