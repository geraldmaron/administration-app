import { HOUSE_DELEGATION_TABLE, STATE_IDS, worldDataset } from "@admin/world";
/** Every district of a state, most Democratic first, the id breaking ties so every machine agrees. */
export function districtsOf(state) {
    return worldDataset.districts
        .filter((district) => district.state === state)
        .sort((a, b) => a.lean - b.lean || a.id.localeCompare(b.id));
}
const RAW_LEANS = STATE_IDS.map((id) => districtsOf(id).map((district) => district.lean));
/** Half the lean between a state's last Democratic seat and its first Republican one on the roster. */
function boundaryHalfGap(leans, held) {
    if (held.democrat === 0 || held.republican === 0)
        return undefined;
    return (leans[leans.length - held.republican] - leans[held.democrat - 1]) / 2;
}
/**
 * How far to move a state's district leans so the roster's own boundary sits on
 * even ground.
 *
 * The district leans are authored as a spread around the state's lean, not
 * measured, and in thirteen one-party delegations they disagree with who holds
 * the seats: Utah's four Republicans include a district drawn eighteen points
 * Democratic. An election flips the closest seats, so read raw, a Democratic
 * year would take that Utah seat before the most Democratic seat a Republican
 * holds in New York. Who won a seat is the best evidence of how it leans, so each
 * state's leans move together, keeping their order and spacing, until the seats
 * each party holds sit on that party's side: centered on the gap between the
 * two where the state sends both, and where it sends one party, only as far as
 * it takes to put the weakest seat as safe as the median boundary seat of the
 * divided states.
 */
function rosterOffset(leans, held, cushion) {
    if (leans.length === 0)
        return 0;
    if (held.democrat > 0 && held.republican > 0) {
        return -(leans[held.democrat - 1] + leans[leans.length - held.republican]) / 2;
    }
    if (held.republican > 0)
        return Math.max(0, cushion - leans[leans.length - held.republican]);
    if (held.democrat > 0)
        return Math.min(0, -cushion - leans[held.democrat - 1]);
    return 0;
}
const LEANS = (() => {
    const roster = STATE_IDS.map((id) => rosterSeats(id));
    const gaps = RAW_LEANS.flatMap((leans, index) => {
        const gap = boundaryHalfGap(leans, roster[index]);
        return gap === undefined ? [] : [gap];
    }).sort((a, b) => a - b);
    const cushion = gaps[Math.floor(gaps.length / 2)] ?? 0;
    return RAW_LEANS.map((leans, index) => {
        const offset = rosterOffset(leans, roster[index], cushion);
        return leans.map((lean) => lean + offset);
    });
})();
/** A state's seat leans as an election reads them, most Democratic first. */
export function seatLeans(state) {
    return LEANS[STATE_IDS.indexOf(state)] ?? [];
}
/** The roster's delegation for a state. DC's delegate does not vote on the floor, so it has none. */
export function rosterSeats(state) {
    const row = HOUSE_DELEGATION_TABLE.find((entry) => entry.state === state);
    if (!row)
        return { democrat: 0, republican: 0, other: 0 };
    return { democrat: row.democrat, republican: row.republican, other: row.independent + row.vacant };
}
/** A seated delegation, read back from the administration's axis into parties. */
export function seatsOfDelegation(house, anchor) {
    const democrat = anchor === "democrat" ? house.administration : house.opposition;
    const republican = anchor === "democrat" ? house.opposition : house.administration;
    return { democrat, republican, other: house.seats - democrat - republican };
}
/** The seats as held before this election: the live delegation, or the roster where none is seated yet. */
export function heldHouseSeats(states, anchor) {
    return STATE_IDS.map((id) => {
        const seated = states[id]?.delegation?.house;
        return seated ? seatsOfDelegation(seated, anchor) : rosterSeats(id);
    });
}
const total = (seats, field) => seats.reduce((sum, row) => sum + row[field], 0);
const sizeOf = (row) => row.democrat + row.republican + row.other;
/**
 * The state whose candidate seat is closest to the flip: the highest lean when
 * `want` is "max", the lowest when "min". Earlier states win ties. Undefined
 * when no state has a seat to offer.
 */
function closest(seats, rank, want) {
    let best;
    let bestLean = 0;
    seats.forEach((row, index) => {
        const at = rank(row);
        if (at === undefined)
            return;
        const lean = LEANS[index]?.[at] ?? 0;
        if (best === undefined || (want === "max" ? lean > bestLean : lean < bestLean)) {
            best = index;
            bestLean = lean;
        }
    });
    return best;
}
function withRow(seats, index, row) {
    return seats.map((entry, i) => (i === index ? row : entry));
}
/** Republicans to their count: gains take the most Republican seat they do not hold, losses give up their least. */
function seatRepublicans(start, goal) {
    let seats = start;
    while (total(seats, "republican") !== goal) {
        const gaining = total(seats, "republican") < goal;
        const index = gaining
            ? closest(seats, (row) => (row.republican < sizeOf(row) ? sizeOf(row) - row.republican - 1 : undefined), "max")
            : closest(seats, (row) => (row.republican > 0 ? sizeOf(row) - row.republican : undefined), "min");
        if (index === undefined)
            return seats;
        const row = seats[index];
        const next = gaining
            ? row.other > 0
                ? { ...row, republican: row.republican + 1, other: row.other - 1 }
                : { ...row, republican: row.republican + 1, democrat: row.democrat - 1 }
            : { ...row, republican: row.republican - 1, other: row.other + 1 };
        seats = withRow(seats, index, next);
    }
    return seats;
}
/** Democrats to their count, from the seats the Republicans left: the most Democratic open seat first. */
function seatDemocrats(start, goal) {
    let seats = start;
    while (total(seats, "democrat") !== goal) {
        const gaining = total(seats, "democrat") < goal;
        const index = gaining
            ? closest(seats, (row) => (row.other > 0 ? row.democrat : undefined), "min")
            : closest(seats, (row) => (row.democrat > 0 ? row.democrat - 1 : undefined), "max");
        if (index === undefined)
            return seats;
        const row = seats[index];
        const next = gaining
            ? { ...row, democrat: row.democrat + 1, other: row.other - 1 }
            : { ...row, democrat: row.democrat - 1, other: row.other + 1 };
        seats = withRow(seats, index, next);
    }
    return seats;
}
/**
 * The House an election returns, from the seats as they were held.
 *
 * Every seat is on the ballot, so the vacancies are filled; what is left once
 * both parties hold their counts is the chamber's independents.
 */
export function electHouse(held, target) {
    return seatDemocrats(seatRepublicans(held, target.republican), target.democrat);
}
/** The chamber's party counts, read off the administration's axis. */
export function partyTarget(chamber, anchor) {
    const seats = seatsOfDelegation(chamber, anchor);
    return { democrat: seats.democrat, republican: seats.republican };
}
/** One state's elected seats on the administration's axis, every seat filled. */
export function houseComposition(row, anchor) {
    const administration = anchor === "democrat" ? row.democrat : row.republican;
    const opposition = anchor === "democrat" ? row.republican : row.democrat;
    return { seats: sizeOf(row), administration, opposition, independent: row.other };
}
