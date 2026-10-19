// Congressional delegations: one writer that apportions ChamberComposition
// across the fifty states (and DC's house seats) so the table and the chamber
// cannot disagree. Called at founding and again inside midterm recompose.
//
// House: each state's seats open on the Clerk of the House's roster and move
// only when an election moves them, closest seats first (house-seats.ts), so
// the sum equals congress.chambers.house exactly. Senate: two seats per state
// except DC (none counted); classes from a fixed table; parties by the same
// remainder pass against the senate composition.
//
// Disposition: each bloc drifts toward a target derived from the room's
// mood, the state's lean, and its grievance marks. Belief reading uses
// BELIEF_WEIGHT from party-beliefs.ts (T9); callers pass partyReading of the
// caucus against the last signature (0 until that reader is wired). Drift runs
// in delegationPhase after congressPhase (ARCHITECTURE slot 17).
import { SENATE_CLASS_TABLE, STATE_IDS, worldDataset, } from "@admin/world";
import { BELIEF_WEIGHT } from "./party-beliefs.js";
import { districtsOf, electHouse, heldHouseSeats, houseComposition, partyTarget } from "./house-seats.js";
import { administrationAlignment, otherMajorParty, partyForShare } from "./party.js";
/** How far a bloc moves toward its target in one week. Slower than a member (0.03). */
export const DELEGATION_DRIFT = 0.02;
/**
 * How far a state's live lean carries its bloc from the room's disposition.
 * Slightly softer than a named member's caucus tilt (0.16): a bloc turns as a
 * mean, not as a person with a future of their own.
 */
export const CAUCUS_TILT_STATE = 0.12;
/** How hard the live mark stack pulls a bloc's disposition target. */
export const GRIEVANCE_WEIGHT = 0.12;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/**
 * Lean is Dem ← → Rep; sign it toward the caucus anchor.
 *
 * Structural, not political: this is how many of a state's members sit with
 * each caucus, which is a fact about the state. How much of that caucus the
 * president can call on is `administrationAlignment`, and the two are only the
 * same number when the president belongs to a party.
 */
export function leanTowardAnchor(lean, caucusAnchor) {
    return caucusAnchor === "democrat" ? -lean : lean;
}
/**
 * How the live mark stack reads for disposition, −1..1. Separate from
 * `grievanceLean` (which displaces the lean anchor): same marks, different
 * consequence — mood of the bloc rather than where the state's politics sit.
 */
export function grievanceReading(marks) {
    const net = marks.reduce((sum, mark) => sum + mark.weight * mark.valence, 0);
    return Math.max(-1, Math.min(1, net));
}
/**
 * What a state's congressional bloc settles toward this week.
 *
 * Room disposition is the baseline; lean and marks displace it. `beliefReading`
 * is the T9 term (partyReading of the caucus against the last signature) and
 * defaults to 0 until that reader is wired.
 */
export function delegationTarget(congress, state, beliefReading = 0) {
    const caucus = CAUCUS_TILT_STATE * administrationAlignment(state.lean, congress);
    const grievance = GRIEVANCE_WEIGHT * grievanceReading(state.marks);
    const belief = BELIEF_WEIGHT * beliefReading;
    return round3(clamp01(congress.disposition + caucus + grievance + belief));
}
/**
 * One step toward the target. Within one DELEGATION_DRIFT, land exactly —
 * same snap rule as members and governors.
 */
export function driftDelegation(delegation, target) {
    const goal = clamp01(target);
    const gap = goal - delegation.disposition;
    if (gap === 0)
        return delegation;
    const next = Math.abs(gap) <= DELEGATION_DRIFT
        ? goal
        : delegation.disposition + Math.sign(gap) * DELEGATION_DRIFT;
    return { ...delegation, disposition: round3(clamp01(next)) };
}
/** Share of a state's major-party seats that sit with the anchor caucus. */
function anchorShareOfMajor(lean, caucusAnchor) {
    return clamp01(0.5 + leanTowardAnchor(lean, caucusAnchor) / 2);
}
/**
 * Which two of the three classes each state votes in, and which party held each
 * of those seats when the table was taken.
 *
 * Read off the sourced table rather than generated. The generated version
 * rotated the pairs in STATE_IDS order, which kept the three classes evenly
 * sized and was wrong for every state: Ohio and Alabama vote in the same
 * Novembers under it and do not in the country. A player looking at which third
 * of the Senate is up this year was reading an index, not a map.
 */
const SENATE_CLASSES = (() => {
    const byState = new Map();
    for (const row of SENATE_CLASS_TABLE) {
        byState.set(row.state, [...(byState.get(row.state) ?? []), { seatClass: row.senateClass, party: row.party }]);
    }
    const pairs = {};
    for (const [state, seats] of byState) {
        const ordered = [...seats].sort((a, b) => a.seatClass - b.seatClass);
        if (ordered.length === 2)
            pairs[state] = [ordered[0], ordered[1]];
    }
    return pairs;
})();
export function senateClassesOf(id) {
    const pair = SENATE_CLASSES[id];
    // The dataset validator holds every state to exactly two seats in two
    // classes, so this is unreachable on the shipped table. Throwing rather than
    // defaulting is the point: a silent pair would put a seat on the wrong
    // November for the rest of the campaign.
    if (!pair)
        throw new Error(`delegations: no senate class on file for ${id}`);
    return [pair[0].seatClass, pair[1].seatClass];
}
/**
 * The chamber the player inherits: Classes 1 and 2 as the source recorded them,
 * Class 3 left free.
 *
 * Class 3 was decided in the November before the oath, which in this game is
 * the founding's own mandate — so it is the third the opening apportionment
 * seats from the composition W1 handed it, and the other two thirds are the
 * real map.
 */
export const openingSenateHolder = (state, seatClass) => {
    if (seatClass === 3)
        return undefined;
    return SENATE_CLASSES[state]?.find((seat) => seat.seatClass === seatClass)?.party;
};
/** Holds every class but `contested`, at the party the state's live delegation carries. */
export function senateHolderExcept(contested, states) {
    return (state, seatClass) => {
        if (seatClass === contested)
            return undefined;
        return states[state]?.delegation?.senate.find((seat) => seat.seatClass === seatClass)?.party;
    };
}
/**
 * Hamilton / largest-remainder: floor the quotas, then hand leftover seats to
 * the largest fractional parts. Ties break by earlier index in `order` (which
 * callers pass as STATE_IDS declaration order).
 */
function largestRemainder(weights, seats, order) {
    const n = weights.length;
    const out = Array.from({ length: n }, () => 0);
    if (seats <= 0 || n === 0)
        return out;
    const mass = weights.reduce((sum, weight) => sum + weight, 0);
    if (mass <= 0) {
        // Uniform fallback so a zero-weight board still fills the chamber.
        for (let i = 0; i < seats; i++)
            out[order[i % n]] += 1;
        return out;
    }
    const quotas = weights.map((weight) => (weight / mass) * seats);
    const floors = quotas.map((quota) => Math.floor(quota));
    const remaining = seats - floors.reduce((sum, value) => sum + value, 0);
    const ranked = [...order].sort((a, b) => {
        const remA = quotas[a] - floors[a];
        const remB = quotas[b] - floors[b];
        if (remA !== remB)
            return remB - remA;
        return a - b;
    });
    for (let i = 0; i < remaining; i++)
        floors[ranked[i]] += 1;
    return floors;
}
/**
 * Apportion `target` seats across rows with a hard per-row cap, peeling any
 * overflow back into the remainder pool until every row is within its cap.
 * Needed for the senate (cap 2) where an uncapped Hamilton pass can briefly
 * overshoot a single state.
 */
function cappedLargestRemainder(weights, target, caps, order) {
    const assigned = largestRemainder(weights, target, order);
    let overflow = 0;
    for (let i = 0; i < assigned.length; i++) {
        if (assigned[i] <= caps[i])
            continue;
        overflow += assigned[i] - caps[i];
        assigned[i] = caps[i];
    }
    if (overflow === 0)
        return assigned;
    const room = caps.map((cap, i) => Math.max(0, cap - assigned[i]));
    const roomMass = room.reduce((sum, value) => sum + value, 0);
    if (roomMass === 0)
        return assigned;
    const extra = cappedLargestRemainder(room, Math.min(overflow, roomMass), room, order);
    return assigned.map((value, i) => value + extra[i]);
}
function houseShares(lean, caucusAnchor, indepRate) {
    const independent = clamp01(indepRate);
    const major = 1 - independent;
    const admin = major * anchorShareOfMajor(lean, caucusAnchor);
    return { administration: admin, independent, opposition: Math.max(0, 1 - admin - independent) };
}
function partySlots(chamber, leans, caucusAnchor, seatsPerRow, order) {
    const indepRate = chamber.seats === 0 ? 0 : chamber.independent / chamber.seats;
    const shares = leans.map((lean) => houseShares(lean, caucusAnchor, indepRate));
    const caps = leans.map(() => seatsPerRow);
    const admin = cappedLargestRemainder(shares.map((share) => seatsPerRow * share.administration), chamber.administration, caps, order);
    const indepCaps = admin.map((count) => Math.max(0, seatsPerRow - count));
    const independent = cappedLargestRemainder(shares.map((share) => seatsPerRow * share.independent), chamber.independent, indepCaps, order);
    return leans.map((_, i) => {
        const parties = [];
        for (let n = 0; n < admin[i]; n++)
            parties.push(partyForShare("administration", caucusAnchor));
        for (let n = 0; n < independent[i]; n++)
            parties.push(partyForShare("independent", caucusAnchor));
        while (parties.length < seatsPerRow)
            parties.push(partyForShare("opposition", caucusAnchor));
        return parties;
    });
}
function bucketOf(party, anchor) {
    if (party === anchor)
        return "administration";
    return party === "independent" ? "independent" : "opposition";
}
/**
 * Seat the senate with the classes that are not up held where they are.
 *
 * The held seats are counted out of the chamber first and the classes that are
 * contested are apportioned from what is left, so the sum over every state still
 * equals `congress.chambers.senate` exactly — the invariant the whole table is
 * tested against — while a seat nobody voted on keeps its party.
 *
 * A composition that cannot absorb the held seats (a mandate so lopsided that
 * one bucket is already over its chamber count before a contested seat is
 * seated) falls back to seating all hundred from the composition. That is the
 * old behavior, and it is the honest answer: where the chamber the player was
 * handed and the recorded map disagree, the chamber wins, because the chamber is
 * what every count on the floor reads.
 */
function apportionSenate(chamber, senateIds, leans, anchor, held) {
    const order = senateIds.map((_, index) => index);
    const classes = senateIds.map((id) => senateClassesOf(id));
    const holds = senateIds.map((id, index) => [held(id, classes[index][0]), held(id, classes[index][1])]);
    const heldCount = { administration: 0, opposition: 0, independent: 0 };
    for (const pair of holds)
        for (const party of pair)
            if (party)
                heldCount[bucketOf(party, anchor)] += 1;
    const residual = {
        administration: chamber.administration - heldCount.administration,
        opposition: chamber.opposition - heldCount.opposition,
        independent: chamber.independent - heldCount.independent,
    };
    const free = holds.flatMap((pair, row) => pair.flatMap((party, seat) => (party === undefined ? [{ row, seat }] : [])));
    const open = residual.administration + residual.opposition + residual.independent;
    const feasible = residual.administration >= 0 && residual.opposition >= 0 && residual.independent >= 0 && open === free.length;
    if (!feasible)
        return partySlots(chamber, leans, anchor, 2, order).map((pair) => [pair[0], pair[1]]);
    const freeOrder = free.map((_, index) => index);
    const indepRate = free.length === 0 ? 0 : residual.independent / free.length;
    const shares = free.map((slot) => houseShares(leans[slot.row], anchor, indepRate));
    const caps = free.map(() => 1);
    const admin = cappedLargestRemainder(shares.map((share) => share.administration), residual.administration, caps, freeOrder);
    const independent = cappedLargestRemainder(shares.map((share) => share.independent), residual.independent, admin.map((count) => 1 - count), freeOrder);
    const seated = senateIds.map((_, row) => [...holds[row]]);
    free.forEach((slot, index) => {
        const share = admin[index] === 1 ? "administration" : independent[index] === 1 ? "independent" : "opposition";
        seated[slot.row][slot.seat] = partyForShare(share, anchor);
    });
    return seated.map((pair) => [pair[0], pair[1]]);
}
function houseDisposition(house, room) {
    if (house.seats === 0)
        return room;
    return (house.administration * 1 + house.independent * room + house.opposition * 0) / house.seats;
}
function delegationDisposition(house, senate, caucusAnchor, room) {
    const senateAdmin = senate.filter((seat) => seat.party === caucusAnchor).length;
    const senateIndep = senate.filter((seat) => seat.party === "independent").length;
    const senateOpp = senate.length - senateAdmin - senateIndep;
    const seats = house.seats + senate.length;
    if (seats === 0)
        return room;
    const weighted = house.administration * 1 +
        house.independent * room +
        house.opposition * 0 +
        senateAdmin * 1 +
        senateIndep * room +
        senateOpp * 0;
    return round3(clamp01(weighted / seats));
}
/**
 * Derive every state's congressional bloc from the live chambers: the House
 * from the seats as they were held, moved to the chamber's counts; the Senate
 * from the leans with the classes not up held where they are. Pure and
 * seed-independent: same congress and same states give an identical table.
 */
export function apportionDelegations(congress, states, heldSenate = openingSenateHolder) {
    const anchor = congress.caucusAnchor;
    const room = congress.disposition;
    const elected = electHouse(heldHouseSeats(states, anchor), partyTarget(congress.chambers.house, anchor));
    const houses = elected.map((row) => houseComposition(row, anchor));
    const senateIds = STATE_IDS.filter((id) => id !== "DC");
    const senateLeans = senateIds.map((id) => states[id]?.lean ?? 0);
    const senateParties = apportionSenate(congress.chambers.senate, senateIds, senateLeans, anchor, heldSenate);
    const out = {};
    for (let i = 0; i < STATE_IDS.length; i++) {
        const id = STATE_IDS[i];
        const house = houses[i];
        if (id === "DC") {
            // Type requires a senate tuple; DC has no senators and is excluded from
            // the chamber sum. Placeholder seats are never counted by the invariant.
            const placeholders = [
                { party: "independent", seatClass: 1, disposition: room },
                { party: "independent", seatClass: 2, disposition: room },
            ];
            out[id] = {
                house,
                senate: placeholders,
                disposition: round3(clamp01(houseDisposition(house, room))),
            };
            continue;
        }
        const classes = senateClassesOf(id);
        const parties = senateParties[senateIds.indexOf(id)];
        const senate = [
            { party: parties[0], seatClass: classes[0], disposition: room },
            { party: parties[1], seatClass: classes[1], disposition: room },
        ];
        out[id] = {
            house,
            senate,
            disposition: delegationDisposition(house, senate, anchor, room),
        };
    }
    return out;
}
/** Write the apportioned table onto a state map. Founding and recompose only. */
export function withApportionedDelegations(congress, states, heldSenate = openingSenateHolder) {
    const delegations = apportionDelegations(congress, states, heldSenate);
    const next = {};
    for (const id of STATE_IDS) {
        const runtime = states[id];
        if (!runtime)
            continue;
        next[id] = { ...runtime, delegation: delegations[id] };
    }
    return next;
}
/** Sum of house seats across every state, including DC's zeros. */
export function sumHouseDelegations(states) {
    let seats = 0;
    let administration = 0;
    let opposition = 0;
    let independent = 0;
    for (const id of STATE_IDS) {
        const house = states[id]?.delegation?.house;
        if (!house)
            continue;
        seats += house.seats;
        administration += house.administration;
        opposition += house.opposition;
        independent += house.independent;
    }
    return { seats, administration, opposition, independent };
}
/** Sum of senate seat parties across the fifty states (DC excluded). */
export function sumSenateDelegations(states, caucusAnchor) {
    let administration = 0;
    let opposition = 0;
    let independent = 0;
    for (const id of STATE_IDS) {
        if (id === "DC")
            continue;
        const senate = states[id]?.delegation?.senate;
        if (!senate)
            continue;
        for (const seat of senate) {
            if (seat.party === caucusAnchor)
                administration += 1;
            else if (seat.party === "independent")
                independent += 1;
            else if (seat.party === otherMajorParty(caucusAnchor))
                opposition += 1;
        }
    }
    const seats = administration + opposition + independent;
    return { seats, administration, opposition, independent };
}
/**
 * Weekly drift of every apportioned bloc toward its target. Lives after
 * congressPhase so the baseline is this week's room disposition (ARCHITECTURE
 * slot 17). Governor drift stays a sibling call in turn-phases until T21
 * absorbs both into one composed packet; both already occupy the same slot.
 */
export const delegationPhase = (state) => {
    const effects = [];
    for (const id of STATE_IDS) {
        const runtime = state.states[id];
        const current = runtime?.delegation;
        if (!runtime || !current)
            continue;
        const next = driftDelegation(current, delegationTarget(state.congress, runtime));
        if (next.disposition === current.disposition)
            continue;
        effects.push({
            kind: "state",
            state: id,
            setDelegation: next,
            reason: `The ${runtime.base.name} delegation settles toward the week's standing in Congress.`,
        });
    }
    if (effects.length === 0)
        return [];
    return [
        {
            source: "simulate",
            actor: "world",
            turn: state.turn + 1,
            narration: { summary: "State delegations settle toward the Hill." },
            effects,
        },
    ];
};
/**
 * Which party holds a given congressional district.
 *
 * The apportionment above splits a state's seats by party and stops there: it
 * knows Ohio sends nine Republicans and six Democrats and cannot say which nine
 * districts they are, and a district room, a primary challenge and a
 * redistricting fight all need the seat itself rather than the state's total.
 *
 * The seated delegation is what answers it: a state that sends nine Republicans
 * sends them from its nine most Republican districts and its Democrats from the
 * other end, which is the ranking an election flips seats along.
 * The authored `incumbentParty` is deliberately not read — it is a sign-of-lean
 * reading fixed at authoring time, so it would disagree with the chamber the
 * moment a midterm moved a seat, and the district page would print a holder the
 * delegation says does not exist.
 *
 * Undefined for a district whose seat the delegation puts with an independent,
 * and for a state whose delegation has not been apportioned: neither is a major
 * party holding the seat, and neither is a party this can name.
 */
export function districtHolder(campaign, district) {
    const row = worldDataset.districts.find((entry) => entry.id === district);
    if (!row)
        return undefined;
    const house = campaign.states[row.state]?.delegation?.house;
    // A state with no apportioned seats has no holder to name. That is the
    // District of Columbia, whose delegate is not one of the 435 and is not a seat
    // the apportionment above ever hands to a caucus. A single-district state's
    // at-large seat carries `number: 0` and is a seat, which is why the test is the
    // state's apportionment rather than the district's number.
    if (!house || house.seats === 0)
        return undefined;
    const anchor = campaign.congress.caucusAnchor;
    const democrats = anchor === "democrat" ? house.administration : house.opposition;
    const republicans = anchor === "democrat" ? house.opposition : house.administration;
    const ordered = districtsOf(row.state);
    const rank = ordered.findIndex((entry) => entry.id === district);
    if (rank < 0)
        return undefined;
    if (rank < democrats)
        return "democrat";
    if (rank >= ordered.length - republicans)
        return "republican";
    return undefined;
}
