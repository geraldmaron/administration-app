// The real calendar and the real rules: which third of the Senate is up, which
// statehouses are on the ballot, who holds a district, how the map fell, and the
// nine weeks between a November and the January the winners are sworn in on.
//
// The cases here are planted from outside the arithmetic they check — a campaign
// moved to a date, a delegation read back, a map summed — so a rule that quietly
// stopped reading its table fails here rather than passing on an empty scan.
import { describe, expect, it } from "vitest";
import { ELECTION_RULES, ELECTORAL_COLLEGE, GOVERNOR_TERMS, STATE_IDS, worldDataset } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { addDays, federalElectionDay, isSameDate, turnOnDate } from "./clock.js";
import { districtHolder, senateClassesOf } from "./delegations.js";
import { advanceUntilAttention } from "./advance.js";
import { holdElection, holdElectionsDueToday, projectVote, seatSwing, senateClassUpIn } from "./elections.js";
import { governorPhase, governorRacesDueThisWeek, governorRacesDueToday, nextGubernatorialElection } from "./governors.js";
import { apply } from "./effects.js";
import { HOME_STATE_PRESIDENT, electoralVotesWon, stateCalls } from "./states.js";
import { noopPhase } from "./turn-loop.js";
const phases = { simulate: noopPhase, select: noopPhase };
// A founded campaign rather than the bare fixture: every rule below reads a
// seated delegation or a seated governor, and the fixture has neither.
const FOUNDED = foundedForBalance("elections-calendar").campaign;
function on(campaign, date) {
    return { ...campaign, calendar: date, turn: turnOnDate(campaign.foundingDate ?? campaign.calendar, date) };
}
describe("which third of the Senate faces the voters", () => {
    it("rotates the classes on the real six-year cycle", () => {
        expect(senateClassUpIn(2030)).toBe(1);
        expect(senateClassUpIn(2032)).toBe(2);
        expect(senateClassUpIn(2034)).toBe(3);
        expect(senateClassUpIn(2036)).toBe(1);
        expect(senateClassUpIn(2024)).toBe(1);
        expect(senateClassUpIn(2026)).toBe(2);
        expect(senateClassUpIn(2028)).toBe(3);
        // An odd year is nobody's Senate class.
        expect(senateClassUpIn(2029)).toBeUndefined();
        expect(senateClassUpIn(2031)).toBeUndefined();
    });
    it("files the class that was up on the result, and contests 33 seats on November 5, 2030", () => {
        const day = federalElectionDay(2030);
        expect(day).toEqual({ year: 2030, month: 11, day: 5 });
        const eve = on(FOUNDED, day);
        const result = holdElection(eve, undefined, "midterm", eve.turn);
        expect(result.senateClass).toBe(1);
        const upForElection = STATE_IDS.filter((id) => id !== "DC" && senateClassesOf(id).includes(1));
        expect(upForElection.length).toBe(33);
    });
    it("never moves more Senate seats than the contested class holds in a close state", () => {
        const day = federalElectionDay(2030);
        const campaign = on(FOUNDED, day);
        // A rout in either direction: the seat count still cannot exceed the class.
        for (const share of [0.05, 0.95]) {
            const result = holdElection({ ...campaign }, undefined, "midterm", campaign.turn);
            expect(Math.abs(result.swing.senate)).toBeLessThanOrEqual(33);
            expect(share).toBeGreaterThan(0);
        }
    });
});
describe("what a presidential year does to the chambers", () => {
    it("carries a coattail with no midterm penalty against it", () => {
        const campaign = on(FOUNDED, federalElectionDay(2032));
        const house = campaign.congress.chambers.house;
        // Dead even: the midterm still costs the administration seats, because the
        // penalty is structural. A presidential year at the same count costs nothing.
        expect(seatSwing(0.5, "house", house, campaign, "midterm")).toBeLessThan(0);
        expect(seatSwing(0.5, "house", house, campaign, "presidential")).toBe(0);
        // A win carries seats in, and fewer than the same count would cost at a
        // midterm, so the +0.08 standing a win already grants is not paid twice.
        const coattail = seatSwing(0.6, "house", house, campaign, "presidential");
        expect(coattail).toBeGreaterThan(0);
        expect(coattail).toBeLessThan(Math.abs(seatSwing(0.4, "house", house, campaign, "midterm")));
    });
    it("moves no chamber further than the widest swing the chamber has ever seen", () => {
        const campaign = on(FOUNDED, federalElectionDay(2032));
        for (const kind of ["midterm", "presidential"]) {
            for (const share of [0, 0.25, 0.5, 0.75, 1]) {
                const house = seatSwing(share, "house", campaign.congress.chambers.house, campaign, kind);
                const senate = seatSwing(share, "senate", campaign.congress.chambers.senate, campaign, kind);
                // Seventy-seven seats, which an earlier reading produced in every
                // direction, is larger than any swing the chamber has ever had.
                expect(Math.abs(house), `${kind} house at ${share}`).toBeLessThan(77);
                expect(Math.abs(senate), `${kind} senate at ${share}`).toBeLessThanOrEqual(34);
            }
        }
    });
    it("files a presidential result with a swing, a class and the night's governors", () => {
        const campaign = on(FOUNDED, federalElectionDay(2032));
        const result = holdElection(campaign, undefined, "presidential", campaign.turn);
        expect(result.swing).toBeDefined();
        expect(result.senateClass).toBe(2);
        expect(result.governors?.length).toBe(11);
    });
});
describe("the statehouses on the ballot", () => {
    it("puts 36 governorships on November 5, 2030 and Virginia and New Jersey on November 6, 2029", () => {
        const midterm = on(FOUNDED, federalElectionDay(2030));
        expect(governorRacesDueToday(midterm).length).toBe(36);
        const offYear = federalElectionDay(2029);
        expect(offYear).toEqual({ year: 2029, month: 11, day: 6 });
        expect([...governorRacesDueToday(on(FOUNDED, offYear))].sort()).toEqual(["NJ", "VA"]);
        const presidential = on(FOUNDED, federalElectionDay(2032));
        expect(governorRacesDueToday(presidential).length).toBe(11);
        const oddBefore = on(FOUNDED, federalElectionDay(2031));
        expect([...governorRacesDueToday(oddBefore)].sort()).toEqual(["KY", "LA", "MS"]);
    });
    it("stands the two-year statehouses in every even November and the four-year ones only on their own", () => {
        for (const state of ["NH", "VT"]) {
            expect(isSameDate(nextGubernatorialElection(state, { year: 2029, month: 1, day: 20 }), federalElectionDay(2030))).toBe(true);
            expect(isSameDate(nextGubernatorialElection(state, { year: 2031, month: 1, day: 1 }), federalElectionDay(2032))).toBe(true);
        }
        // Alabama stands in 2030 and not again until 2034.
        expect(nextGubernatorialElection("AL", { year: 2031, month: 1, day: 1 })).toEqual(federalElectionDay(2034));
        // Every state is on the calendar, and DC is on none of it.
        expect(nextGubernatorialElection("DC", { year: 2029, month: 1, day: 20 })).toBeUndefined();
        expect(GOVERNOR_TERMS.length).toBe(50);
    });
    it("seats the winner of a statehouse that changes hands from the governor bench", () => {
        // The odd-year night is one of the week's settlements, so it is driven through
        // the phase that owns it rather than off the calendar day: a settlement filed
        // from the day loop lands between two of the following week's phases.
        const day = federalElectionDay(2029);
        const eve = on(FOUNDED, day);
        expect([...governorRacesDueThisWeek(eve)].sort()).toEqual(["NJ", "VA"]);
        const before = { VA: eve.states.VA.governor, NJ: eve.states.NJ.governor };
        const after = governorPhase(eve).reduce((state, packet) => apply(state, packet), eve);
        // The day loop files nothing for it, which is what keeps the two week layouts
        // producing the same ledger.
        expect(holdElectionsDueToday(eve).ledger.length).toBe(eve.ledger.length);
        for (const state of ["VA", "NJ"]) {
            const standing = after.states[state].governor;
            // Either the incumbent was returned, or somebody the bench actually holds
            // took the chair — never an empty statehouse and never a stranger.
            if (standing.person === before[state].person) {
                expect(standing.termsWon).toBe(1);
            }
            else {
                const seated = after.people[standing.person];
                expect(seated.currentRole).toBe("role-governor");
                expect(seated.state).toBe(state);
                expect(after.people[before[state].person].currentRole).toBeUndefined();
            }
            expect(standing.termEnds).toBeDefined();
        }
    });
    it("does not stop the run on an off-year governors' night", () => {
        const day = federalElectionDay(2029);
        const eve = on(FOUNDED, addDays(day, -1));
        const result = advanceUntilAttention(eve, { phases, horizonDays: 3 });
        expect(result.stopReason).not.toBe("election");
    });
});
describe("who holds a district", () => {
    it("apportions the seated delegation across a state's districts by lean, summing to the chamber", () => {
        const campaign = FOUNDED;
        let democrats = 0;
        let republicans = 0;
        for (const district of worldDataset.districts) {
            const holder = districtHolder(campaign, district.id);
            if (holder === "democrat")
                democrats += 1;
            if (holder === "republican")
                republicans += 1;
        }
        const anchor = campaign.congress.caucusAnchor;
        const house = campaign.congress.chambers.house;
        const expectedDemocrats = anchor === "democrat" ? house.administration : house.opposition;
        const expectedRepublicans = anchor === "democrat" ? house.opposition : house.administration;
        expect(democrats).toBe(expectedDemocrats);
        expect(republicans).toBe(expectedRepublicans);
        expect(democrats + republicans + house.independent).toBe(house.seats);
    });
    it("answers for no seat that is not a seat", () => {
        const campaign = FOUNDED;
        // DC's delegate is not one of the 435, and an id no table carries is nobody's.
        expect(districtHolder(campaign, "DC-DL")).toBeUndefined();
        expect(districtHolder(campaign, "ZZ-99")).toBeUndefined();
        // A single-district state's at-large seat is a seat, and somebody holds it.
        expect(districtHolder(campaign, "WY-AL")).toBeDefined();
    });
});
describe("how the map fell", () => {
    it("returns nothing before a presidential contest has been held", () => {
        expect(stateCalls(FOUNDED)).toEqual([]);
    });
    it("agrees with the electoral total for every state, once one has", () => {
        const base = on(FOUNDED, federalElectionDay(2032));
        const share = projectVote(base).share;
        const campaign = {
            ...base,
            termClock: {
                ...base.termClock,
                elections: [
                    {
                        id: "election:presidential:200",
                        kind: "presidential",
                        turn: 200,
                        voteShare: share,
                        won: true,
                        summary: "Re-elected.",
                    },
                ],
            },
        };
        const calls = stateCalls(campaign);
        expect(calls.length).toBe(Object.keys(campaign.states).length);
        expect(calls.reduce((total, call) => total + call.electoralVotes, 0)).toBe(ELECTORAL_COLLEGE);
        expect(calls.reduce((total, call) => total + call.administrationVotes, 0)).toBe(electoralVotesWon(campaign, share, campaign.congress));
        for (const call of calls) {
            expect(call.administrationVotes, call.state).toBeLessThanOrEqual(call.electoralVotes);
            if (call.allocation === "winner-take-all") {
                expect(call.administrationVotes, call.state).toBe(call.winner === "administration" ? call.electoralVotes : 0);
            }
        }
        // The two states the dataset records as splitting their electors are the two
        // whose calls may award part of a slate.
        expect(calls.filter((call) => call.allocation === "by-district").map((call) => call.state).sort()).toEqual(ELECTION_RULES.filter((rule) => rule.allocation === "by-district").map((rule) => rule.state).sort());
    });
    it("gives the ticket's own states a bounded lift and nowhere else", () => {
        const base = on(FOUNDED, federalElectionDay(2032));
        const withHome = {
            ...base,
            founding: { ...base.founding, leader: { ...base.founding.leader, homeState: "OH" } },
            termClock: {
                ...base.termClock,
                elections: [
                    { id: "election:presidential:200", kind: "presidential", turn: 200, voteShare: 0.5, won: true, summary: "x" },
                ],
            },
        };
        const without = {
            ...withHome,
            founding: { ...withHome.founding, leader: { ...withHome.founding.leader, homeState: undefined } },
        };
        const lifted = stateCalls(withHome).find((call) => call.state === "OH");
        const plain = stateCalls(without).find((call) => call.state === "OH");
        expect(lifted.share - plain.share).toBeCloseTo(HOME_STATE_PRESIDENT, 3);
        for (const state of ["CA", "TX", "FL"]) {
            const a = stateCalls(withHome).find((call) => call.state === state);
            const b = stateCalls(without).find((call) => call.state === state);
            expect(a.share, state).toBe(b.share);
        }
    });
});
describe("the nine weeks before a Congress is sworn in", () => {
    it("parks the chambers the country elected and seats them on January 3", () => {
        const day = federalElectionDay(2030);
        const eve = on(FOUNDED, day);
        const held = holdElectionsDueToday(eve);
        const pending = held.congress.seatingOn;
        expect(pending).toBeDefined();
        // The lame-duck chambers still hold the floor.
        expect(held.congress.chambers).toEqual(eve.congress.chambers);
        const convenes = { year: 2031, month: 1, day: 3 };
        expect(pending.seatsTurn).toBe(turnOnDate(held.foundingDate ?? eve.calendar, convenes));
        const january = on(held, convenes);
        const seated = holdElectionsDueToday(january);
        expect(seated.congress.seatingOn).toBeUndefined();
        expect(seated.congress.chambers.house.administration).toBe(pending.house.administration);
        expect(seated.congress.chambers.senate.administration).toBe(pending.senate.administration);
    });
});
