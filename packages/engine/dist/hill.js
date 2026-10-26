import { STATE_IDS } from "@admin/world";
import { BELIEF_WEIGHT, partyReading } from "./party-beliefs.js";
import { administrationReach, partyForCaucus, usTicket } from "./party.js";
import { ideologyCloseness, usPartyOfPerson } from "./cast-fit.js";
import { figureRapport, withTie } from "./ties.js";
export const HILL_POSTS = [
    {
        id: "post-house-speaker",
        title: "Speaker of the House",
        chamber: "house",
        side: "majority",
        role: "role-congressional-leader",
        influence: 0.14,
        brief: "Sets the floor calendar, which decides what the House votes on and what it never reaches.",
    },
    {
        id: "post-house-majority-leader",
        title: "House Majority Leader",
        chamber: "house",
        side: "majority",
        role: "role-congressional-leader",
        influence: 0.09,
        brief: "Runs the floor day to day and counts the majority's votes before anybody else does.",
    },
    {
        id: "post-house-minority-leader",
        title: "House Minority Leader",
        chamber: "house",
        side: "minority",
        role: "role-congressional-leader",
        influence: 0.07,
        brief: "Holds the minority together, and decides whether any of it is available to this president.",
    },
    {
        id: "post-senate-majority-leader",
        title: "Senate Majority Leader",
        chamber: "senate",
        side: "majority",
        role: "role-congressional-leader",
        influence: 0.13,
        brief: "Controls the Senate calendar, and therefore controls every confirmation and every treaty.",
    },
    {
        id: "post-senate-minority-leader",
        title: "Senate Minority Leader",
        chamber: "senate",
        side: "minority",
        role: "role-congressional-leader",
        influence: 0.08,
        brief: "The forty votes that decide whether anything gets a hearing on the terms it was sent up on.",
    },
    {
        id: "post-appropriations-chair",
        title: "Chair of the Appropriations Committee",
        chamber: "house",
        side: "majority",
        role: "role-committee-chair",
        influence: 0.06,
        brief: "Every dollar the administration spends is written down first in this member's committee.",
    },
    {
        id: "post-armed-services-chair",
        title: "Chair of the Armed Services Committee",
        chamber: "senate",
        side: "majority",
        role: "role-committee-chair",
        influence: 0.06,
        brief: "Authorizes the force structure, and asks first about any use the president has made of it.",
    },
];
const POST_BY_ID = new Map(HILL_POSTS.map((post) => [post.id, post]));
export function hillPost(id) {
    return POST_BY_ID.get(id);
}
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/**
 * Which caucus holds the majority of a chamber, on the seats as they stand.
 *
 * Control is a majority of the members who caucus with a side, and the
 * independents caucus with the Democrats, as every independent senator of the
 * last two decades has. Given the anchor, they are counted where they sit;
 * without it they are counted out of both sides, which is what a caller that
 * does not know which side is which can honestly do. A tie goes to the
 * administration, whose Vice President breaks it: that is the Senate's rule
 * only, so a caller asking about the House asks `chamberMajority`.
 */
export function majorityCaucus(composition, caucusAnchor) {
    const sides = caucusSides(composition, caucusAnchor);
    return sides.administration >= sides.opposition ? "administration" : "opposition";
}
function caucusSides(composition, caucusAnchor) {
    return {
        administration: composition.administration + (caucusAnchor === "democrat" ? composition.independent : 0),
        opposition: composition.opposition + (caucusAnchor === "republican" ? composition.independent : 0),
    };
}
/**
 * Which caucus holds a chamber, with each chamber's own way of settling a tie.
 *
 * A tied Senate is organized by the administration's side because the Vice
 * President breaks the tie. A tied House has nobody to break it: the Speaker is
 * elected by a majority of the members voting, and until one side finds that
 * majority the House stays with the caucus holding the Speakership. Only before
 * a Speaker has ever been seated does the tie fall to the side whose own party
 * has more members, and past that to the administration, so the answer is
 * never undefined.
 */
export function chamberMajority(congress, chamber) {
    const composition = congress.chambers[chamber];
    const majority = majorityCaucus(composition, congress.caucusAnchor);
    const sides = caucusSides(composition, congress.caucusAnchor);
    if (chamber === "senate" || sides.administration !== sides.opposition)
        return majority;
    const speaker = congress.leadership.find((figure) => figure.post === "post-house-speaker");
    if (speaker)
        return speaker.caucus;
    return composition.opposition > composition.administration ? "opposition" : "administration";
}
function caucusFor(congress, chamber, side) {
    const majority = chamberMajority(congress, chamber);
    if (side === "majority")
        return majority;
    return majority === "administration" ? "opposition" : "administration";
}
// --- Where a member starts, and where they settle ---------------------------
/**
 * How far a member's own caucus carries them from the room's disposition.
 *
 * Real but not decisive in either direction: a president's own side is where
 * they are first refused, and the other side is where a working majority is
 * eventually found. A member pinned to their caucus would make the whole
 * lobbying question moot before it was asked.
 */
const CAUCUS_TILT = 0.16;
/**
 * What one member settles at, absent anything the president does about them.
 *
 * Read off the room plus their caucus plus who they are, so that a disposition
 * moved by a phone call decays back toward a member's own nature rather than
 * back to a number that has nothing to do with them. Ambition pulls against the
 * administration in both caucuses: a member with a future of their own is a
 * member with a reason not to be the president's. When the caller's act carries
 * a domestic signature, the caucus ticket's reading of it is a further nudge: a
 * co-partisan bloc costs a president less for an act its own platform is for.
 *
 * The tilt toward the administration is scaled by reach, so a president with no
 * party gets a Speaker who is nearer their politics than the other side's and
 * still not theirs. The tilt away is not scaled: nothing about an independent
 * presidency makes the far caucus friendlier.
 */
export function figureTarget(roomDisposition, figure, person, caucusBeliefs, signature, standing) {
    const belief = caucusBeliefs !== undefined && signature !== undefined
        ? BELIEF_WEIGHT * partyReading(caucusBeliefs, signature)
        : 0;
    return round3(clamp01(rawCaucusTarget(roomDisposition, figure.caucus, person, standing) + belief));
}
function rawCaucusTarget(roomDisposition, caucus, person, standing) {
    const reach = standing ? administrationReach(standing.administrationParty) : 1;
    const tilt = caucus === "administration" ? CAUCUS_TILT * reach : -CAUCUS_TILT;
    const character = person ? (0.5 - person.ambition) * 0.12 + (person.loyalty - 0.5) * 0.08 : 0;
    return roomDisposition + tilt + character;
}
/**
 * The same reading for a member who holds no leadership post.
 *
 * A committee chair is a member of a caucus with a character, not a Speaker,
 * and their reading of an administration is the room plus those two things.
 * Kept here rather than in the committee file so that every member of Congress
 * whose disposition the game reads is read by one rule.
 */
export function caucusTarget(roomDisposition, caucus, person, standing) {
    return round3(clamp01(rawCaucusTarget(roomDisposition, caucus, person, standing)));
}
/**
 * The platform the caucus a member sits in runs on.
 *
 * Read off the anchor rather than off the member: a Speaker's caucus reading of
 * a bill is their party's, which is the whole point of a caucus, and a member
 * whose own ideology sits elsewhere is already priced by the character term.
 * Without a standing to read the anchor from there is no platform to name, and
 * the belief term falls away rather than guessing at one.
 */
function platformOf(caucus, standing) {
    if (!standing)
        return undefined;
    return usTicket(partyForCaucus(caucus, standing.caucusAnchor)).beliefs;
}
/** How far a member moves toward their own settled reading in one week. */
const FIGURE_DRIFT = 0.03;
/**
 * The leadership after a week of it, as the moves in each holder's rapport.
 *
 * Every global signal the room responds to — the polls, a budget that never
 * passed, force used without a vote — reaches these people through the room's
 * own disposition, so there is one account of how an administration is regarded
 * and the members are positions on it rather than a second opinion. A holder
 * who is already where they settle is left out, and so is one the people table
 * does not carry, who has no tie to move.
 */
export function leadershipDrift(leadership, roomDisposition, people, standing, signature) {
    return leadership.flatMap((figure) => {
        const runtime = people[figure.person];
        if (!runtime)
            return [];
        const target = figureTarget(roomDisposition, figure, runtime.base, platformOf(figure.caucus, standing), signature, standing);
        const current = figureRapport(people, figure);
        const gap = target - current;
        const moved = round3(clamp01(Math.abs(gap) < FIGURE_DRIFT ? target : current + Math.sign(gap) * FIGURE_DRIFT));
        if (moved === current)
            return [];
        return [{ kind: "tie", person: figure.person, cause: "A week on the Hill settles them toward where they stand.", rapport: { set: moved } }];
    });
}
// --- What a whip count reads ------------------------------------------------
/**
 * Share of a chamber's seats that move with the state delegations. Soft enough
 * that leadership still dominates the displacement, hard enough that a region
 * turned against the administration shows up in the count.
 */
export const DELEGATION_LEVERAGE = 0.25;
/**
 * Seat-weighted mean of a reading over every state that has an apportioned
 * delegation. Absent or empty tables contribute nothing (mass stays 0 → 0),
 * which is what keeps a pre-delegation save counting votes identically.
 */
export function seatWeightedMean(states, chamber, of) {
    let mass = 0;
    let sum = 0;
    for (const id of STATE_IDS) {
        const runtime = states[id];
        const delegation = runtime?.delegation;
        if (!delegation)
            continue;
        const seats = chamber === "house" ? delegation.house.seats : id === "DC" ? 0 : delegation.senate.length;
        if (seats <= 0)
            continue;
        sum += of(delegation) * seats;
        mass += seats;
    }
    return mass === 0 ? 0 : sum / mass;
}
/**
 * The most the chair is allowed to be worth to the Senate's disposition, either
 * way.
 *
 * Five points, which is a third of what sitting in a caucus is worth
 * (`CAUCUS_TILT`) and under two weeks of working the Speaker. A President of the
 * Senate who served there knows the members; they do not hold the chamber, and a
 * term that could hold it would make the running mate the most consequential
 * choice on the founding screen.
 *
 * Bounded here, at the read, rather than trusted from the write: the term is
 * computed in the Vice President's own file and stored on the Congress, so the
 * count that has to stay inside a band is the place to hold the band.
 */
export const SENATE_LIAISON_BOUND = 0.05;
/** What a seated Vice President is worth in the room they preside over. Zero when the chair is empty. */
export function senateLiaison(congress) {
    const liaison = congress.presidingOfficer?.liaison ?? 0;
    return Math.max(-SENATE_LIAISON_BOUND, Math.min(SENATE_LIAISON_BOUND, liaison));
}
/**
 * The disposition a vote in this chamber is actually counted against.
 *
 * The room's own reading, moved by the members who can carry part of the room
 * with them, and by the state blocs when a delegation table is present. It is
 * a displacement rather than a replacement on purpose: with no leadership
 * seated and no (or empty) delegation table this is exactly the room's
 * disposition, which is what lets a save from before the Hill had names — or
 * before states had blocs — count votes identically.
 *
 * The displacement is never written back into `congress.disposition`. Writing
 * it back would close a loop with the delegation target (room → target →
 * chamberDisposition → room) with no damping — the boundary the depth audit
 * and ARCHITECTURE both pin.
 */
export function chamberDisposition(congress, chamber, states, people) {
    const leadership = congress.leadership
        .filter((figure) => figure.chamber === chamber)
        .reduce((total, figure) => total + figure.influence * (figureRapport(people, figure) - congress.disposition), 0);
    const delegation = states === undefined
        ? 0
        : DELEGATION_LEVERAGE *
            seatWeightedMean(states, chamber, (bloc) => bloc.disposition - congress.disposition);
    // The Vice President presides over the Senate and over nothing else, so the
    // liaison term is read for that chamber only.
    const presiding = chamber === "senate" ? senateLiaison(congress) : 0;
    return round3(clamp01(congress.disposition + leadership + delegation + presiding));
}
// --- Seating them -----------------------------------------------------------
/**
 * Who is available to hold a post, in a fixed order.
 *
 * Sorted by id rather than drawn, because the pool was already drawn from the
 * campaign's seed: a second roll here would make the Hill the one part of the
 * cast that a replay staffs differently.
 */
export function benchFor(people, nation, role) {
    return Object.values(people)
        .filter((runtime) => runtime.alive &&
        runtime.base.nationality === nation &&
        (runtime.base.eligibleRoles.some((eligible) => eligible === role) || ["role-representative", "role-senator"].includes(runtime.currentRole ?? "")) &&
        // Somebody the founding already put in another office, a running mate
        // or a chief of staff drawn from the Hill, has left the Hill for it.
        (runtime.currentRole === undefined || runtime.currentRole === role || ["role-representative", "role-senator"].includes(runtime.currentRole ?? "")))
        .sort((a, b) => a.base.id.localeCompare(b.base.id));
}
/** Whether a member sits with this party's caucus: their own party, or an independent caucusing with the Democrats. */
function caucusesWith(runtime, party) {
    const own = usPartyOfPerson(runtime.base);
    return own === party || (party === "democrat" && own === "independent");
}
/**
 * The first free member of a caucus's own party, in bench order. Where the
 * bench has run out of that party, the member whose politics sit nearest the
 * party's platform is the one a caucus would still follow: an empty post is a
 * worse lie than an unusual leader.
 */
export function takeForCaucus(bench, free, party, platform) {
    const own = bench.find((runtime) => free(runtime) && caucusesWith(runtime, party));
    if (own)
        return own;
    return bench
        .filter(free)
        .map((runtime) => ({ runtime, closeness: ideologyCloseness(runtime.base.ideology, platform) }))
        .sort((a, b) => b.closeness - a.closeness)[0]?.runtime;
}
/**
 * Seat the posts, keeping whoever still belongs where they are.
 *
 * Called at the founding, after a midterm has changed which caucus holds a
 * chamber, and when an old save is brought forward. An incumbent whose caucus
 * still matches their post keeps the seat *and their rapport*: a president
 * who spent a year building a relationship with the Speaker has not lost it
 * because the Senate changed hands.
 *
 * A pool with nobody eligible seats nobody, and that is a supported outcome
 * rather than a failure — it is what a campaign saved before these seats existed
 * genuinely contains, and every count still carries without them.
 */
/**
 * Whether a post's holder still sits in its chamber. A senator unseated at a
 * special election keeps no gavel and no leadership post; with no roster on
 * file (an old save, or the founding before members are seated) the post is
 * read as held.
 */
export function holdsSeat(congress, person, chamber) {
    return !congress.members || congress.members.some((member) => member.person === person && member.chamber === chamber && !member.vacancy);
}
export function seatLeadership(congress, people, nation, turn, signature) {
    const held = new Set();
    const benches = new Map();
    const seated = [];
    const ties = [];
    // Where each sitting member already belongs. A Speaker whose chamber has just
    // been lost does not become the new Speaker on the other side of it, and does
    // not turn up in the other chamber either: they are the same person the week
    // after the election, and the post they are eligible for is the minority one.
    const belongs = new Map(congress.leadership.map((figure) => [figure.person, `${figure.chamber}:${figure.caucus}`]));
    for (const post of HILL_POSTS) {
        const caucus = caucusFor(congress, post.chamber, post.side);
        const incumbent = congress.leadership.find((figure) => figure.post === post.id);
        if (incumbent && incumbent.caucus === caucus && people[incumbent.person]?.alive === true && holdsSeat(congress, incumbent.person, post.chamber)) {
            held.add(incumbent.person);
            seated.push({ ...incumbent, caucus, influence: post.influence });
            continue;
        }
        const bench = benches.get(post.role) ?? benchFor(people, nation, post.role);
        benches.set(post.role, bench);
        const seatOf = `${post.chamber}:${caucus}`;
        // A caucus is led by its own party: the Democratic majority's Speaker is a
        // Democrat, whoever the President is.
        const party = partyForCaucus(caucus, congress.caucusAnchor);
        const next = takeForCaucus(bench, (runtime) => {
            const id = runtime.base.id;
            const member = congress.members?.find((entry) => entry.person === runtime.base.id);
            return !held.has(id) && (belongs.get(id) ?? seatOf) === seatOf && (!congress.members || member?.chamber === post.chamber && caucusesWith(runtime, party));
        }, party, usTicket(party).beliefs);
        if (!next)
            continue;
        held.add(next.base.id);
        const figure = {
            post: post.id,
            person: next.base.id,
            chamber: post.chamber,
            caucus,
            influence: post.influence,
            seatedTurn: turn,
        };
        seated.push(figure);
        ties.push({
            kind: "tie",
            person: next.base.id,
            cause: `Seated as ${post.title}, they take the measure of the administration from where their caucus stands.`,
            rapport: { set: figureTarget(congress.disposition, figure, next.base, usTicket(party).beliefs, signature, congress) },
        });
    }
    return { leadership: seated, ties };
}
/** The same, as the Congress it produces and the people whose ties it opened, for callers that hold both. */
export function withLeadership(congress, people, nation, turn) {
    const seated = seatLeadership(congress, people, nation, turn);
    return { congress: { ...congress, leadership: seated.leadership }, people: seated.ties.reduce(withTie, people) };
}
/** The role a seated figure holds, for the person record that has to show it. */
export function hillSeats(leadership) {
    return Object.fromEntries(leadership.flatMap((figure) => {
        const post = hillPost(figure.post);
        return post ? [[figure.person, post.role]] : [];
    }));
}
// The form of address, not the office's full name: "Speaker Reyes" and
// "Majority Leader Reyes", where the full title read "Speaker of the House
// Reyes" in every sentence that named a member.
function formOfAddress(title) {
    if (title.includes(" of "))
        return title.split(" of ")[0];
    return title.replace(/^(House|Senate) /, "");
}
function memberName(post, person) {
    return person ? `${formOfAddress(post.title)} ${person.name.split(" ").slice(-1)[0]}` : post.title;
}
/** The Hill as people, in the order the posts are listed. */
export function selectHill(campaign) {
    return campaign.congress.leadership.flatMap((figure) => {
        const post = hillPost(figure.post);
        if (!post)
            return [];
        const person = campaign.people[figure.person]?.base;
        const constituency = campaign.congress.members?.find((member) => member.person === figure.person)?.state;
        return [{ figure, post, person, name: memberName(post, person), ...(constituency ? { state: constituency } : {}) }];
    });
}
export function selectHillMember(campaign, post) {
    return selectHill(campaign).find((member) => member.figure.post === post);
}
/** Everyone whose vote the president would have to move to change a count. */
export function selectHillByChamber(campaign, chamber) {
    return selectHill(campaign).filter((member) => member.post.chamber === chamber);
}
