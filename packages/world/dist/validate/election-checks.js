import { ELECTION_RULES } from "../dataset/election-rules.js";
import { GOVERNOR_TERMS } from "../dataset/governor-terms.js";
import { HOUSE_DELEGATION_TABLE } from "../dataset/house-delegations.js";
import { SENATE_CLASS_TABLE } from "../dataset/senate-classes.js";
import { ElectionRule, GovernorTermRow, HouseDelegationRow, SenateClassRow } from "../schemas/election.js";
// The election tables against the dataset they describe and against the rules
// the calendar itself imposes: a row for a state that does not exist, two rows
// for one seat, a chamber whose thirds are not thirds, a governor cycle that
// puts the wrong number of states on a November.
//
// The arithmetic checks are here rather than left to a unit test because the
// tables are copied from a source by hand and the failure they invite is
// quiet: a class with 34 seats and another with 32 still parses, still sums to
// a hundred, and puts one seat on the wrong ballot for the rest of the game.
// They hold on the tables alone and so run against any dataset. The half that
// reads the dataset — a row naming a state that is not on the board, a state on
// the board with no row — runs only where the dataset carries states at all: a
// record of foreign governments does not describe the American state board, and
// asking it to account for Wyoming would fail every such dataset for a fact it
// never claimed.
/** The voting House, fixed by the Apportionment Act of 1929. */
const HOUSE_SEATS = 435;
/** Class 1 and Class 2 are 33 seats each; Class 3 is the 34th. */
const SEATS_BY_CLASS = { 1: 33, 2: 33, 3: 34 };
/** How many governors stand in a November of each kind, read off the cycle. */
const GOVERNORS_BY_YEAR = {
    /** An even year that is not a presidential one. */
    midterm: 36,
    /** The nine four-year states on the presidential cycle, plus the two-year pair. */
    presidential: 11,
    /** Virginia and New Jersey, the November after a presidential election. */
    afterPresidential: 2,
    /** Kentucky, Louisiana and Mississippi, the November before one. */
    beforePresidential: 3,
};
const TWO_YEAR_STATES = ["NH", "VT"];
/** Thirty-seven of the fifty states cap consecutive gubernatorial terms; thirteen do not. */
const LIMITED_STATEHOUSES = 37;
function shape(path, message) {
    return { kind: "shape", path, message };
}
function parseRows() {
    const errors = [];
    SENATE_CLASS_TABLE.forEach((row, index) => {
        const parsed = SenateClassRow.safeParse(row);
        if (!parsed.success)
            errors.push(shape(`senateClasses[${index}]`, parsed.error.issues[0].message));
    });
    GOVERNOR_TERMS.forEach((row, index) => {
        const parsed = GovernorTermRow.safeParse(row);
        if (!parsed.success)
            errors.push(shape(`governorTerms[${index}]`, parsed.error.issues[0].message));
    });
    HOUSE_DELEGATION_TABLE.forEach((row, index) => {
        const parsed = HouseDelegationRow.safeParse(row);
        if (!parsed.success)
            errors.push(shape(`houseDelegations[${index}]`, parsed.error.issues[0].message));
    });
    ELECTION_RULES.forEach((row, index) => {
        const parsed = ElectionRule.safeParse(row);
        if (!parsed.success)
            errors.push(shape(`electionRules[${index}]`, parsed.error.issues[0].message));
    });
    return errors;
}
function checkSenate(stateIds) {
    const errors = [];
    const byState = new Map();
    for (const row of SENATE_CLASS_TABLE) {
        if (stateIds.size > 0 && !stateIds.has(row.state)) {
            errors.push(shape(`senateClasses.${row.state}`, `no state ${row.state} in the dataset`));
            continue;
        }
        byState.set(row.state, [...(byState.get(row.state) ?? []), row.senateClass]);
    }
    // DC elects no senators, so the senate table is the fifty states while the
    // dataset's state list is those fifty plus DC.
    for (const id of [...byState.keys()].filter((state) => state !== "DC")) {
        const classes = byState.get(id);
        if (classes.length !== 2) {
            errors.push(shape(`senateClasses.${id}`, `${classes.length} senate seats on file, not 2`));
            continue;
        }
        if (classes[0] === classes[1]) {
            errors.push(shape(`senateClasses.${id}`, `both seats are in class ${classes[0]}; a state's two seats are in different classes`));
        }
    }
    for (const id of [...stateIds].filter((state) => state !== "DC")) {
        if (!byState.has(id))
            errors.push(shape(`senateClasses.${id}`, "no senate seats on file"));
    }
    for (const seatClass of [1, 2, 3]) {
        const held = SENATE_CLASS_TABLE.filter((row) => row.senateClass === seatClass).length;
        if (held !== SEATS_BY_CLASS[seatClass]) {
            errors.push(shape(`senateClasses.class${seatClass}`, `${held} seats in class ${seatClass}, not ${SEATS_BY_CLASS[seatClass]}`));
        }
    }
    return errors;
}
const houseSeatsOf = (row) => row.democrat + row.republican + row.independent + row.vacant;
// A row that disagrees with the state's apportioned seats would seat a
// delegation the board's own district map cannot hold. DC's delegate does not
// vote on the floor, so it has no row and its apportionment is zero.
function checkHouse(dataset) {
    const errors = [];
    const apportioned = new Map(dataset.states.map((state) => [state.id, state.houseSeats]));
    const seen = new Set();
    for (const row of HOUSE_DELEGATION_TABLE) {
        if (seen.has(row.state))
            errors.push(shape(`houseDelegations.${row.state}`, "two rows for one delegation"));
        seen.add(row.state);
        const seats = apportioned.get(row.state);
        if (apportioned.size === 0)
            continue;
        if (seats === undefined) {
            errors.push(shape(`houseDelegations.${row.state}`, `no state ${row.state} in the dataset`));
        }
        else if (houseSeatsOf(row) !== seats) {
            errors.push(shape(`houseDelegations.${row.state}`, `${houseSeatsOf(row)} seats on file, but the state is apportioned ${seats}`));
        }
    }
    for (const [id, seats] of apportioned) {
        if (seats > 0 && !seen.has(id))
            errors.push(shape(`houseDelegations.${id}`, "no House delegation on file"));
    }
    const total = HOUSE_DELEGATION_TABLE.reduce((sum, row) => sum + houseSeatsOf(row), 0);
    if (total !== HOUSE_SEATS)
        errors.push(shape("houseDelegations", `${total} House seats on file, not ${HOUSE_SEATS}`));
    return errors;
}
/** Which November a row puts its state on, as a bucket of the four-year cycle. */
function cycleOf(row) {
    const year = Number(row.nextElection.slice(0, 4));
    if (!Number.isInteger(year))
        return undefined;
    if (row.termYears === 2)
        return "midterm";
    if (year % 4 === 0)
        return "presidential";
    if (year % 4 === 1)
        return "afterPresidential";
    if (year % 4 === 2)
        return "midterm";
    return "beforePresidential";
}
function checkGovernors(stateIds) {
    const errors = [];
    const seen = new Set();
    const counts = {};
    for (const row of GOVERNOR_TERMS) {
        if (stateIds.size > 0 && !stateIds.has(row.state)) {
            errors.push(shape(`governorTerms.${row.state}`, `no state ${row.state} in the dataset`));
            continue;
        }
        if (seen.has(row.state))
            errors.push(shape(`governorTerms.${row.state}`, "two rows for one statehouse"));
        seen.add(row.state);
        const cycle = cycleOf(row);
        if (cycle === undefined) {
            errors.push(shape(`governorTerms.${row.state}`, `nextElection "${row.nextElection}" is not a dated November`));
            continue;
        }
        counts[cycle] = (counts[cycle] ?? 0) + 1;
        // A two-year term also stands in the presidential November, which is why
        // the two-year pair is counted in the midterm bucket and added to the
        // presidential one rather than belonging to either alone.
        if (row.termYears === 2)
            counts.presidential = (counts.presidential ?? 0) + 1;
    }
    for (const id of [...stateIds].filter((state) => state !== "DC")) {
        if (!seen.has(id))
            errors.push(shape(`governorTerms.${id}`, "no statehouse term on file"));
    }
    for (const [cycle, expected] of Object.entries(GOVERNORS_BY_YEAR)) {
        const held = counts[cycle] ?? 0;
        if (held !== expected) {
            errors.push(shape(`governorTerms.${cycle}`, `${held} governors stand on the ${cycle} November, not ${expected}`));
        }
    }
    return errors;
}
function checkRules(stateIds) {
    const errors = [];
    const seen = new Set();
    for (const rule of ELECTION_RULES) {
        if (stateIds.size > 0 && !stateIds.has(rule.state)) {
            errors.push(shape(`electionRules.${rule.state}`, `no state ${rule.state} in the dataset`));
            continue;
        }
        if (seen.has(rule.state))
            errors.push(shape(`electionRules.${rule.state}`, "two rules for one state"));
        seen.add(rule.state);
    }
    for (const id of stateIds) {
        if (!seen.has(id))
            errors.push(shape(`electionRules.${id}`, "no contest rule on file"));
    }
    // The two tables state the same fact about New Hampshire and Vermont, and a
    // reader that trusted one while the other disagreed would put a governor on
    // the wrong ballot.
    const limited = ELECTION_RULES.filter((rule) => rule.state !== "DC" && rule.consecutiveTermLimit !== null).length;
    if (limited !== LIMITED_STATEHOUSES) {
        errors.push(shape("electionRules.consecutiveTermLimit", `${limited} statehouses limit their governor, not ${LIMITED_STATEHOUSES}`));
    }
    const marked = ELECTION_RULES.filter((rule) => rule.twoYearTerm).map((rule) => rule.state).sort();
    const termed = GOVERNOR_TERMS.filter((row) => row.termYears === 2).map((row) => row.state).sort();
    if (marked.join() !== TWO_YEAR_STATES.join() || termed.join() !== TWO_YEAR_STATES.join()) {
        errors.push(shape("electionRules.twoYearTerm", `two-year statehouses are ${TWO_YEAR_STATES.join(", ")}; the rules say ${marked.join(", ") || "none"} and the terms say ${termed.join(", ") || "none"}`));
    }
    return errors;
}
export function checkElectionTables(dataset) {
    const stateIds = new Set(dataset.states.map((state) => state.id));
    return [
        ...parseRows(),
        ...checkSenate(stateIds),
        ...checkHouse(dataset),
        ...checkGovernors(stateIds),
        ...checkRules(stateIds),
    ];
}
