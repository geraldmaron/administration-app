import { describe, expect, it } from "vitest";
import { worldDataset } from "../dataset/index.js";
import { ELECTION_RULES } from "../dataset/election-rules.js";
import { GOVERNOR_TERMS } from "../dataset/governor-terms.js";
import { HOUSE_DELEGATION_TABLE } from "../dataset/house-delegations.js";
import { SENATE_CLASS_TABLE } from "../dataset/senate-classes.js";
import { checkElectionTables } from "./election-checks.js";
// The sourced calendar, held to the shape of the American one.
//
// The counts below are not conveniences: 33/33/34 is what makes a Senate
// election a third of the chamber rather than all of it, and 36/11/2/3 is the
// gubernatorial cycle. A table that parses and sums correctly can still put a
// state on the wrong November, so each count is asserted on the shipped rows and
// then again on a planted break, from outside the check's own arithmetic.
describe("the election tables as shipped", () => {
    it("passes every check against the dataset they describe", () => {
        expect(checkElectionTables(worldDataset)).toEqual([]);
    });
    it("puts two seats in two different classes in each of the fifty states", () => {
        const states = new Set(SENATE_CLASS_TABLE.map((row) => row.state));
        expect(states.size).toBe(50);
        expect(SENATE_CLASS_TABLE.length).toBe(100);
        for (const state of states) {
            const classes = SENATE_CLASS_TABLE.filter((row) => row.state === state).map((row) => row.senateClass);
            expect(new Set(classes).size, state).toBe(2);
        }
    });
    it("holds the Senate at 33, 33 and 34 by class", () => {
        const sized = [1, 2, 3].map((seatClass) => SENATE_CLASS_TABLE.filter((row) => row.senateClass === seatClass).length);
        expect(sized).toEqual([33, 33, 34]);
    });
    it("seats the 435 as the Clerk's roster held them, with the empty seats left empty", () => {
        const sum = (field) => HOUSE_DELEGATION_TABLE.reduce((total, row) => total + row[field], 0);
        expect(HOUSE_DELEGATION_TABLE).toHaveLength(50);
        expect({ democrat: sum("democrat"), republican: sum("republican"), independent: sum("independent"), vacant: sum("vacant") })
            .toEqual({ democrat: 214, republican: 218, independent: 1, vacant: 2 });
        const row = (state) => HOUSE_DELEGATION_TABLE.find((entry) => entry.state === state);
        // Winner-take-all districts, not a split by lean: Idaho is two Republicans.
        expect(row("ID")).toMatchObject({ democrat: 0, republican: 2 });
        expect(row("TX")).toMatchObject({ democrat: 13, republican: 24, vacant: 1 });
        for (const entry of HOUSE_DELEGATION_TABLE)
            expect(entry.source).toBe("https://clerk.house.gov/xml/lists/MemberData.xml");
    });
    it("puts 36 governors on a midterm November, 11 on a presidential one, and the five odd-year states on theirs", () => {
        const yearOf = (state) => Number(GOVERNOR_TERMS.find((row) => row.state === state).nextElection.slice(0, 4));
        const twoYear = GOVERNOR_TERMS.filter((row) => row.termYears === 2).map((row) => row.state);
        expect(twoYear).toEqual(["NH", "VT"]);
        const onCycle = (predicate) => GOVERNOR_TERMS.filter((row) => predicate(Number(row.nextElection.slice(0, 4))));
        // A two-year statehouse stands in both even Novembers, so it belongs to the
        // midterm count and to the presidential one.
        const midterm = onCycle((year) => year % 4 === 2).length;
        const presidential = onCycle((year) => year % 4 === 0).length + twoYear.length;
        expect(midterm).toBe(36);
        expect(presidential).toBe(11);
        expect(onCycle((year) => year % 4 === 1).map((row) => row.state).sort()).toEqual(["NJ", "VA"]);
        expect(onCycle((year) => year % 4 === 3).map((row) => row.state).sort()).toEqual(["KY", "LA", "MS"]);
        // Virginia and New Jersey vote the November after a presidential election,
        // which for the first one after the campaign opens is November 6, 2029.
        expect(yearOf("VA") % 4).toBe(1);
        expect(yearOf("NJ") % 4).toBe(1);
    });
    it("splits electors by district in Maine and Nebraska and nowhere else", () => {
        expect(ELECTION_RULES.filter((rule) => rule.allocation === "by-district").map((rule) => rule.state).sort()).toEqual([
            "ME",
            "NE",
        ]);
    });
    it("requires a majority in the three states whose law does and a plurality everywhere else", () => {
        expect(ELECTION_RULES.filter((rule) => rule.runoffThreshold >= 0.5).map((rule) => rule.state).sort()).toEqual([
            "GA",
            "LA",
            "MS",
        ]);
    });
    it("limits 37 statehouses and leaves 13 unlimited, Virginia at one term in a row", () => {
        const states = ELECTION_RULES.filter((rule) => rule.state !== "DC");
        expect(states.filter((rule) => rule.consecutiveTermLimit !== null).length).toBe(37);
        expect(states.filter((rule) => rule.consecutiveTermLimit === null).length).toBe(13);
        expect(ELECTION_RULES.find((rule) => rule.state === "VA").consecutiveTermLimit).toBe(1);
    });
});
// Planted breaks: each case is built outside the check, by handing the validator
// a dataset that contradicts the tables, so a check that quietly stopped reading
// a table fails here rather than passing on an empty scan.
describe("what the check catches", () => {
    it("names a state the tables describe and the dataset does not carry", () => {
        const withoutWyoming = {
            ...worldDataset,
            states: worldDataset.states.filter((state) => state.id !== "WY"),
        };
        const messages = checkElectionTables(withoutWyoming).map((error) => error.message);
        expect(messages).toContain("no state WY in the dataset");
    });
    it("names a delegation whose seats disagree with the state's apportionment", () => {
        const moved = {
            ...worldDataset,
            states: worldDataset.states.map((state) => (state.id === "OH" ? { ...state, houseSeats: state.houseSeats + 1 } : state)),
        };
        const messages = checkElectionTables(moved).map((error) => error.message);
        expect(messages).toContain("15 seats on file, but the state is apportioned 16");
    });
    it("passes a dataset with no states at all rather than billing it for an American board", () => {
        expect(checkElectionTables({ ...worldDataset, states: [] })).toEqual([]);
    });
});
