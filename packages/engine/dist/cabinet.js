import { selectCabinet, selectPerson } from "./state.js";
import { createRngStreams } from "./rng.js";
import { markedFlags } from "./marked-flags.js";
import { weeksFor } from "./pace.js";
import { selectCampaignClock } from "./clock.js";
import { revoltPacket } from "./cabinet-revolt.js";
import { isDeparting } from "./cabinet-departing.js";
import { transitionPackets } from "./cabinet-transition.js";
// Whether anything happens to this minister at all this turn, before which
// outcome is decided — mirrors takesInitiative's shape (npc-turn.ts): a rate
// derived from a live attribute, drawn once per minister per turn.
//
// Sized per chair, so a cabinet's breaks scale with how many chairs it seats
// rather than with a figure set for the whole room. A chair at a founded
// cabinet's median loyalty (0.66) and integrity (0.6), with no trait, breaks
// about once a term, which puts a sixteen-seat US cabinet at about ten leaks
// and three departures a term. At 0.35 the same cabinet leaked over 200 times a
// term, and those leaks alone took the country's standing abroad to zero within
// a year whatever the President did.
const BASE_RISK = 0.022;
// A corrupt minister is more tempted to sell what they know; a principled one
// less so, even at the same loyalty. Shares of the base rather than amounts
// added to it, so a trait keeps its weight when the base is recalibrated: added
// to a base this small, the principled nudge would make a chair unbreakable and
// the corrupt one would make it eight times as likely to break.
const CORRUPT_RISK_SHARE = 0.43;
const PRINCIPLED_RISK_SHARE = -0.43;
// A reclusive minister isn't more scrupulous than a talkative one, but they
// have no relationship with the press to begin with, so there's no channel
// for a leak to travel down. The share is smaller than principled's — this is
// an opportunity gap, not a moral one, and stacks with corrupt/principled
// rather than overriding them: a reclusive, corrupt minister still sells what
// they know, just less easily.
const RECLUSIVE_RISK_SHARE = -0.23;
// How far personal integrity can hold a disloyal minister in check. Capped
// below 1 deliberately: no one is proof against their own disaffection, and a
// minister who cannot be moved at all is a seat with no story in it.
const INTEGRITY_RESTRAINT = 0.6;
// Ambition only tips into an internal rival when it is not held in check by
// loyalty — an ambitious, loyal minister just wants promotion, not a
// following of their own. Below the resignation bar with no such ambition,
// a disloyal minister simply leaves rather than fights.
//
// The two loyalty bars sit inside the range a founding actually seats. A
// founded US cabinet runs from about 0.44 at its least loyal chair to a median
// near 0.66, and loyalty only falls when the President overrules the room
// (loyalty.ts). Bars at 0.35 and 0.2 sat under every chair the founding could
// seat, so no President who kept their counsel ever lost a Secretary and the
// sweep could only leak. About one founded chair in eight sits under the
// resignation bar and three in ten under the challenge bar, and a chair at the
// median reaches the resignation bar after five or six overrulings.
const CHALLENGE_AMBITION_FLOOR = 0.65;
const CHALLENGE_LOYALTY_CEILING = 0.6;
const RESIGNATION_LOYALTY_CEILING = 0.55;
// Ambition alone doesn't build a following; charisma is what a rival needs to
// actually be dangerous. A charismatic minister mounts a real challenge at a
// lower ambition bar than an equally disloyal but charmless one would need.
const CHARISMATIC_AMBITION_DISCOUNT = 0.1;
/**
 * The share of cabinet seats a year whose holder announces they are leaving
 * for ordinary reasons, loyal chair or not: exhaustion, a private-sector
 * offer, health, family. The announcement opens a transition
 * (cabinet-transition.ts) rather than emptying the chair.
 *
 * The quietest first term in the record lost two heads of executive
 * departments: the 2001-2005 cabinet, one chosen for loyalty (Brookings'
 * Cabinet turnover tracker on brookings.edu, its table of Cabinet turnover by
 * year of term, and the Datawrapper series behind its chart,
 * datawrapper.dwcdn.net/PXOek/2, both read 2026-09-28: first-term
 * departures 1981 6, 1989 8, 1993 4, 2001 2, 2009 3, 2017 14).
 * No President has got under two a term, so two a term across the sixteen
 * chairs this sweep rolls is the rate a cabinet loses members at whatever the
 * President does. The loyalty-driven exits the sweep already draws come on
 * top of it, which is why the record's other terms run higher.
 */
const ORDINARY_EXITS_PER_SEAT_YEAR = 2 / (16 * 4);
/** The same hazard as a weekly draw. */
export const ORDINARY_EXIT_RATE = 1 - (1 - ORDINARY_EXITS_PER_SEAT_YEAR) ** (1 / 52);
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
export function cabinetRiskRate(person) {
    const disloyalty = 1 - person.loyalty;
    let traitShare = 0;
    if (person.traits.includes("corrupt"))
        traitShare += CORRUPT_RISK_SHARE;
    if (person.traits.includes("principled"))
        traitShare += PRINCIPLED_RISK_SHARE;
    if (person.traits.includes("reclusive"))
        traitShare += RECLUSIVE_RISK_SHARE;
    // Disloyalty is the motive; integrity is what stands between the motive and
    // the act. The two are genuinely different readings — a minister can have
    // lost faith in the government and still not sell what they know — and
    // without this, `integrity` was a number the dossier printed and no rule
    // ever consulted.
    return clamp01(disloyalty * BASE_RISK * (1 + traitShare) * (1 - person.integrity * INTEGRITY_RESTRAINT));
}
/**
 * What the Chief of Staff's hold on the building is worth against the week's
 * breaks, as a signed share of the rate: positive holds the room together,
 * negative lets it fray.
 *
 * Read off the person actually running the White House, confirmed or acting,
 * from the two things that job is: judgment about what reaches the President
 * and the room's confidence that the chief speaks for them. Centered on the
 * chief a founding seats by default, so the term separates a strong pick from
 * a weak one rather than retuning every cabinet, and bounded so no chief can
 * hold a room that has turned or lose one that has not.
 */
const DISCIPLINE_BOUND = 0.15;
const DISCIPLINE_CENTER = 0.75;
const DISCIPLINE_SLOPE = 2;
const WHITE_HOUSE = "INST-PRESIDENCY";
/** The Chief of Staff's reading, 0..1: competence and loyalty, equally. Undefined with nobody in the job. */
export function chiefOfStaffReading(campaign) {
    const office = campaign.institutions[WHITE_HOUSE];
    const chief = office?.leader ?? office?.actingLeader;
    const holder = chief ? campaign.people[chief] : undefined;
    if (!holder?.alive)
        return undefined;
    return (holder.base.competence + holder.base.loyalty) / 2;
}
export function chiefOfStaffDiscipline(campaign) {
    const reading = chiefOfStaffReading(campaign);
    if (reading === undefined)
        return 0;
    const raw = DISCIPLINE_SLOPE * (reading - DISCIPLINE_CENTER);
    return Math.round(Math.max(-DISCIPLINE_BOUND, Math.min(DISCIPLINE_BOUND, raw)) * 10000) / 10000 + 0;
}
/** The odds this Secretary breaks this week, under the chief who is running the building. */
export function breakRateOf(campaign, person) {
    return clamp01(cabinetRiskRate(person) * (1 - chiefOfStaffDiscipline(campaign)));
}
export function cabinetOutcomeFor(person) {
    const ambitionFloor = person.traits.includes("charismatic")
        ? CHALLENGE_AMBITION_FLOOR - CHARISMATIC_AMBITION_DISCOUNT
        : CHALLENGE_AMBITION_FLOOR;
    if (person.ambition >= ambitionFloor && person.loyalty <= CHALLENGE_LOYALTY_CEILING)
        return "challenge";
    if (person.loyalty <= RESIGNATION_LOYALTY_CEILING)
        return "resignation";
    return "leak";
}
/**
 * How this chair breaks, given who is sitting in it now.
 *
 * A Secretary who already leads a bloc of their own has nothing left to
 * declare, so a second break is not a second challenge: one prudent two-term
 * run counted thirteen repeat challenges from the same chairs, each billed to
 * the country's order as if a new faction had formed. It is a resignation. A
 * rival who has declared and still cannot carry the room takes the bloc out of
 * the building rather than going on leaking from inside it, and counting that
 * break as a leak left a founded cabinet losing fewer than two members a term
 * however far its break rate was raised: a raised rate only added leaks from
 * chairs that were never going to leave.
 */
export function cabinetOutcomeOf(holder) {
    const outcome = cabinetOutcomeFor(holder.base);
    return outcome === "challenge" && holder.affiliation !== undefined ? "resignation" : outcome;
}
/** The flag authored content gates on: `cabinet-departure:<how>:<role>`. */
export function departureFlag(departure, role) {
    return `${DEPARTURE_PREFIX}:${departure}:${role}`;
}
/** The same fact about one person, so a file can say what became of them: `cabinet-departure:<how>:<role>:<person>`. */
export function personDepartureFlag(departure, role, person) {
    return `${departureFlag(departure, role)}:${person}`;
}
const DEPARTURE_PREFIX = "cabinet-departure";
/**
 * What became of a person who used to hold a chair, or nothing if they never did.
 *
 * Read off the flags rather than off a field on the person, for the reason the
 * flags exist: a departure is an event in the campaign's record, the corpus can
 * already gate on one, and a person record that carried it would be a second
 * copy of a fact the record already holds. The most recent departure wins,
 * which is the honest answer for somebody dismissed from one seat and
 * reappointed to another before walking out of that one.
 */
export function selectFormerService(campaign, person) {
    const held = Object.keys(campaign.player.flags).filter((flag) => campaign.player.flags[flag] === true && flag.endsWith(`:${person}`));
    for (const flag of held.reverse()) {
        const [prefix, departure, role, subject] = flag.split(":");
        if (prefix !== DEPARTURE_PREFIX || subject !== person)
            continue;
        if (departure !== "resigned" && departure !== "dismissed" && departure !== "died")
            continue;
        return { person, role: role, departure };
    }
    return undefined;
}
/** The effects that empty a chair without ending the person in it. */
export function departureEffects(departure, role, person, turn) {
    return [
        { kind: "cabinet", role },
        // The seat and the person are two facts and both have to move, or someone
        // who has left still reads as seated to everything that walks the cast
        // rather than the cabinet map.
        { kind: "person", person, changes: { currentRole: undefined, loyaltyAtAppointment: undefined } },
        // Marked, because a departure is exactly the kind of durable flag a
        // callback wants to gate on by age — "the Secretary who walked out three
        // months ago" is a different week from the one they walked out in. An
        // unmarked flag reads as old by construction, so the first `agedAtLeast`
        // written against it would fire the week the chair emptied.
        {
            kind: "flag",
            set: markedFlags([departureFlag(departure, role), personDepartureFlag(departure, role, person)], turn),
        },
    ];
}
// Who this phase actually rolls for. Read by the phase and by the dossier's
// exposure reading alike, because the two disagreeing is the specific failure
// worth designing out: a screen that prints a weekly risk for a chair the
// engine never draws against is stating a fact the simulation does not hold.
//
// The head of state's own seat is the player, not an appointee — nothing here
// leaks against the government, resigns from being themselves, or becomes
// their own rival. A Secretary serving out an announced departure has already
// decided to go and is not drawn against again.
function exposedHolder(state, role) {
    if (role === state.founding.leadRole)
        return undefined;
    const seated = selectCabinet(state)[role];
    const holder = seated ? selectPerson(state, seated) : undefined;
    return holder?.alive && !isDeparting(state, role, holder.base.id) ? holder : undefined;
}
/** The chance of at least one break in `weeks` independent weekly draws at `rate`. */
export function breakChanceOver(rate, weeks) {
    return weeks <= 0 ? 0 : 1 - (1 - rate) ** weeks;
}
export function selectCabinetExposure(campaign, role) {
    const holder = exposedHolder(campaign, role);
    if (!holder)
        return undefined;
    const rate = breakRateOf(campaign, holder.base);
    const weeksLeft = Math.max(0, weeksFor(selectCampaignClock(campaign).daysLeftInTerm, "ceil"));
    return {
        role,
        person: holder.base.id,
        rate,
        outcome: cabinetOutcomeOf(holder),
        weeksLeft,
        restOfTerm: breakChanceOver(rate, weeksLeft),
    };
}
/**
 * The same exposure asked for by person, for a surface that has a minister
 * rather than a chair.
 *
 * Takes the first seat that yields a reading rather than the first seat that
 * matches the person: the player's own persona holds a chair too, and matching
 * on the name alone would answer for that seat and report no exposure for the
 * ministry they actually run.
 */
export function selectCabinetExposureFor(campaign, person) {
    const cabinet = selectCabinet(campaign);
    for (const seat of Object.keys(cabinet)) {
        if (cabinet[seat] !== person)
            continue;
        const exposure = selectCabinetExposure(campaign, seat);
        if (exposure)
            return exposure;
    }
    return undefined;
}
// The turn phase: one independent draw per living, seated minister. Ministers
// do not react to each other's fates within a turn — unlike npcActionPhase's
// nations — so packets are all computed against the same pre-phase state.
export const cabinetConsequencesPhase = (state) => {
    const streams = createRngStreams(state.seed);
    const turn = state.turn + 1;
    const cabinet = selectCabinet(state);
    const packets = [...transitionPackets(state, turn)];
    for (const role of Object.keys(cabinet)) {
        const holder = exposedHolder(state, role);
        if (!holder)
            continue;
        const person = holder.base;
        const roll = streams.stream("cabinet", person.id, state.turn).next();
        const outcome = cabinetOutcomeOf(holder);
        // The ordinary exit is read off the bottom of the same roll, so for a chair
        // that would only have leaked it takes the place of the leak rather than
        // adding a second draw, and a chair already on its way out by resignation
        // or challenge goes that way instead.
        const ordinary = outcome === "leak" && roll < ORDINARY_EXIT_RATE;
        if (!ordinary && roll >= breakRateOf(state, person))
            continue;
        // A separate stream from the risk roll above, so the wording is drawn
        // without moving the draw that decides whether anything happened at all.
        const voices = streams.stream("cabinet-voice", person.id, state.turn);
        packets.push(revoltPacket(state, ordinary ? "ordinary" : outcome, turn, role, person, voices));
    }
    return packets;
};
// A bloc's life, from the badge to its end, has its own module; these names
// are where every caller has always imported them from.
export { factionEffects, factionFlag, factionPressure, projectFactionReconciliation, reconcileFaction, reconciledFlag, rivalFaction, selectFactions, } from "./cabinet-faction.js";
