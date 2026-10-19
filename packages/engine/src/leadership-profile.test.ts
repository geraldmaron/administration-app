import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, US_ID, schoolsFor, type SchoolId } from "@admin/world";
import { composeLeader, defaultLeaderDraft, type LeaderDraft } from "./leader.js";
import { dispositionOf } from "./person-disposition.js";
import { scoreLeadershipAnswers, validLeadershipAnswers, withGoverningStyle } from "./leadership-profile.js";

function leader(overrides: Partial<LeaderDraft> = {}) {
  return composeLeader({ ...defaultLeaderDraft(), name: "Morgan Vale", ...overrides }, US_ID, "United States", CHARTER_USA_CONSTITUTION.cabinetRoles[0]!);
}

describe("leadership setup", () => {
  it("refuses unanswered, extra and out-of-range answers rather than counting them as neutral", () => {
    for (const values of [[], Array(19).fill(0), Array(21).fill(0), [...Array(19).fill(0), 2], [...Array(19).fill(0), NaN]]) {
      expect(validLeadershipAnswers({ version: 1, values })).toBe(false);
      expect(() => scoreLeadershipAnswers({ version: 1, values })).toThrow(/20/);
    }
  });
  it("takes graded answers anywhere between the ends under version 2, and only whole steps under version 1", () => {
    const graded = [...Array(19).fill(0), 0.4];
    expect(validLeadershipAnswers({ version: 1, values: graded })).toBe(false);
    expect(validLeadershipAnswers({ version: 2, values: graded })).toBe(true);
    for (const values of [[...Array(19).fill(0), 1.2], [...Array(19).fill(0), NaN], Array(19).fill(0.5)]) {
      expect(validLeadershipAnswers({ version: 2, values })).toBe(false);
    }
    const leaning = scoreLeadershipAnswers({ version: 2, values: [0.5, 0.5, 0.25, 0.75, ...Array(16).fill(0)] });
    expect(leaning.ideology.economicLeftRight).toBe(0.5);
  });
  it("keeps ideology polarity consistent with the engine and balances contrary answers", () => {
    const negative = scoreLeadershipAnswers({ version: 1, values: Array(20).fill(-1) });
    expect(negative.ideology).toEqual({ economicLeftRight: -1, authLibertarian: -1, nationalistGlobalist: -1 });
    expect(negative.style).toBe("dovish");
    const mixed = scoreLeadershipAnswers({ version: 1, values: Array.from({ length: 20 }, (_, i) => i % 2 ? 1 : -1) });
    expect(mixed.ideology).toEqual({ economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 });
    expect(mixed.style).toBe("cautious");
  });
  it("changes a real disposition consumer without buying an attribute bonus", () => {
    const hawk = leader({ governingStyle: "hawkish" });
    const dove = leader({ governingStyle: "dovish" });
    expect(hawk.ok && dove.ok).toBe(true);
    if (!hawk.ok || !dove.ok) return;
    expect(dispositionOf(hawk.person).forceAppetite).toBeGreaterThan(dispositionOf(dove.person).forceAppetite);
    for (const field of ["competence", "integrity", "charisma", "loyalty", "ambition"] as const) expect(hawk.person[field]).toBe(dove.person[field]);
    expect(withGoverningStyle(["hawkish", "loyal", "ambitious"], "dovish")).toEqual(["dovish", "loyal", "ambitious"]);
  });
  it("preserves a chosen school as biography without changing attributes, and refuses unknown schools", () => {
    const schoolId = schoolsFor("USA")[0]!.id;
    const chosen = leader({ schoolId });
    const original = leader();
    expect(chosen.ok && original.ok).toBe(true);
    if (!chosen.ok || !original.ok) return;
    expect(chosen.person.education.school).toBe(schoolId);
    expect(chosen.person.competence).toBe(original.person.competence);
    expect(chosen.person.integrity).toBe(original.person.integrity);
    expect(leader({ schoolId: "missing-school" as SchoolId }).ok).toBe(false);
    expect(chosen.person.traits).toEqual(original.person.traits);
  });
});
