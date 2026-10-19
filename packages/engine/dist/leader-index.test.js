import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { foreignLeaderFor, leadRoleFor, tableIncumbentId } from "./foreign-leader.js";
import { leaderPersonalityOn, nationalsOf, rememberedLeader, rememberedRapport, withoutLeaderPersonality } from "./leader-index.js";
const { campaign } = foundedForBalance("leader-index");
const abroad = Object.keys(campaign.nations).filter((id) => id !== campaign.founding.nation);
/** The leader as the whole-cast scan the index replaced read them, kept here as the reference. */
function scanned(state, nation) {
    const lead = leadRoleFor(state, nation);
    const incumbent = tableIncumbentId(nation, lead);
    const rank = (runtime) => (runtime.currentRole === lead ? 2 : 0) + (runtime.base.id === incumbent ? 1 : 0);
    return Object.values(state.people)
        .filter((r) => r.alive && r.base.nationality === nation && (r.currentRole === lead || r.base.eligibleRoles.includes(lead)))
        .sort((a, b) => rank(b) - rank(a) || b.base.competence - a.base.competence)[0]?.base.id;
}
function withDead(state, person) {
    const runtime = state.people[person];
    return { ...state, people: { ...state.people, [person]: { ...runtime, alive: false } } };
}
describe("the cast indexed by country", () => {
    it("names the same leader the whole-cast scan named, for every government abroad", () => {
        for (const nation of abroad)
            expect(foreignLeaderFor(campaign, nation)?.person, nation).toBe(scanned(campaign, nation));
    });
    it("reads a new cast afresh: the week a leader dies, their successor leads", () => {
        const nation = "DEU";
        const before = foreignLeaderFor(campaign, nation).person;
        const after = withDead(campaign, before);
        const successor = foreignLeaderFor(after, nation).person;
        expect(successor).not.toBe(before);
        expect(successor).toBe(scanned(after, nation));
        expect(foreignLeaderFor(campaign, nation).person).toBe(before);
    });
    it("holds everyone of one nationality, living or not, in the cast's own order", () => {
        const nation = "JPN";
        const expected = Object.values(campaign.people).filter((r) => r.base.nationality === nation);
        expect(nationalsOf(campaign, nation)).toEqual(expected);
        expect(nationalsOf(campaign, "ZZZ")).toEqual([]);
    });
    it("works a leader and a rapport out once per cast, however often they are asked for", () => {
        const state = { ...campaign, people: { ...campaign.people } };
        let leaderReads = 0;
        let rapportReads = 0;
        const lead = "role-head";
        for (let i = 0; i < 3; i += 1) {
            rememberedLeader(state, "FRA", lead, () => {
                leaderReads += 1;
                return undefined;
            });
            rememberedRapport(state, "PER-A", "PER-B", () => {
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
        expect(() => withoutLeaderPersonality(() => {
            throw new Error("measurement failed");
        })).toThrow("measurement failed");
        expect(leaderPersonalityOn()).toBe(true);
    });
});
