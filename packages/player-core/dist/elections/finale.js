import { CHAMBERS, CHAMBER_NAMES, TERM_YEARS, campaignFoundingDate, electoralVotesWon, inaugurationDayOf, otherMajorParty, selectDateOfTurn, selectEnding, stateCalls, successionOf, turnOnDate, usPartyOfPerson, } from "@admin/engine";
import { ELECTORAL_COLLEGE } from "@admin/world";
import { formatDate } from "../format/figures";
import { decidedOpponent } from "./race";
import { ENDING_CLOSING, ENDING_TITLE, endingOpening, successorEpilogue } from "./finale-copy";
export * from "./race";
export * from "./legacy";
export * from "./statehouses";
export { REELECTED_LINE } from "./finale-copy";
const ELECTORAL_MAJORITY = Math.floor(ELECTORAL_COLLEGE / 2) + 1;
/** The day the presidency ends: noon on the next Inauguration Day, or the day the Senate convicted. */
export function finaleDate(campaign, ending) {
    if (ending === "removed") {
        const last = campaign.removal.beats.at(-1);
        return last ? selectDateOfTurn(campaign, last.turn) : campaign.calendar;
    }
    return inaugurationDayOf(campaignFoundingDate(campaign).year + TERM_YEARS * campaign.termClock.term);
}
function decidingNight(campaign) {
    return [...campaign.termClock.elections]
        .reverse()
        .find((election) => election.kind === "presidential" && election.won !== undefined);
}
function finaleContest(campaign) {
    const night = decidingNight(campaign);
    if (!night)
        return undefined;
    const hasMap = Object.keys(campaign.states).length > 0;
    const electoralVotes = hasMap ? electoralVotesWon(campaign, night.voteShare, campaign.congress) : 0;
    const opponent = decidedOpponent(campaign);
    return {
        share: night.voteShare,
        electoralVotes,
        opponentVotes: hasMap ? ELECTORAL_COLLEGE - electoralVotes : 0,
        electoralMajority: ELECTORAL_MAJORITY,
        calls: stateCalls(campaign),
        ...(opponent ? { opponent } : {}),
        summary: night.summary,
        won: night.won === true,
    };
}
/** The chambers as the next President meets them: the seating the last November ordered, if it is still owed. */
export function finaleChambers(campaign) {
    const congress = campaign.congress;
    const anchor = congress.caucusAnchor;
    const last = campaign.termClock.elections.at(-1);
    return CHAMBERS.map((chamber) => ({
        chamber,
        name: CHAMBER_NAMES[chamber],
        composition: congress.seatingOn?.[chamber] ?? congress.chambers[chamber],
        anchor,
        other: otherMajorParty(anchor),
        ...(last?.swing ? { swing: last.swing[chamber] } : {}),
    }));
}
function weeksLeftInTerm(campaign, from) {
    const founded = campaignFoundingDate(campaign);
    const end = inaugurationDayOf(founded.year + TERM_YEARS * campaign.termClock.term);
    return Math.max(0, turnOnDate(founded, end) - turnOnDate(founded, from));
}
function finaleSuccessor(campaign, ended) {
    const succession = successionOf(campaign);
    const person = succession ? campaign.people[succession.successor]?.base : undefined;
    if (!succession || !person)
        return undefined;
    const sameParty = usPartyOfPerson(person) === campaign.congress.caucusAnchor;
    return {
        id: person.id,
        name: person.name,
        from: succession.from,
        lines: successorEpilogue(person.name, succession.from, sameParty, weeksLeftInTerm(campaign, ended)),
    };
}
/** The ending once the presidency is over. Undefined while the President is in office. */
export function finaleReading(campaign) {
    const ending = selectEnding(campaign);
    if (ending === "in-office")
        return undefined;
    const date = finaleDate(campaign, ending);
    const contest = ending === "removed" ? undefined : finaleContest(campaign);
    const successor = ending === "removed" ? finaleSuccessor(campaign, date) : undefined;
    const incoming = ending === "defeated" ? contest?.opponent?.name : undefined;
    const account = ending === "removed" ? campaign.removal.endingSummary : ending === "defeated" ? contest?.summary : undefined;
    return {
        ending,
        title: ENDING_TITLE[ending],
        when: formatDate(date),
        opening: endingOpening(ending, formatDate(date), incoming),
        ...(account ? { account } : {}),
        closing: ENDING_CLOSING[ending],
        ...(contest ? { contest } : {}),
        chambers: finaleChambers(campaign),
        ...(successor ? { successor } : {}),
        ...(contest?.opponent ? { opponent: contest.opponent.name } : {}),
    };
}
