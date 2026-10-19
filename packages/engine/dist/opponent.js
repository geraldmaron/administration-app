import { TERM_YEARS, campaignFoundingDate, daysBetween, federalElectionDay } from "./clock.js";
import { usPartyOfPerson } from "./cast-fit.js";
import { otherMajorParty, partyTicketId } from "./party.js";
import { createRngStreams } from "./rng.js";
// The other party's candidate: a fictional figure from its bench, drawn once
// from the campaign seed, with a seeded margin the whole term is measured
// against.
//
// The contest was a referendum on the President alone, which is half of one.
// Nobody runs against a record; they run against a person, and how strong a
// candidate the other side puts up is the part of the night no administration
// controls. The margin that candidate is worth is fixed by the seed and read
// out slowly: the projection carries the part the country already knows, and
// the band around it is exactly the part it does not, narrowing as the season
// defines the candidate until, on the night, nothing is left unknown and the
// band has closed on the count. Nothing is rolled on the night, so what the
// President was shown is what happens.
/** The seats the other party's nominee comes from: statehouses and the Hill's senior members. */
export const OPPONENT_BENCH_ROLES = [
    "role-governor",
    "role-congressional-leader",
    "role-committee-chair",
    "role-opposition-leader",
];
/** How many of the bench's strongest are in the running before the seed picks one. */
const NOMINEE_FIELD = 3;
/**
 * The most the matchup can be worth, either way, in share of the vote.
 *
 * Three points: the spread between a strong and a weak nominee in a modern
 * American contest is a few points, not ten. A planning value, labeled as
 * such, and the one dial the seeded margin has.
 */
export const MARGIN_BOUND = 0.03;
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/** The party the President runs against: the other major, and for an Independent the one farther away. */
export function opposingParty(campaign) {
    const standing = campaign.congress;
    if (standing.administrationParty === "independent")
        return otherMajorParty(standing.caucusAnchor);
    return otherMajorParty(standing.administrationParty);
}
function placedInAdministration(campaign) {
    const cabinet = Object.values(campaign.player.cabinet).map(String);
    return new Set([...cabinet, ...(campaign.vicePresident ? [campaign.vicePresident] : [])]);
}
/** Everyone the other party could nominate, strongest first. */
export function opponentBench(campaign) {
    const party = opposingParty(campaign);
    const placed = placedInAdministration(campaign);
    const nation = campaign.founding.nation;
    return Object.values(campaign.people)
        .filter((runtime) => runtime.alive && runtime.base.nationality === nation)
        .map((runtime) => runtime.base)
        .filter((person) => usPartyOfPerson(person) === party && !placed.has(person.id))
        .filter((person) => person.eligibleRoles.some((role) => OPPONENT_BENCH_ROLES.includes(role)))
        .sort((a, b) => b.charisma + b.ambition - (a.charisma + a.ambition) || a.id.localeCompare(b.id));
}
/**
 * What this nominee is worth to the President's share, signed: negative is a
 * strong candidate. Half the candidate's own standing, half the seed's, so two
 * campaigns against the same person need not run the same race.
 */
function seededMarginFor(campaign, person) {
    const standing = person.charisma + person.competence - 1;
    const luck = createRngStreams(campaign.seed).stream("opponent", "margin").next() * 2 - 1;
    return round3(-MARGIN_BOUND * Math.max(-1, Math.min(1, 0.5 * standing + 0.5 * luck)));
}
/**
 * The nominee the seed draws from the bench, and the margin they are worth.
 * Undefined with no bench. Each of the strongest few holds a draw keyed by
 * their own id and the highest takes it, so a reshuffle of the field's order,
 * or someone else in it leaving, never renames the nominee.
 */
export function drawOpponent(campaign) {
    const field = opponentBench(campaign).slice(0, NOMINEE_FIELD);
    if (field.length === 0)
        return undefined;
    const streams = createRngStreams(campaign.seed);
    const draws = field.map((person) => ({ person, draw: streams.stream("opponent", "nominee", person.id).next() }));
    const { person } = draws.reduce((best, entry) => (entry.draw > best.draw ? entry : best));
    return {
        person: person.id,
        party: partyTicketId(opposingParty(campaign)),
        seededMargin: seededMarginFor(campaign, person),
    };
}
/**
 * The opponent the contest has named: the one frozen at the seal, or for a
 * save sealed before the seal named one, the one its seed draws.
 */
export function selectOpponent(campaign) {
    return campaign.opponent ?? drawOpponent(campaign);
}
/** The other party's candidate, drawn once at the seal so a later change to the bench cannot rename them. */
export function withNamedOpponent(campaign) {
    const opponent = drawOpponent(campaign);
    return opponent ? { ...campaign, opponent } : campaign;
}
/** Whether the President still has a contest ahead: none has been filed on the term clock. */
export function contestAhead(campaign) {
    return !campaign.termClock.elections.some((election) => election.kind === "presidential");
}
/** The day the President's own contest falls on: the first presidential Election Day of the presidency. */
export function contestDay(campaign) {
    return federalElectionDay(campaignFoundingDate(campaign).year + TERM_YEARS - 1);
}
/**
 * How much of the matchup the country knows by `date`, 0..1.
 *
 * Squared rather than straight: for the first two years of a term the other
 * party has a bench and no nominee, and the candidate is defined in the
 * election year itself, which is when the band should close fastest.
 */
export function matchupKnown(campaign, date = campaign.calendar) {
    const founded = campaignFoundingDate(campaign);
    const span = daysBetween(founded, contestDay(campaign));
    if (span <= 0)
        return 1;
    const elapsed = clamp01(daysBetween(founded, date) / span);
    return round3(elapsed * elapsed);
}
/** The part of the matchup the count already carries, in share of the vote. Zero once no contest is ahead. */
export function opponentShift(campaign) {
    if (!contestAhead(campaign))
        return 0;
    const opponent = selectOpponent(campaign);
    if (!opponent)
        return 0;
    return round3(opponent.seededMargin * matchupKnown(campaign));
}
/**
 * How far either side of the projection the night can still land, from the
 * part of the matchup nobody knows yet. A bound, not a spread: whatever the
 * candidate turns out to be worth sits inside it. A fact about the calendar,
 * so a reader drawing it over many dates asks for the opponent once, not here.
 */
export function marginHalfWidth(campaign, date = campaign.calendar) {
    if (!contestAhead(campaign))
        return 0;
    return round3(MARGIN_BOUND * (1 - matchupKnown(campaign, date)));
}
/** The Senate's choice of a Vice President, by a majority of the whole number of senators. */
function senateChoice(campaign) {
    const senate = campaign.congress.chambers.senate;
    const majority = Math.floor(senate.seats / 2) + 1;
    if (senate.administration >= majority)
        return "administration-running-mate";
    if (senate.opposition >= majority)
        return "opponent-running-mate";
    return "speaker";
}
/**
 * When the Electoral College ties, the House chooses, one vote a state.
 *
 * Read off the delegations the campaign holds on the night. Each state votes as
 * the majority of its House members does; an even delegation casts nothing,
 * and the District, which has no voting member, has no say. A President who
 * cannot find a majority of the states does not keep the office, and a House
 * that finds nobody hands the chair to whoever the deadlock rule seats.
 */
export function contingentHouseVote(campaign) {
    let forAdministration = 0;
    let forOpponent = 0;
    let divided = 0;
    let states = 0;
    for (const runtime of Object.values(campaign.states)) {
        const house = runtime.delegation?.house;
        if (!house || runtime.base.id === "DC")
            continue;
        states += 1;
        if (house.administration > house.opposition)
            forAdministration += 1;
        else if (house.opposition > house.administration)
            forOpponent += 1;
        else
            divided += 1;
    }
    const needed = Math.floor(states / 2) + 1;
    const won = states > 0 && forAdministration >= needed;
    const deadlocked = !won && forOpponent < needed;
    return { forAdministration, forOpponent, divided, needed, won, deadlocked, ...(deadlocked ? { acting: senateChoice(campaign) } : {}) };
}
