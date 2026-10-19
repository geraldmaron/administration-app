import { seatCongressMembers, withCongressMemberOffices } from "./congress-members.js";
import { CHAMBERS } from "./congress.js";
import { withCommittees } from "./committees.js";
import { seatLeadership } from "./hill.js";
import { CONGRESS_CONVENES_DAY, CONGRESS_CONVENES_MONTH, campaignFoundingDate, turnOnDate, } from "./clock.js";
import { apportionDelegations, senateHolderExcept } from "./delegations.js";
import { administrationAlignment, otherMajorParty } from "./party.js";
// What an election does to the chambers, and when the chambers it made take
// their seats.
//
// Split out of elections.ts, which settles the vote: this half is the seat
// arithmetic — how far a national count moves a chamber, which third of the
// Senate was even on the ballot, and the nine weeks between a November and the
// January 3 the winners are sworn in on. Behavior is unchanged by the move;
// elections.ts re-exports everything public here, so the barrel is untouched.
/** One line of coverage, for anything a national night files. */
export function coverage(summary, turn) {
    return {
        turn,
        kind: "press",
        visibility: "public",
        headline: summary,
    };
}
/** A packet the world produced rather than the President. */
export function simulated(turn, summary, effects) {
    return { source: "simulate", actor: "world", turn, narration: { summary }, effects };
}
/**
 * The seats a president's party loses for being the president's party.
 *
 * Structural rather than earned: the out party turns out at a midterm and the
 * in party does not, and an administration on exactly even standing still comes
 * back to a smaller caucus. Without it the midterm would be a referendum that a
 * merely adequate presidency wins, which is not what a midterm is.
 */
const MIDTERM_PENALTY = 0.04;
/**
 * How far the count moves seats, per chamber.
 *
 * Most seats are not competitive, which is the fact these numbers encode. A
 * national swing of ten points does not move ten percent of a chamber; it
 * moves the handful of districts that were close, and the rest hold whatever
 * they held. The first version read the swing against the *whole* chamber and
 * produced midterms that moved seventy-seven House seats — larger than 1894,
 * every time, in both directions.
 */
const SWING_SENSITIVITY = {
    // Every seat is up, but only the marginal ones are in play. At 0.12 a
    // ten-point national swing costs about ten House seats and a rout costs
    // forty, which is the range the last century actually produced.
    house: 0.12,
    // A third of the chamber faces the voters, and it is apportioned by state
    // rather than by population — so the same national swing moves far less of it.
    senate: 0.05,
};
/**
 * How far a presidential year moves seats, per chamber.
 *
 * Smaller than a midterm's, and with no structural penalty against it: a
 * presidential election is not a referendum on the incumbency the way a midterm
 * is, and the party that wins the White House brings a handful of seats in with
 * it rather than a wave. At 0.08 a five-point win carries about three House
 * seats and a landslide about eight, which is the range the last century
 * produced — and the +0.08 standing a win already grants is untouched, so the
 * win is not paid twice.
 */
const COATTAIL_SENSITIVITY = { house: 0.08, senate: 0.03 };
/**
 * How close a state has to be for its senate seat to be in play at all.
 *
 * A national swing does not take Wyoming's seat, and a model that let it would
 * decompose one national count into fifty results the election never produced
 * (the defect the Senate half of this was opened for). A seat may change hands
 * only where the state sits inside this band of even, measured as alignment with
 * the administration rather than as raw lean, so an independent President faces
 * the same map their own standing gives them.
 */
export const SENATE_FLIP_MARGIN = 0.12;
/**
 * Which third of the Senate faces the voters in a November.
 *
 * The classes run on a six-year rotation: Class 1 in 2030, Class 2 in 2032,
 * Class 3 in 2034, and so on. Read off the year rather than counted from the
 * campaign's own start, so a save reloaded mid-term cannot disagree about which
 * seats are up.
 */
export function senateClassUpIn(year) {
    const phase = ((year % 6) + 6) % 6;
    // Anchored on the classes the sourced table was taken against: Class 1 was
    // last elected in 2024 and stands again in 2030, Class 2 in 2026 and 2032,
    // Class 3 in 2028 and 2034.
    if (phase === 2)
        return 1;
    if (phase === 4)
        return 2;
    return phase === 0 ? 3 : undefined;
}
/** Senate seats of the contested class a national swing could actually move. */
function flippableSenateSeats(campaign, seatClass, losing) {
    let count = 0;
    for (const runtime of Object.values(campaign.states)) {
        const seat = runtime.delegation?.senate.find((entry) => entry.seatClass === seatClass);
        if (!seat || seat.party !== losing)
            continue;
        if (Math.abs(administrationAlignment(runtime.lean, campaign.congress)) < SENATE_FLIP_MARGIN)
            count += 1;
    }
    return count;
}
/** What the country does to one chamber, in seats. */
export function seatSwing(share, chamber, composition, campaign, kind = "midterm") {
    const sensitivity = kind === "midterm" ? SWING_SENSITIVITY[chamber] : COATTAIL_SENSITIVITY[chamber];
    const penalty = kind === "midterm" ? MIDTERM_PENALTY : 0;
    const net = (share - 0.5) * 2 * sensitivity - penalty;
    const moved = chamber === "house" && campaign && Object.keys(campaign.states).length > 0
        ? Math.round(houseSeatsMoved(campaign, net))
        : Math.round(composition.seats * net);
    const bounded = Math.max(-composition.administration, Math.min(composition.opposition, moved));
    if (chamber !== "senate" || !campaign)
        return bounded;
    // Only the class that is up can change hands, and only the close states in it.
    const seatClass = senateClassUpIn(campaign.calendar.year);
    if (seatClass === undefined)
        return 0;
    const anchor = campaign.congress.caucusAnchor;
    const losing = bounded < 0 ? anchor : otherMajorParty(anchor);
    const room = flippableSenateSeats(campaign, seatClass, losing);
    return Math.sign(bounded) * Math.min(Math.abs(bounded), room);
}
function houseSeatsMoved(campaign, net) {
    let moved = 0;
    for (const runtime of Object.values(campaign.states)) {
        moved += runtime.base.houseSeats * net * (1 - Math.abs(runtime.lean));
    }
    return moved;
}
/**
 * Recompose the chambers from a swing, reseat leadership, and re-apportion every
 * state's delegation so the table matches the new composition exactly.
 *
 * The swing form. `reseat` below is the arithmetic, and the January 3 seating
 * takes it with the chambers the November already decided rather than a second
 * swing — re-deriving a settled result from the lame-duck weeks is exactly the
 * defect that separating the two prevents.
 */
export function recompose(congress, swing, people, nation, turn, states, senateClassUp) {
    const chambers = Object.fromEntries(CHAMBERS.map((chamber) => {
        const held = congress.chambers[chamber];
        return [
            chamber,
            {
                ...held,
                administration: held.administration + swing[chamber],
                opposition: held.opposition - swing[chamber],
            },
        ];
    }));
    return reseat(congress, chambers, people, nation, turn, states, senateClassUp);
}
/** The reseating itself: leadership, panels and every state's delegation, on given chambers. */
export function reseat(congress, chambers, people, nation, turn, states, senateClassUp) {
    // A chamber that changes hands changes who runs it. The reseating keeps every
    // incumbent whose caucus is still the right one, and their rapport with
    // them: a president who spent a year on the Speaker has not lost that work
    // because the Senate flipped.
    const swung = { ...congress, chambers };
    // The panels are reseated the same way: a Senate that changed hands hands every
    // gavel to the member who was ranking on it the week before.
    const seated = seatLeadership(swung, people, nation, turn);
    const led = { ...swung, leadership: seated.leadership };
    const next = withCommittees(led, people, nation, turn);
    // The classes nobody voted on keep the party they were elected with. Without
    // this the apportionment re-derives all hundred seats from the night's count
    // and quietly moves seats that were not on any ballot.
    const delegations = apportionDelegations(next, states, senateClassUp === undefined ? undefined : senateHolderExcept(senateClassUp, states));
    const delegationEffects = Object.entries(delegations).map(([id, delegation]) => ({
        kind: "state",
        state: id,
        setDelegation: delegation,
        reason: "A new Congress was seated, and every state's delegation was reapportioned.",
    }));
    const memberStates = Object.fromEntries(Object.entries(states).map(([id, runtime]) => [id, { ...runtime, delegation: delegations[id] }]));
    const members = next.members ? seatCongressMembers(next, memberStates, people, turn) : next;
    const officePeople = withCongressMemberOffices(people, members);
    const officeEffects = Object.values(people).flatMap((runtime) => runtime.currentRole !== officePeople[runtime.base.id]?.currentRole
        ? [{ kind: "person", person: runtime.base.id, changes: { currentRole: officePeople[runtime.base.id]?.currentRole } }] : []);
    return { congress: members, delegationEffects: [...delegationEffects, ...officeEffects], tieEffects: seated.ties };
}
/** The chambers the country just elected, parked on `seatingOn` until January 3. */
export function withPendingSeating(campaign, swing) {
    const seats = Object.fromEntries(CHAMBERS.map((chamber) => {
        const held = campaign.congress.chambers[chamber];
        return [
            chamber,
            {
                ...held,
                administration: held.administration + swing[chamber],
                opposition: held.opposition - swing[chamber],
            },
        ];
    }));
    const convenes = congressConvenesAfter(campaign.calendar);
    return {
        ...campaign.congress,
        seatingOn: {
            house: seats.house,
            senate: seats.senate,
            seatsTurn: turnOnDate(campaignFoundingDate(campaign), convenes),
        },
    };
}
/** January 3 of the year after a November election, when the new Congress convenes. */
function congressConvenesAfter(election) {
    return { year: election.year + 1, month: CONGRESS_CONVENES_MONTH, day: CONGRESS_CONVENES_DAY };
}
/**
 * The oath the chambers take, nine weeks after the country chose them.
 *
 * Applied as a whole composition rather than as a second swing: the country
 * already decided the numbers in November, and re-deriving them here would let
 * the lame-duck weeks change a result that was already counted. The senate is
 * reapportioned with the two classes that were not up held where they are, and
 * the class that was up read off the election's own year.
 */
export function seatingPacket(campaign, turn) {
    const pending = campaign.congress.seatingOn;
    const summary = "The Congress the country elected in November is sworn in, and the chambers that governed the lame-duck weeks give up the floor.";
    const { seatingOn: _retired, ...rest } = campaign.congress;
    const seated = reseat(rest, { house: pending.house, senate: pending.senate }, campaign.people, campaign.founding.nation, turn, campaign.states, 
    // The class that was up is a fact about the November the chambers were
    // chosen in, not about the January they are sworn in: read off the election's
    // own year so nothing has to be carried for nine weeks to know it.
    senateClassUpIn(campaign.calendar.year - 1));
    return simulated(turn, summary, [
        { kind: "congress", set: seated.congress },
        ...seated.tieEffects,
        ...seated.delegationEffects,
        { kind: "feed", items: [coverage(summary, turn)] },
    ]);
}
