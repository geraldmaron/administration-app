import { worldDataset } from "@admin/world";
import { administrationReach } from "./party.js";
import { createRngStreams } from "./rng.js";
// The Congress a President is sworn in beside.
//
// It used to be read off national legitimacy alone, symmetric in the
// President's party and near fifty-fifty, so choosing a party flipped the
// chambers to match: every President of either party opened with the same
// majority, and no founding ever handed anyone a divided government.
//
// Now the seats are counted in the country's own terms. The House is summed
// state by state from each state's partisan lean, the way apportionment
// already reads it, which is why the map's own tilt shows up: the same year
// that elects a Democrat narrowly can still return a Republican Senate. On top
// of the map sit two things a President brings: the mandate they won by, which
// carries members in with them, and the year's own swing, which is seeded and
// indifferent to party.
/**
 * How far toward the President's party each mandate moves the national
 * environment, in the same margin units a state's lean is written in. A
 * landslide on the scale of 2008 carries about forty House seats; winning the
 * electoral count while losing the popular vote carries none and costs a few.
 */
export const MANDATE_ENVIRONMENT = {
    landslide: 0.06,
    comfortable: 0.035,
    narrow: 0.015,
    "popular-vote-loss": -0.01,
};
/** The mandate a founding that declares none opens on: most wins are close, a few are routs, and a few are lost at the ballot box. */
const MANDATE_ODDS = [
    ["landslide", 0.15],
    ["comfortable", 0.35],
    ["narrow", 0.35],
    ["popular-vote-loss", 0.15],
];
/**
 * How much the year swings on its own, either way. Wide enough that a narrow
 * win can come with either chamber, narrow enough that a landslide still
 * brings its Congress with it.
 */
const HOUSE_SWING = 0.03;
const SENATE_SWING = 0.02;
/**
 * The spread of a House race around its state's lean. At an even national
 * environment the dataset's own leans sum to the House the 2024 election
 * returned (about 218 Republicans), which is what this was tuned against.
 */
const HOUSE_RACE_SPREAD = 0.12;
/**
 * The Senate the cycle inherits. Two thirds of it was not on the 2028 ballot,
 * so it starts from the chamber seated in 2025 (53 Republicans, 45 Democrats
 * and two independents who caucus with them, per the Senate roster the leader
 * table opened on 2026-09-23) and moves a seat for every point of environment.
 */
const SENATE_BASE_REPUBLICAN_SHARE = 0.53;
const SENATE_INDEPENDENTS = 2;
const HOUSE_SEATS = 435;
const SENATE_SEATS = 100;
/** The mandate the founding opens on: the one declared, or the seed's own. */
export function openingMandate(seed, declared) {
    if (declared)
        return declared;
    const roll = createRngStreams(seed).stream("founding", "mandate").next();
    let remaining = roll;
    for (const [mandate, odds] of MANDATE_ODDS) {
        remaining -= odds;
        if (remaining < 0)
            return mandate;
    }
    return "narrow";
}
/** The standard normal distribution function, to four decimals (Abramowitz and Stegun 26.2.17). */
function normalCdf(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const density = 0.3989423 * Math.exp((-x * x) / 2);
    const tail = density * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - tail : tail;
}
function houseRepublicans(environment) {
    const expected = worldDataset.states.reduce((sum, state) => sum + state.houseSeats * normalCdf((state.lean + environment) / HOUSE_RACE_SPREAD), 0);
    return Math.max(0, Math.min(HOUSE_SEATS, Math.round(expected)));
}
function senateRepublicans(environment) {
    const share = Math.max(0.3, Math.min(0.7, SENATE_BASE_REPUBLICAN_SHARE + environment));
    return Math.round(SENATE_SEATS * share);
}
/**
 * The seats each party holds on the first morning.
 *
 * An Independent President carries in only the part of a mandate their reach
 * extends to, toward the caucus they sit nearest: nobody ran on a ticket below
 * them.
 */
export function openingSeats(seed, mandate, administrationParty, caucusAnchor) {
    const swing = createRngStreams(seed).stream("founding", "congress");
    const houseSwing = (swing.next() * 2 - 1) * HOUSE_SWING;
    const senateSwing = (swing.next() * 2 - 1) * SENATE_SWING;
    const towardRepublicans = caucusAnchor === "republican" ? 1 : -1;
    const coattails = towardRepublicans * MANDATE_ENVIRONMENT[mandate] * administrationReach(administrationParty);
    const house = houseRepublicans(coattails + houseSwing);
    const senate = senateRepublicans(coattails + senateSwing);
    return {
        house: { republican: house, democrat: HOUSE_SEATS - house, independent: 0 },
        senate: { republican: senate, democrat: SENATE_SEATS - senate - SENATE_INDEPENDENTS, independent: SENATE_INDEPENDENTS },
    };
}
/** The same seats, counted along the administration's own axis. */
export function compositionFromSeats(seats, caucusAnchor) {
    const administration = seats[caucusAnchor];
    const opposition = caucusAnchor === "democrat" ? seats.republican : seats.democrat;
    return {
        seats: seats.democrat + seats.republican + seats.independent,
        administration,
        opposition,
        independent: seats.independent,
    };
}
