import { describe, expect, it } from "vitest";
import {
  backgroundDrivers,
  personPoolSpecs,
  roleProfileByRole,
  schoolById,
  worldDataset,
  type Person,
} from "@admin/world";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { generateWorldPool } from "./people.js";
import { attributePositions } from "./bio.js";
import { ASSESSMENT_LINES, BECAUSE_FRAMES, type AssessmentCell } from "./person-assessment-lines.js";
import { driverPhrase, personAssessment } from "./person-assessment.js";

const cast = generateWorldPool(
  worldDataset.nations,
  personPoolSpecs,
  createRngStreams(makeCampaignSeed("assessment")),
  worldDataset.charters,
);

const seatOf = (person: Person) => person.eligibleRoles[0] as string;
const positionsOf = (person: Person) =>
  attributePositions(person, roleProfileByRole.get(seatOf(person))?.attributes);

describe("the reading for this chair", () => {
  it("says something about everybody the player can be handed", () => {
    for (const person of cast) {
      const { strengths, risks } = personAssessment(person);
      expect(strengths.length + risks.length, `${person.id as string} reads as nothing at all`).toBeGreaterThan(0);
      expect(strengths.length).toBeLessThanOrEqual(2);
      expect(risks.length).toBeLessThanOrEqual(2);
    }
  });

  // The defect this block replaces: one yardstick chose the strength and a
  // different one wrote the caption, so a person could be listed as strong and
  // weak in the same attribute on the same screen.
  it("never files one attribute on both sides of the same person", () => {
    for (const person of cast) {
      const { strengths, risks } = personAssessment(person);
      const named = [...strengths, ...risks].map((entry) => entry.attribute);
      expect(new Set(named).size, `${person.id as string} says two things about one reading`).toBe(named.length);
    }
  });

  it("files a reading on the side its placement in the seat's own window puts it", () => {
    for (const person of cast) {
      const positions = positionsOf(person);
      for (const entry of [...personAssessment(person).strengths, ...personAssessment(person).risks]) {
        const high = positions.get(entry.attribute)! >= 0.5;
        // Ambition is the inverted reading: the engine already calls anybody
        // past the standing floor a rival, so its high side is the president's
        // problem rather than their asset.
        const expected = entry.attribute === "ambition" ? (high ? "risk" : "strength") : high ? "strength" : "risk";
        expect(entry.tone, `${person.id as string} / ${entry.attribute}`).toBe(expected);
      }
    }
  });

  it("draws its sentence from the cell the placement actually landed in", () => {
    for (const person of cast) {
      const positions = positionsOf(person);
      for (const entry of [...personAssessment(person).strengths, ...personAssessment(person).risks]) {
        const cell: AssessmentCell = `${entry.attribute}:${positions.get(entry.attribute)! >= 0.5 ? "high" : "low"}`;
        expect(ASSESSMENT_LINES[cell], `${person.id as string} / ${cell}`).toContain(entry.reading);
      }
    }
  });

  /**
   * Cells no cast reaches, and why each is a fact about the derivation rather
   * than a hole in this module.
   *
   * Carried rather than merely tolerated, and checked in both directions: a
   * cell listed here that becomes reachable fails too, because a census nobody
   * maintains stops being a census.
   */
  const CARRIES_NOBODY: Readonly<Record<string, string>> = {
    "competence:low":
      "every career archetype, every field of study and every school tier in background.ts pushes competence up — " +
      "local-government's -0.2 is the only negative term among fourteen archetypes — so the lower half of every " +
      "seat's authored competence window is unreachable. Measured over a world cast: 0.3% of people land below the " +
      "midpoint, none at all below 0.35, and the floor is 0.444",
  };

  // Every other cell has to be reachable, or a bank is prose nobody is dealt.
  it("reaches every cell a cast can reach, and nothing more", () => {
    const seen = new Set<string>();
    for (const person of cast) {
      const positions = positionsOf(person);
      for (const entry of [...personAssessment(person).strengths, ...personAssessment(person).risks]) {
        seen.add(`${entry.attribute}:${positions.get(entry.attribute)! >= 0.5 ? "high" : "low"}`);
      }
    }
    const silent = Object.keys(ASSESSMENT_LINES).filter((cell) => !seen.has(cell));
    expect(silent.sort()).toEqual(Object.keys(CARRIES_NOBODY).sort());
  });
});

describe("the fact behind the reading", () => {
  // The clause has to be traceable to this person's own record and to the
  // direction the reading actually went — the same discipline the relationship
  // graph works under, where a tie nobody's record supports is not written.
  const supports = (person: Person, attribute: string, high: boolean, because: string): boolean => {
    const tier = schoolById.get(person.education.school as string)?.tier;
    return backgroundDrivers(person.education, person.career, tier, attribute as never)
      .filter((driver) => (high ? driver.weight > 0 : driver.weight < 0))
      .some((driver) => because.includes(driverPhrase(driver)));
  };

  it("names a fact the record holds, pushing the way the reading went", () => {
    let named = 0;
    for (const person of cast) {
      const positions = positionsOf(person);
      for (const entry of [...personAssessment(person).strengths, ...personAssessment(person).risks]) {
        if (entry.because === "") continue;
        const high = positions.get(entry.attribute)! >= 0.5;
        expect(
          supports(person, entry.attribute, high, entry.because),
          `${person.id as string} / ${entry.attribute}: ${entry.because}`,
        ).toBe(true);
        expect(entry.because).not.toContain("{fact}");
        named += 1;
      }
    }
    // A clause is owed to nearly everybody: a reading that landed off the
    // middle did so because something in the record pushed it there.
    expect(named).toBeGreaterThan(cast.length);
  });

  // A governor's charisma, ambition and integrity can all be largest-driven by
  // the same career, and a file that says "a career in business" three times
  // teaches the player nothing with the second and third.
  it("never blames two readings on one part of the record", () => {
    for (const person of cast) {
      const { strengths, risks } = personAssessment(person);
      const cited = [...strengths, ...risks].map((entry) => entry.because).filter((clause) => clause !== "");
      const facts = cited.map((clause) => clause.replace(/^[^{]*?(?:is|to|was) /, "").replace(/ showing\.$/, "."));
      expect(new Set(facts).size, `${person.id as string}: ${cited.join(" | ")}`).toBe(facts.length);
    }
  });

  it("frames the fact several ways, so a roster is not one sentence repeated", () => {
    expect(BECAUSE_FRAMES.length).toBeGreaterThanOrEqual(4);
    for (const frame of BECAUSE_FRAMES) expect(frame).toContain("{fact}");
  });
});

describe("as prose across a whole cast", () => {
  const lines = cast.flatMap((person) => {
    const { strengths, risks } = personAssessment(person);
    return [...strengths, ...risks].map((entry) => `${entry.reading} ${entry.because}`);
  });

  it("does not put one sentence on most of the government", () => {
    const counts = new Map<string, number>();
    for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1);
    const commonest = Math.max(...counts.values());
    expect(counts.size).toBeGreaterThan(200);
    expect(commonest / lines.length).toBeLessThan(0.05);
  });

  it("keeps every cell's bank deep enough to be worth drawing from", () => {
    for (const cell of Object.keys(ASSESSMENT_LINES) as AssessmentCell[]) {
      const bank = ASSESSMENT_LINES[cell];
      expect(bank.length, `${cell} is too shallow`).toBeGreaterThanOrEqual(6);
      expect(new Set(bank).size, `${cell} repeats itself`).toBe(bank.length);
    }
    const everything = (Object.keys(ASSESSMENT_LINES) as AssessmentCell[]).flatMap((cell) => ASSESSMENT_LINES[cell]);
    expect(new Set(everything).size, "one line is shared by two cells").toBe(everything.length);
  });

  it("is composed, not stored: the same person always reads the same way", () => {
    const person = cast.find((entry) => (entry.nationality as string) === "USA")!;
    expect(personAssessment(person)).toEqual(personAssessment(person));
  });

  // A candidate is weighed against the chair they do not hold yet, so the same
  // person read for two different seats is allowed — required — to read
  // differently.
  it("re-reads a person against whichever chair they are being weighed for", () => {
    const seats = [...roleProfileByRole.keys()];
    const person = cast.find((entry) => (entry.nationality as string) === "USA")!;
    const readings = new Set(
      seats.map((seat) => JSON.stringify(personAssessment(person, seat as string))),
    );
    expect(readings.size).toBeGreaterThan(1);
  });
});
