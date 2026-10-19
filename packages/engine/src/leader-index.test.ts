import { describe, expect, it } from "vitest";
import type { NationId, PersonId, RoleId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { foreignLeaderFor, leadRoleFor, tableIncumbentId } from "./foreign-leader.js";
import { leaderPersonalityOn, nationalsOf, rememberedLeader, rememberedRapport, withoutLeaderPersonality } from "./leader-index.js";
import type { Campaign, PersonRuntime } from "./state.js";

const { campaign } = foundedForBalance("leader-index");
const abroad = (Object.keys(campaign.nations) as NationId[]).filter((id) => id !== campaign.founding.nation);

/** The leader as the whole-cast scan the index replaced read them, kept here as the reference. */
function scanned(state: Campaign, nation: NationId): string | undefined {
  const lead = leadRoleFor(state, nation)!;
  const incumbent = tableIncumbentId(nation, lead);
  const rank = (runtime: PersonRuntime): number =>
    (runtime.currentRole === lead ? 2 : 0) + ((runtime.base.id as string) === incumbent ? 1 : 0);
  return Object.values(state.people)
    .filter((r) => r.alive && r.base.nationality === nation && (r.currentRole === lead || r.base.eligibleRoles.includes(lead)))
    .sort((a, b) => rank(b) - rank(a) || b.base.competence - a.base.competence)[0]?.base.id as string | undefined;
}

function withDead(state: Campaign, person: string): Campaign {
  const runtime = state.people[person as keyof Campaign["people"]]!;
  return { ...state, people: { ...state.people, [person]: { ...runtime, alive: false } } };
}

describe("the cast indexed by country", () => {
  it("names the same leader the whole-cast scan named, for every government abroad", () => {
    for (const nation of abroad) expect(foreignLeaderFor(campaign, nation)?.person as string | undefined, nation).toBe(scanned(campaign, nation));
  });

  it("reads a new cast afresh: the week a leader dies, their successor leads", () => {
    const nation = "DEU" as NationId;
    const before = foreignLeaderFor(campaign, nation)!.person;
    const after = withDead(campaign, before as string);
    const successor = foreignLeaderFor(after, nation)!.person;
    expect(successor).not.toBe(before);
    expect(successor as string).toBe(scanned(after, nation));
    expect(foreignLeaderFor(campaign, nation)!.person).toBe(before);
  });

  it("holds everyone of one nationality, living or not, in the cast's own order", () => {
    const nation = "JPN" as NationId;
    const expected = Object.values(campaign.people).filter((r) => r.base.nationality === nation);
    expect(nationalsOf(campaign, nation)).toEqual(expected);
    expect(nationalsOf(campaign, "ZZZ" as NationId)).toEqual([]);
  });

  it("works a leader and a rapport out once per cast, however often they are asked for", () => {
    const state = { ...campaign, people: { ...campaign.people } };
    let leaderReads = 0;
    let rapportReads = 0;
    const lead = "role-head" as RoleId;
    for (let i = 0; i < 3; i += 1) {
      rememberedLeader(state, "FRA" as NationId, lead as string, () => {
        leaderReads += 1;
        return undefined;
      });
      rememberedRapport(state, "PER-A" as PersonId, "PER-B" as PersonId, () => {
        rapportReads += 1;
        return 0.25;
      });
    }
    expect([leaderReads, rapportReads]).toEqual([1, 1]);
  });
});

describe("switching foreign leaders' character off for a measurement", () => {
  it("is off only inside the run, and back on after it, thrown or not", () => {
    expect(leaderPersonalityOn()).toBe(true);
    expect(withoutLeaderPersonality(() => leaderPersonalityOn())).toBe(false);
    expect(leaderPersonalityOn()).toBe(true);
    expect(() =>
      withoutLeaderPersonality(() => {
        throw new Error("measurement failed");
      }),
    ).toThrow("measurement failed");
    expect(leaderPersonalityOn()).toBe(true);
  });
});
