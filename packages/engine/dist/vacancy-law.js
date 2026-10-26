import { addDays, compareDates, federalElectionDay } from "./clock.js";
// How a seat in Congress emptied by death is filled, by the law of the state it
// belongs to. Article I, section 2 has the governor issue writs of election for
// a House seat, and 2 U.S.C. 8 leaves the timing to state law; the Seventeenth
// Amendment does the same for the Senate and lets a legislature empower its
// governor to appoint until the people fill the seat.
//
// Timing figures were measured, not assumed. The House numbers come from the
// 36 House seats emptied by a death and filled by special election since 2001
// (Wikipedia, "List of special elections to the United States House of
// Representatives", opened 2026-10-25): median 125 days from the death to the
// special election, interquartile range 90 to 170, shortest 57.
/** Median days from a member's death to the special election that fills the House seat. */
export const HOUSE_SPECIAL_ELECTION_DAYS = 125;
/** The shortest death-to-special gap observed: a general election nearer than this is too close to carry the seat. */
export const SPECIAL_ELECTION_MIN_DAYS = 57;
/**
 * Median days from a senator's death to the governor's appointment: Thomas to
 * Barrasso 18, Kennedy to Kirk 30, Byrd to Goodwin 18, Inouye to Schatz 9,
 * Lautenberg to Chiesa 3, McCain to Kyl 10, Feinstein to Butler 2 (death and
 * appointment dates from Wikipedia's lists of members who died in office and
 * of appointed senators, opened 2026-10-25).
 */
export const SENATE_APPOINTMENT_DAYS = 10;
const NEXT_GENERAL = (cutoffDays = 0, sameParty = false) => ({ appoints: true, cutoffDays, ...(sameParty ? { sameParty: true } : {}) });
const EXPEDITED = (appoints, specialWithinDays = HOUSE_SPECIAL_ELECTION_DAYS) => ({ appoints, specialWithinDays });
// NCSL, "Vacancies in the United States Senate", updated 2026-07-29 (opened
// 2026-10-25 through the Internet Archive): 35 states appoint until the next
// statewide general election, 11 of them requiring an appointee of the vacating
// senator's party; 15 hold an expedited special, four of which (Kentucky, North
// Dakota, Rhode Island, Wisconsin) allow no interim appointment. Connecticut's
// governor may appoint only late in a term, so it is treated as electing. A
// cutoff stated against a state primary is converted to days before November at
// that primary's usual month, which is an approximation; where a statute sets a
// window the latest permitted day is used, and where it sets none ("forthwith",
// "as early as practicable", "not specified") the House median stands in.
export const SENATE_VACANCY_LAW = {
    AL: EXPEDITED(true), AK: EXPEDITED(true, 150), AZ: NEXT_GENERAL(240, true), AR: NEXT_GENERAL(120),
    CA: NEXT_GENERAL(300), CO: NEXT_GENERAL(0, true), CT: EXPEDITED(false, 227), DE: NEXT_GENERAL(),
    FL: NEXT_GENERAL(), GA: NEXT_GENERAL(40), HI: NEXT_GENERAL(110, true), ID: NEXT_GENERAL(30),
    IL: NEXT_GENERAL(), IN: NEXT_GENERAL(74), IA: NEXT_GENERAL(89), KS: NEXT_GENERAL(0, true),
    KY: EXPEDITED(false), LA: EXPEDITED(true), ME: NEXT_GENERAL(210), MD: NEXT_GENERAL(290, true),
    MA: EXPEDITED(true, 160), MI: NEXT_GENERAL(120), MN: NEXT_GENERAL(160), MS: EXPEDITED(true, 115),
    MO: NEXT_GENERAL(), MT: NEXT_GENERAL(0, true), NE: NEXT_GENERAL(95), NV: NEXT_GENERAL(0, true),
    NH: NEXT_GENERAL(), NJ: NEXT_GENERAL(70), NM: NEXT_GENERAL(30), NY: NEXT_GENERAL(200),
    NC: NEXT_GENERAL(60, true), ND: EXPEDITED(false, 95), OH: NEXT_GENERAL(180), OK: EXPEDITED(true),
    OR: EXPEDITED(true, 150), PA: NEXT_GENERAL(90), RI: EXPEDITED(false), SC: NEXT_GENERAL(100),
    SD: NEXT_GENERAL(90), TN: NEXT_GENERAL(), TX: EXPEDITED(true), UT: NEXT_GENERAL(0, true),
    VT: EXPEDITED(true, 180), VA: NEXT_GENERAL(120), WA: EXPEDITED(true), WV: NEXT_GENERAL(265, true),
    WI: EXPEDITED(false, 77), WY: NEXT_GENERAL(0, true),
};
/** The first even-year federal general election on or after `earliest`. */
function generalElectionFrom(earliest) {
    let year = earliest.year + (earliest.year % 2);
    while (compareDates(federalElectionDay(year), earliest) < 0)
        year += 2;
    return federalElectionDay(year);
}
/** A special election `withinDays` out, or the general election if one comes first and is not too close to carry it. */
export function specialElectionDate(since, withinDays) {
    const special = addDays(since, withinDays);
    const general = generalElectionFrom(addDays(since, SPECIAL_ELECTION_MIN_DAYS));
    return compareDates(general, special) < 0 ? general : special;
}
/** The day a Senate seat emptied on `since` goes to the voters under its state's law. */
export function senateElectionDate(state, since) {
    const law = SENATE_VACANCY_LAW[state];
    if (law.specialWithinDays !== undefined)
        return specialElectionDate(since, law.specialWithinDays);
    return generalElectionFrom(addDays(since, Math.max(1, law.cutoffDays ?? 0)));
}
/**
 * The party a statewide vote returns: a Senate special, or a separately
 * elected successor to a governor. The state's lean decides, except
 * inside the band where a statehouse counts as contested (the governors'
 * six-point flip margin), where the party holding the seat keeps it.
 */
export function specialElectionParty(lean, holding) {
    if (holding === "independent" || Math.abs(lean) < 0.06)
        return holding;
    return lean < 0 ? "democrat" : "republican";
}
// --- Who wins a House special ----------------------------------------------
//
// Of the 132 House special elections held from 2001 to October 2026, 19 changed
// party (the same Wikipedia list, re-opened 2026-10-25 and counted row by row:
// the vacating member's party against the winner's; an earlier count of 13 of
// 106 dropped every row whose vacancy date the parser missed). A seat flips on
// its own lean and the national mood: `seatLeans` (house-seats.ts) is the lean
// a general election reads, the dataset's authored district leans moved to the
// seats as held, which are a ranked spread rather than a measured voting index.
/** The logistic scale on the holder's margin that returns 19 flips in 132 across the House's seats at an even national mood. */
export const HOUSE_FLIP_SCALE = 0.15;
/**
 * The chance a House special changes party. `margin` is the holding party's
 * edge in the seat's lean, plus the national mood toward that party
 * (approval's distance from even, for the President's party and against the
 * other): how far it reaches a special is a design reading, not a measured one.
 */
export function houseFlipChance(margin) {
    return 1 / (1 + Math.exp(margin / HOUSE_FLIP_SCALE));
}
/** The holding party's margin in a House seat of this lean at this national mood. */
export function houseHoldMargin(lean, holding, mood) {
    return (holding === "democrat" ? -lean : lean) + mood;
}
const SEPARATELY_ELECTED = [
    "AL", "AR", "CA", "DE", "GA", "ID", "LA", "MS", "MO", "NV", "NC", "OK", "RI", "TX", "VT", "VA", "WA",
];
const OTHER_SUCCESSORS = {
    OR: "secretary of state", WY: "secretary of state",
    ME: "president of the state senate", NH: "president of the state senate", WV: "president of the state senate",
    TN: "speaker of the state senate",
};
export function governorSuccessor(state) {
    const other = OTHER_SUCCESSORS[state];
    if (other)
        return { title: other, ticket: false };
    return { title: "lieutenant governor", ticket: !SEPARATELY_ELECTED.includes(state) };
}
