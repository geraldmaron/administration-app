import { describe, expect, it } from "vitest";
import { US_ID, WHITE_HOUSE_STAFF_ROLE_IDS, type RoleId } from "@admin/world";
import { differenceFromSeated, rankBench, seatedDifferenceLine } from "./bench-ranking";
import { DEFAULT_SEED, foundingOptions, openingChoices, runningMateSlate, staffSlate } from "./founding-options";

const options = foundingOptions(DEFAULT_SEED);
const bench = options.pool.filter(
  (person) => person.nationality === US_ID && person.eligibleRoles.includes("role-treasury-minister" as RoleId),
);

const democrat = { party: "democrat" as const, ideology: { economicLeftRight: -0.3, authLibertarian: -0.1, nationalistGlobalist: -0.2 } };
const independent = { party: "independent" as const, ideology: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 } };

describe("a bench ranked for the President choosing from it", () => {
  it("leads with the President's own party, and flags everyone across the aisle", () => {
    const ranked = rankBench(bench, democrat);
    const firstCrossing = ranked.findIndex((candidate) => candidate.crossesTheAisle);
    expect(firstCrossing).toBeGreaterThan(0);
    for (const candidate of ranked.slice(0, firstCrossing)) expect(candidate.person.party).toBe("party-usa-democrat");
    for (const candidate of ranked.slice(firstCrossing)) expect(candidate.crossesTheAisle).toBe(true);
    for (let i = 1; i < firstCrossing; i += 1) expect(ranked[i - 1]!.fit).toBeGreaterThanOrEqual(ranked[i]!.fit);
  });

  it("reads every fit as a band a card can print", () => {
    for (const candidate of rankBench(bench, democrat)) {
      expect(["strong", "good", "fair", "poor"]).toContain(candidate.band);
      expect(candidate.fit).toBeGreaterThanOrEqual(0);
      expect(candidate.fit).toBeLessThanOrEqual(1);
    }
    expect(rankBench(bench, democrat)[0]!.band).not.toBe("poor");
  });

  it("ranks an Independent President's bench on politics and competence alone", () => {
    const ranked = rankBench(bench, independent);
    for (let i = 1; i < ranked.length; i += 1) expect(ranked[i - 1]!.fit).toBeGreaterThanOrEqual(ranked[i]!.fit);
    expect(ranked).toHaveLength(bench.length);
  });
});

describe("the founding's ticket and staff slates", () => {
  const choices = openingChoices(options);

  it("offers a running mate shortlist on the President's own ticket", () => {
    const slate = runningMateSlate(options, choices);
    expect(slate.length).toBeGreaterThan(0);
    for (const candidate of slate) expect(candidate.person.party).toBe("party-usa-democrat");
  });

  it("never offers someone already named for another post", () => {
    const mate = runningMateSlate(options, choices)[0]!.person.id;
    for (const post of WHITE_HOUSE_STAFF_ROLE_IDS) {
      const slate = staffSlate(options, { ...choices, runningMate: mate }, post);
      expect(slate.length, post).toBeGreaterThan(0);
      expect(slate.map((candidate) => candidate.person.id), post).not.toContain(mate);
      for (const id of Object.values(choices.cabinet)) expect(slate.map((candidate) => candidate.person.id)).not.toContain(id);
    }
  });
});

describe("where a candidate parts from the person already seated", () => {
  const seated = { ...bench[0]!, competence: 0.7, loyalty: 0.9, integrity: 0.6, charisma: 0.5, ambition: 0.4 };

  it("names the graded reading furthest from the seated one, in their verdict words", () => {
    const candidate = { ...seated, loyalty: 0.3, integrity: 0.5 };
    const difference = differenceFromSeated(candidate, seated);
    expect(difference).toEqual({ label: "Loyalty", word: "Weak", seatedWord: "Strong", steps: -2 });
    expect(seatedDifferenceLine(difference!)).toBe("Loyalty: Weak (once in office: Strong)");
  });

  it("says nothing when every graded reading lands on the same word", () => {
    expect(differenceFromSeated({ ...seated, loyalty: 0.8 }, seated)).toBeUndefined();
    expect(differenceFromSeated(seated, seated)).toBeUndefined();
  });

  it("never leads with ambition, which is a pressure and not a grade", () => {
    expect(differenceFromSeated({ ...seated, ambition: 0.95 }, seated)).toBeUndefined();
  });
});
