import { majorityCaucus, SENATE_LIAISON_BOUND } from "./hill.js";
import { bandedAgainstList, candidateFit, ideologyCloseness, usPartyOfPerson } from "./cast-fit.js";
import { stateOfBirthplace, stateRegion } from "./cast-home.js";
import { sealCaucusAnchor } from "./party.js";
// The running mate.
//
// A President does not pick a Vice President the way they pick a secretary.
// The choice is made to win: someone from the President's own party who fills
// in what the top of the ticket lacks, from another part of the country, of
// another generation, near enough in politics to run on one platform and far
// enough to reach voters the President does not. The bench is the party's
// senior members of Congress, which is where most running mates have come
// from. Sitting governors are left out: all fifty of the bench's governors are
// seated on the first morning, and a running mate drawn from them would leave a
// statehouse with nobody in it.
/** The seats a running mate is drawn from. */
export const RUNNING_MATE_BENCH_ROLES = ["role-committee-chair", "role-congressional-leader"];
/** As deep as a cabinet chair's shortlist, for the same reason: a real choice, still skimmable. */
export const RUNNING_MATE_SHORTLIST = 5;
/**
 * What a balanced ticket is made of, and how much each part counts. The home
 * region leads because it is the one thing a running mate is most often chosen
 * for; the rest split evenly between age, politics and experience.
 */
const BALANCE_REGION = 0.3;
const BALANCE_AGE = 0.2;
const BALANCE_IDEOLOGY = 0.25;
const BALANCE_EXPERIENCE = 0.25;
/** Twenty years apart is as much generational reach as a ticket gets from age. */
const AGE_GAP_FULL = 20;
/**
 * How far apart a running mate's politics sit on a balanced ticket, on the
 * closeness scale's own terms: near enough to run on one platform, far enough
 * to bring voters the President does not already have.
 */
const IDEAL_TICKET_GAP = 0.2;
const TICKET_GAP_TOLERANCE = 0.6;
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/**
 * Whether this person can run on the President's ticket. A party President's
 * running mate is of that party. An Independent has no party to share, so the
 * ticket takes a fellow independent or a member of the caucus they sit nearest.
 */
export function isOnTheTicket(person, president) {
    const party = usPartyOfPerson(person);
    if (president.party !== "independent")
        return party === president.party;
    return party === "independent" || party === sealCaucusAnchor("independent", president.ideology);
}
function regionTerm(president, mate) {
    if (president === undefined || mate === undefined)
        return 0.5;
    if (president === mate)
        return 0;
    return stateRegion(president) === stateRegion(mate) ? 0.4 : 1;
}
/** How much this person adds to the President's ticket, 0..1. */
export function ticketBalance(president, person) {
    const gap = 1 - ideologyCloseness(president.ideology, person.ideology);
    const ideology = clamp01(1 - Math.abs(gap - IDEAL_TICKET_GAP) / TICKET_GAP_TOLERANCE);
    return round3(BALANCE_REGION * regionTerm(president.homeState, stateOfBirthplace(person.birthplace)) +
        BALANCE_AGE * Math.min(1, Math.abs(president.age - person.age) / AGE_GAP_FULL) +
        BALANCE_IDEOLOGY * ideology +
        BALANCE_EXPERIENCE * person.competence);
}
/** Whether this person comes from the part of the cast a running mate is drawn from. */
export function onRunningMateBench(person, nation) {
    return (person.nationality === nation &&
        person.eligibleRoles.some((role) => RUNNING_MATE_BENCH_ROLES.includes(role)));
}
/** Everyone who could share the ticket, before any ranking. */
export function runningMateBench(pool, nation, president) {
    return pool.filter((person) => onRunningMateBench(person, nation) && isOnTheTicket(person, president));
}
/** The shortlist, best-balanced first, leaving out anyone the founding has already placed elsewhere. */
export function runningMateCandidates(pool, nation, president, placed = new Set()) {
    const shortlist = runningMateBench(pool, nation, president)
        .filter((person) => !placed.has(person.id))
        .map((person) => ({
        ...candidateFit(person, president),
        balance: ticketBalance(president, person),
        ...(stateOfBirthplace(person.birthplace) ? { homeState: stateOfBirthplace(person.birthplace) } : {}),
    }))
        .sort((a, b) => b.balance - a.balance ||
        b.person.competence - a.person.competence ||
        a.person.id.localeCompare(b.person.id))
        .slice(0, RUNNING_MATE_SHORTLIST);
    return bandedAgainstList(shortlist);
}
/**
 * What the two halves of a presiding officer's standing are worth, and where
 * the term turns from help to hindrance. Service leads: a Vice President who ran
 * a caucus knows how the room counts, and one who sat on a committee knows a
 * corner of it. Politics near the Senate's majority is the rest.
 */
const LIAISON_SERVICE = 0.6;
const LIAISON_CLOSENESS = 0.4;
const LIAISON_CENTER = 0.6;
const LIAISON_SPREAD = 0.4;
/** Service on the Hill, 0..1: a caucus leader ran the room, a committee chair ran a corner of it. */
function hillService(person) {
    const roles = person.eligibleRoles.map(String);
    if (roles.includes("role-congressional-leader"))
        return 1;
    if (roles.includes("role-committee-chair"))
        return 0.7;
    return 0.3;
}
/** Where the Senate's majority caucus sits: the mean politics of its members on the Hill. */
function senateMajorityIdeology(campaign) {
    const congress = campaign.congress;
    const majority = majorityCaucus(congress.chambers.senate, congress.caucusAnchor);
    const members = congress.leadership
        .filter((figure) => figure.chamber === "senate" && figure.caucus === majority)
        .flatMap((figure) => {
        const person = campaign.people[figure.person]?.base;
        return person ? [person.ideology] : [];
    });
    if (members.length === 0)
        return undefined;
    const mean = (axis) => members.reduce((sum, vector) => sum + vector[axis], 0) / members.length;
    return { economicLeftRight: mean("economicLeftRight"), authLibertarian: mean("authLibertarian"), nationalistGlobalist: mean("nationalistGlobalist") };
}
/**
 * How far the Vice President moves the Senate as its presiding officer.
 *
 * Presiding over the Senate is the office's one constitutional job beyond
 * waiting, and it is worth something in the room: a President of the Senate who
 * served there and whose politics sit near its majority knows the members and
 * is heard by them, and one who did neither is a gavel. Bounded where it is read
 * (`senateLiaison`), and signed, because a Vice President the majority does not
 * trust costs the administration a little in the room they preside over.
 */
export function vicePresidentLiaison(campaign, person) {
    const vicePresident = campaign.people[person]?.base;
    if (!vicePresident)
        return 0;
    const majority = senateMajorityIdeology(campaign);
    const closeness = majority ? ideologyCloseness(vicePresident.ideology, majority) : 0.5;
    const reading = LIAISON_SERVICE * hillService(vicePresident) + LIAISON_CLOSENESS * closeness;
    const signed = Math.max(-1, Math.min(1, (reading - LIAISON_CENTER) / LIAISON_SPREAD));
    return round3(SENATE_LIAISON_BOUND * signed);
}
