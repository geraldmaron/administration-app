import {
  CHAMBERS,
  CHAMBER_NAMES,
  TERM_YEARS,
  campaignFoundingDate,
  electoralVotesWon,
  inaugurationDayOf,
  otherMajorParty,
  selectDateOfTurn,
  selectEnding,
  stateCalls,
  successionOf,
  turnOnDate,
  usPartyOfPerson,
  type Campaign,
  type Chamber,
  type ChamberComposition,
  type GameDate,
  type StateCall,
  type UsMajorParty,
} from "@admin/engine";
import { ELECTORAL_COLLEGE } from "@admin/world";
import { formatDate } from "../format/figures";
import { decidedOpponent, type RaceOpponent } from "./race";
import { ENDING_CLOSING, ENDING_TITLE, endingOpening, successorEpilogue, type EndingKind } from "./finale-copy";

export * from "./race";
export * from "./legacy";
export * from "./statehouses";
export { REELECTED_LINE, type EndingKind, type SeasonStage } from "./finale-copy";

// How the presidency ended, for the ending room: the one word the engine
// settles on (`selectEnding`, and nothing else decides it), the night that
// settled it drawn as a map and a count, the chambers the next President
// meets, and, for a removal, the successor who took the oath.

export type FinaleContest = {
  readonly share: number;
  readonly electoralVotes: number;
  readonly opponentVotes: number;
  readonly electoralMajority: number;
  readonly calls: readonly StateCall[];
  readonly opponent?: RaceOpponent;
  /** The night's own sentence, as the result filed it. */
  readonly summary: string;
  readonly won: boolean;
};

export type FinaleChamber = {
  readonly chamber: Chamber;
  readonly name: string;
  readonly composition: ChamberComposition;
  /** The administration's party, whose seats `composition.administration` counts. */
  readonly anchor: UsMajorParty;
  readonly other: UsMajorParty;
  /** Seats the last election moved toward the administration; negative is lost. */
  readonly swing?: number;
};

export type FinaleSuccessor = {
  readonly id: string;
  readonly name: string;
  readonly from: "vice-president" | "speaker";
  readonly lines: readonly string[];
};

export type FinaleReading = {
  readonly ending: EndingKind;
  readonly title: string;
  /** The day the presidency ends, as a date a reader says. */
  readonly when: string;
  readonly opening: string;
  /** The engine's own account of how it ended, where it kept one. */
  readonly account?: string;
  readonly closing: string;
  readonly contest?: FinaleContest;
  readonly chambers: readonly FinaleChamber[];
  readonly successor?: FinaleSuccessor;
  /** Kept for the readers that only need names. */
  readonly opponent?: string;
};

const ELECTORAL_MAJORITY = Math.floor(ELECTORAL_COLLEGE / 2) + 1;

/** The day the presidency ends: noon on the next Inauguration Day, or the day the Senate convicted. */
export function finaleDate(campaign: Campaign, ending: EndingKind): GameDate {
  if (ending === "removed") {
    const last = campaign.removal.beats.at(-1);
    return last ? selectDateOfTurn(campaign, last.turn) : campaign.calendar;
  }
  return inaugurationDayOf(campaignFoundingDate(campaign).year + TERM_YEARS * campaign.termClock.term);
}

function decidingNight(campaign: Campaign) {
  return [...campaign.termClock.elections]
    .reverse()
    .find((election) => election.kind === "presidential" && election.won !== undefined);
}

function finaleContest(campaign: Campaign): FinaleContest | undefined {
  const night = decidingNight(campaign);
  if (!night) return undefined;
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
export function finaleChambers(campaign: Campaign): readonly FinaleChamber[] {
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

function weeksLeftInTerm(campaign: Campaign, from: GameDate): number {
  const founded = campaignFoundingDate(campaign);
  const end = inaugurationDayOf(founded.year + TERM_YEARS * campaign.termClock.term);
  return Math.max(0, turnOnDate(founded, end) - turnOnDate(founded, from));
}

function finaleSuccessor(campaign: Campaign, ended: GameDate): FinaleSuccessor | undefined {
  const succession = successionOf(campaign);
  const person = succession ? campaign.people[succession.successor]?.base : undefined;
  if (!succession || !person) return undefined;
  const sameParty = usPartyOfPerson(person) === campaign.congress.caucusAnchor;
  return {
    id: person.id as string,
    name: person.name,
    from: succession.from,
    lines: successorEpilogue(person.name, succession.from, sameParty, weeksLeftInTerm(campaign, ended)),
  };
}

/** The ending once the presidency is over. Undefined while the President is in office. */
export function finaleReading(campaign: Campaign): FinaleReading | undefined {
  const ending = selectEnding(campaign);
  if (ending === "in-office") return undefined;
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
