import { ELECTORAL_COLLEGE, worldDataset, type Charter } from "@admin/world";
import type {
  Campaign,
  ElectionKind,
  ElectionResult,
  GameDate,
  TermClock,
  SeatSwing,
} from "./state.js";
import { CHAMBERS } from "./congress.js";
import { weeksFor } from "./pace.js";
import {
  FIRST_INAUGURATION,
  TERM_YEARS,
  campaignFoundingDate,
  compareDates,
  daysBetween,
  inaugurationDayOf,
  milestonesBetween,
  selectDateOfTurn,
  turnOnDate,
  type ConstitutionalMilestone,
} from "./clock.js";
import { selectUsCityVoteDriver } from "./cities.js";
import { electoralVotesWon, projectedStateCalls, selectUsStateVoteDriver } from "./states.js";
import { describeGovernorNight, holdGovernorRacesDueToday } from "./governors.js";
import {
  coverage,
  seatSwing,
  seatingPacket,
  senateClassUpIn,
  simulated,
  withPendingSeating,
} from "./election-seating.js";
import { headOfGovernmentTitle } from "./naming.js";
import { apply, type Effect, type EffectPacket } from "./effects.js";
import { selectBallot } from "./turnout.js";
import { momentumShift } from "./momentum.js";
import { contingentHouseVote, opponentShift, selectOpponent, type ContingentActing, type ContingentVote } from "./opponent.js";
import { nonCooperationShift } from "./states-acting.js";
import type { TurnPhase } from "./turn-loop.js";

// The dates the whole game bends around.
//
// The presidency had a beginning and no end. Weeks accumulated, the removal arc
// was the only exit from the office, and nothing anywhere asked the country
// what it made of any of it — so an administration could spend two hundred
// weeks compiling a record that no one ever voted on. That is not a term; it is
// a tenure, and it made the one deadline every real president governs against
// into a number on a screen with nothing underneath it.
//
// The dates are the country's, not the game's: federal Election Day in the
// November of each even year, read off the civil calendar in clock.ts and never
// counted out in turns from the oath. At the midterm the country recomposes the
// chambers around the administration's standing, which is the midterm doing what
// a midterm actually does: it does not remove a president, it decides what is
// left of their ability to govern. At the presidential election it decides
// whether there is a second term at all, and a second term begins at the next
// Inauguration Day rather than on election night.
//
// Nothing here rolls. Every result is derived from the record the player
// actually compiled — the coalitions they hold, the force they used without
// asking, the orders their own courts threw out, the vetoes they were overruled
// on — because an election settled by a die is a die, and the point of the
// clock is that the whole campaign has been the campaign.

/**
 * A presidential term, in the weekly turns everything else is counted in: the
 * whole weeks from one Inauguration Day to the next.
 *
 * A count derived from the calendar, for the readings that measure a span in
 * turns (a harness horizon, a week-of-term label). No election is scheduled off
 * it: the dates come from `presidencyElections`, so this can never move one.
 */
export const TERM_TURNS = weeksFor(
  daysBetween(FIRST_INAUGURATION, inaugurationDayOf(FIRST_INAUGURATION.year + TERM_YEARS)),
  "floor",
);

/**
 * How many terms one presidency runs.
 *
 * Two, and the second one ends the campaign rather than opening a third. This
 * is the decision the model had to make and it is made here: a second term is a
 * full second four years on the same clock — the same midterm at its own
 * halfway mark, the same fixed dates — and at the end of it the campaign
 * finishes as `term-limited` with no contest held, because the president is not
 * on the ballot. A campaign is therefore at most eight years long, which is what
 * the Constitution the charter is named for actually permits, and the ending a
 * two-term president reaches is a different one from either defeat or removal.
 */
export const TERM_LIMIT = 2;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

/**
 * Whether this charter's executive faces the country on a fixed date at all.
 *
 * Only two of the removal mechanisms describe a government that does. A
 * parliamentary one is chosen by its assembly rather than by a national ballot
 * on a date nobody can move, and a junta or a clerical council does not hold
 * one — so under those charters the clock exists, holds no elections, and the
 * campaign is bounded by the removal arc alone, exactly as it was.
 */
export function holdsElections(charter: Charter): boolean {
  return charter.removalMechanism === "impeachment" || charter.removalMechanism === "electoral-defeat";
}

/** The clock a presidency starts on, the week it takes the oath. */
export function openingTermClock(turn: number): TermClock {
  return { term: 1, termStartTurn: turn, elections: [] };
}

export type ScheduledElection = {
  readonly kind: ElectionKind;
  /** The turn the result will be filed under. */
  readonly turn: number;
  /** Weeks from now. Zero on the week it is held; never negative. */
  readonly turnsAway: number;
  /** Federal Election Day, the date the result is filed on. */
  readonly date: GameDate;
  /** Days from now. Zero on the day itself; never negative. */
  readonly daysAway: number;
};

const ELECTION_OF_MILESTONE: Readonly<Partial<Record<ConstitutionalMilestone["kind"], ElectionKind>>> = {
  "midterm-election": "midterm",
  "presidential-election": "presidential",
};

/**
 * Every federal election a presidency founded on `foundingDate` can face, in
 * the order they fall: a midterm and a contest per term, for as many terms as
 * the office allows.
 *
 * Read off `milestonesBetween`, the calendar every surface prints its dates
 * from, so the election the Desk announces and the one the engine holds are the
 * same event on the same day by construction rather than by agreement.
 */
export function presidencyElections(foundingDate: GameDate): readonly ConstitutionalMilestone[] {
  const lastDay = { ...foundingDate, year: foundingDate.year + TERM_YEARS * TERM_LIMIT };
  return milestonesBetween(foundingDate, lastDay).filter((milestone) => ELECTION_OF_MILESTONE[milestone.kind] !== undefined);
}

/**
 * The next fixed date, or nothing at all once the presidency's own future is
 * settled.
 *
 * Elections are held in order and each exactly once, so the next one is the
 * schedule's entry after the ones already on the clock. Nothing is counted down
 * or stored, so a save reloaded halfway through a term knows exactly when it is.
 */
export function nextElection(campaign: Campaign): ScheduledElection | undefined {
  const clock = campaign.termClock;
  if (clock.outcome === "defeated" || clock.outcome === "term-limited") return undefined;
  const founded = campaignFoundingDate(campaign);
  const milestone = presidencyElections(founded)[clock.elections.length];
  const kind = milestone ? ELECTION_OF_MILESTONE[milestone.kind] : undefined;
  if (!milestone || !kind) return undefined;
  const turn = turnOnDate(founded, milestone.date);
  return {
    kind,
    turn,
    turnsAway: Math.max(0, turn - campaign.turn),
    date: milestone.date,
    daysAway: Math.max(0, daysBetween(campaign.calendar, milestone.date)),
  };
}

// --- What the country makes of the record ----------------------------------

/**
 * How much of the vote an incumbent holds simply for being one.
 *
 * Small, and real. An administration has the podium, the calendar and every
 * ribbon it cares to cut, and a model without it would have a president on
 * exactly even standing lose more often than not for no reason anyone could
 * name.
 */
const INCUMBENCY = 0.03;

/**
 * The even split a contest is drawn against. Not a term in the count: the
 * ballot is the blocs' own vote, and this only lets a reading say how far the
 * blocs carried the administration from even, rather than printing fifty
 * points of starting share as something the administration did.
 */
const ELECTORATE_ANCHOR = 0.5;

/** What each count against the administration is worth, and how far it runs. */
const RECORD_PENALTIES = {
  unauthorizedForce: { each: 0.03, cap: 0.12 },
  struckDownOrders: { each: 0.04, cap: 0.12 },
  overriddenVetoes: { each: 0.03, cap: 0.09 },
  removalBeats: { each: 0.035, cap: 0.105 },
  /** Governing on the prior year's numbers, which every state house can see. */
  noAppropriation: 0.02,
  /**
   * A promise made for the first hundred days and not kept.
   *
   * The pledge ledger is read, never re-scored: a plank settles as kept or
   * broken when the act that settles it lands, and this only counts the ones the
   * ledger already calls broken. The first-hundred-days pledges are singled out
   * because they are the ones a president chose to be judged on early, and the
   * country judges them on exactly that.
   */
  brokenFirstHundredDays: { each: 0.03, cap: 0.09 },
  /**
   * A whole term with nothing signed into law.
   *
   * The one count that catches a presidency which did nothing at all. Before it
   * the vote read only the constitutional record, so a government that never
   * acted paid nothing for it and was re-elected in a quarter of contests: an
   * administration can be measured against what it did wrong or against what it
   * did, and reading only the first makes doing nothing the safest way to govern.
   *
   * Graded rather than all-or-nothing, against what a term is expected to
   * legislate, so a President who signed two acts in four years is not read the
   * same way as one who signed twelve or as one who signed none. Binary would
   * have been the cheaper rule and the wrong one: it would make the first
   * signature worth the whole penalty and the eleventh worth nothing.
   *
   * Charged in proportion to how much of the term has run as well, so it is
   * worth nothing in the first weeks — when signing nothing is not yet a verdict
   * on anybody — and its full weight at the contest. A flat penalty from week one
   * would sit on every projection the rail shows a President who has simply not
   * got to it yet.
   */
  noLawSigned: 0.12,
} as const;

export type VoteDriver = {
  /** What moved the count, in the words a night's coverage would use. */
  readonly reason: string;
  readonly delta: number;
};

export type VoteProjection = {
  readonly share: number; // 0..1, the administration's own
  readonly drivers: readonly VoteDriver[];
};

function penalty(count: number, scale: { readonly each: number; readonly cap: number }): number {
  return -Math.min(scale.cap, count * scale.each);
}

/**
 * The count, before it is counted.
 *
 * Built on the five blocs rather than on a second popularity figure: each
 * bloc's vote is its approval of the administration plus the party loyalty
 * that holds a disapproving partisan, weighted by how many of it there are and
 * how many turn out (`electorate.ts`). An election that invented its own
 * polling would be a second opinion of a country that has one.
 *
 * What is added here is the part approval does not carry: the constitutional
 * record. A president can be liked and still be the president who was overruled
 * by their own courts twice and went to war without asking.
 */
function geographyVoteDriver(campaign: Campaign): VoteDriver | undefined {
  const charter = worldDataset.charters.find((entry) => entry.id === campaign.founding.charter);
  if (charter !== undefined && !holdsElections(charter)) return undefined;
  const delta = round3(selectUsCityVoteDriver(campaign));
  if (delta === 0) return undefined;
  return { reason: "how the cities have moved", delta };
}

/**
 * The parts of a contest a record does not settle on its own: who turns out,
 * which way the country has been moving lately, who the other party put up,
 * and the statehouses working against the ticket. Each is bounded where it is
 * computed and absent while it is zero.
 */
function contestDrivers(campaign: Campaign, turnout: number): readonly VoteDriver[] {
  const drivers: VoteDriver[] = [
    { reason: "who is going to turn out", delta: turnout },
    { reason: "which way the country has been moving lately", delta: momentumShift(campaign) },
    { reason: "the candidate the other party is putting up", delta: opponentShift(campaign) },
    { reason: "statehouses refusing the administration's programs", delta: nonCooperationShift(campaign) },
  ];
  return drivers.filter((driver) => driver.delta !== 0);
}

function stateVoteDriver(campaign: Campaign): VoteDriver | undefined {
  const charter = worldDataset.charters.find((entry) => entry.id === campaign.founding.charter);
  if (charter !== undefined && !holdsElections(charter)) return undefined;
  if (Object.keys(campaign.states).length === 0) return undefined;
  const delta = round3(selectUsStateVoteDriver(campaign, campaign.congress));
  if (delta === 0) return undefined;
  return { reason: "how the states have moved", delta };
}

/** First-hundred-days planks the ledger has already settled as broken. */
function brokenOpeningPledges(campaign: Campaign): number {
  return (campaign.pledges ?? []).filter((pledge) => pledge.firstHundredDays && pledge.status === "broken").length;
}

/** How much of the term being served has run, 0..1. */
function termElapsed(campaign: Campaign): number {
  const served = campaign.turn - campaign.termClock.termStartTurn;
  return clamp01(served / TERM_TURNS);
}

/** Bills the President has actually signed. Not a count of bills introduced. */
function lawsSigned(campaign: Campaign): number {
  return Object.values(campaign.bills).filter((bill) => bill.status === "law").length;
}

/**
 * What a term is expected to put on the statute book before the absence of a
 * record stops being a gap and becomes the record.
 *
 * Six over four years: a President who signs fewer than about one and a half
 * acts a year has not legislated, and one who clears six has. A design figure
 * rather than a measured one, and the one dial this driver has.
 */
export const LAWS_EXPECTED_PER_TERM = 6;

/** How far short of that the term fell, 1 for a term with nothing at all and 0 once it clears. */
function legislativeShortfall(campaign: Campaign): number {
  return clamp01(1 - lawsSigned(campaign) / LAWS_EXPECTED_PER_TERM);
}

export function projectVote(campaign: Campaign): VoteProjection {
  const ballot = selectBallot(campaign);
  const struck = campaign.orders.filter((record) => record.review?.status === "struck-down").length;
  const overridden = Object.values(campaign.bills).filter(
    (bill) => bill.status === "law" && bill.override !== undefined,
  ).length;
  const citiesMoved = geographyVoteDriver(campaign);
  const statesMoved = stateVoteDriver(campaign);
  const standing: VoteDriver[] = [
    { reason: "a country that starts out evenly split", delta: ELECTORATE_ANCHOR },
    { reason: "where the country's blocs stand", delta: ballot.habitual - ELECTORATE_ANCHOR },
    ...(citiesMoved ? [citiesMoved] : []),
    ...(statesMoved ? [statesMoved] : []),
    ...contestDrivers(campaign, Math.round((ballot.actual - ballot.habitual) * 1000) / 1000),
    { reason: "the advantages of holding the office", delta: INCUMBENCY },
  ];
  const record: VoteDriver[] = [
    {
      reason: "force used without a vote",
      delta: penalty(campaign.congress.unauthorized.length, RECORD_PENALTIES.unauthorizedForce),
    },
    { reason: "orders the courts threw out", delta: penalty(struck, RECORD_PENALTIES.struckDownOrders) },
    { reason: "vetoes Congress overrode", delta: penalty(overridden, RECORD_PENALTIES.overriddenVetoes) },
    {
      reason: "how close the administration came to being removed",
      delta: penalty(campaign.removal.beats.length, RECORD_PENALTIES.removalBeats),
    },
    ...(campaign.congress.appropriation.onPriorYear
      ? [{ reason: "a government running without a budget", delta: -RECORD_PENALTIES.noAppropriation }]
      : []),
    {
      reason: "promises made for the first hundred days and broken",
      delta: penalty(brokenOpeningPledges(campaign), RECORD_PENALTIES.brokenFirstHundredDays),
    },
    {
      reason: "how little of the term reached the statute book",
      delta: -RECORD_PENALTIES.noLawSigned * legislativeShortfall(campaign) * termElapsed(campaign),
    },
    // Contested-but-upheld orders are deliberately absent. The strike-down above
    // is the fact the country is voting on; charging the challenge as well would
    // price the same order twice and make being taken to court the offense.
  ];
  const standingShare = standing.reduce((total, driver) => total + driver.delta, 0);
  const scaled = record.map((driver) => ({ ...driver, delta: driver.delta * recordScale(record, standingShare) }));
  const drivers = [...standing, ...scaled];
  return {
    share: round3(clamp01(drivers.reduce((total, driver) => total + driver.delta, 0))),
    drivers: drivers.map((driver) => ({ ...driver, delta: round3(driver.delta) })),
  };
}

/**
 * The most a constitutional record can cost, all of it together.
 *
 * Each count is capped on its own, but five capped counts summed to 45 points
 * of a vote — enough to put a popular administration under 20 percent, which
 * is not an election result, it is an erasure. The aggregate is held to a
 * margin instead: a president with a genuinely lawless record loses an
 * election they would otherwise have won, and does not get run out of the
 * country. Scaling every driver by the same factor rather than truncating the
 * sum keeps the drivers adding up to the share they are shown beside.
 */
const RECORD_DRAG_CAP = 0.15;

/**
 * The least a record can leave the President's party, whatever it holds: the
 * worst the country has given one in the modern era. In November 1974, three
 * months after the resignation and with approval near a quarter, the
 * President's party took 21,165,583 House votes to the other's 29,872,842
 * (Clerk of the House, Statistics of the Congressional Election of November 5,
 * 1974, recapitulation), 41.5% of the two-party vote. Approval alone already
 * carries a failing administration to about 43%; the record can take it to
 * this line and no further, so a lawless and unpopular term loses big rather
 * than landing at a share no American party has polled.
 */
const PARTY_VOTE_FLOOR = 0.415;

function recordScale(record: readonly VoteDriver[], standingShare: number): number {
  const drag = -record.reduce((total, driver) => total + driver.delta, 0);
  const room = Math.max(0, Math.min(RECORD_DRAG_CAP, standingShare - PARTY_VOTE_FLOOR));
  return drag > room ? room / drag : 1;
}

// The seat arithmetic an election settles — the swing, the Senate's classes and
// the January 3 seating — lives in election-seating.ts and is re-exported here,
// because this file was at its line ceiling and the two halves answer different
// questions: this one is what the country decided, that one is what it did to
// the chambers.
export * from "./election-seating.js";
// The contest's own inputs live beside it for the same reason, and are read
// through this module so a surface asks the file that counts the vote.
export * from "./turnout.js";
export * from "./momentum.js";
export * from "./states-acting.js";


// --- Holding one -----------------------------------------------------------

function describeMidterm(swing: SeatSwing, title: string): string {
  const total = swing.house + swing.senate;
  if (total < 0) {
    return `The midterms go against the administration: ${-swing.house} House seats and ${-swing.senate} in the Senate change hands, and ${title} governs the rest of the term with a smaller caucus.`;
  }
  if (total === 0) return "The midterms leave both chambers almost exactly as they were, which nobody expected and nobody is calling a win.";
  return `The administration holds its ground at the midterms and picks up ${total} ${total === 1 ? "seat" : "seats"} — rare enough that it will be cited for a decade.`;
}

function describePresidential(share: number, won: boolean, title: string, opponent: string | undefined): string {
  const points = Math.round(share * 100);
  const named = title.charAt(0).toUpperCase() + title.slice(1);
  const against = opponent ? ` over ${opponent}` : "";
  const by = opponent ? ` to ${opponent}` : "";
  return won
    ? `${named} is re-elected${against} with ${points} percent of the vote, and the second term begins where the first one left the country.`
    : `${named} is defeated${by}, ${points} percent against a country that had heard enough, and the administration ends at the inauguration.`;
}

function describeDeadlock(share: number, title: string): string {
  const named = title.charAt(0).toUpperCase() + title.slice(1);
  return `${named} takes ${Math.round(share * 100)} percent of the vote and is not returned: the term ends at the inauguration with nobody chosen to succeed.`;
}

const ACTING_LINES: Readonly<Record<ContingentActing, string>> = {
  "administration-running-mate": "the Senate chooses the administration's running mate as Vice President, who acts as President from the inauguration",
  "opponent-running-mate": "the Senate chooses the other ticket's running mate as Vice President, who acts as President from the inauguration",
  speaker: "the Senate finds no majority for either running mate, and the Speaker of the House acts as President from the inauguration",
};

function describeContingent(vote: ContingentVote): string {
  const count = `${vote.forAdministration} delegations to ${vote.forOpponent}, ${vote.divided} divided`;
  if (vote.acting) {
    return `The Electoral College splits 269 to 269, and the House, voting one state to a delegation, ballots until the inauguration without a majority, ${count}; ${ACTING_LINES[vote.acting]}.`;
  }
  return vote.won
    ? `The Electoral College splits 269 to 269, and the House, voting one state to a delegation, keeps the administration in office, ${count}.`
    : `The Electoral College splits 269 to 269, and the House, voting one state to a delegation, does not return the administration, ${count}.`;
}

/**
 * Whether the President keeps the office. A majority of the college wins it
 * outright; an exact tie goes to the House, which chooses by state, and a tie
 * is never read as a loss.
 */
function presidentialVerdict(
  campaign: Campaign,
  share: number,
): { readonly won: boolean; readonly contingent?: ContingentVote } {
  if (Object.keys(campaign.states).length === 0) return { won: share > 0.5 };
  const votes = electoralVotesWon(campaign, share, campaign.congress);
  if (votes * 2 !== ELECTORAL_COLLEGE) return { won: votes >= Math.floor(ELECTORAL_COLLEGE / 2) + 1 };
  const contingent = contingentHouseVote(campaign);
  return { won: contingent.won, contingent };
}

function opponentName(campaign: Campaign): string | undefined {
  const opponent = selectOpponent(campaign);
  return opponent ? campaign.people[opponent.person]?.base.name : undefined;
}

/**
 * The one place an election is settled.
 *
 * Pure and seed-independent, the same contract every projection in the engine
 * holds: it reads `projectVote` and nothing else to decide the count, so what a
 * president was shown all term is what happens on the night.
 */
export function holdElection(
  campaign: Campaign,
  charter: Charter | undefined,
  kind: ElectionKind,
  turn: number,
): ElectionResult {
  const share = projectVote(campaign).share;
  const title = headOfGovernmentTitle(campaign.founding.leadRole, charter?.roleTitles);
  const seatClass = senateClassUpIn(campaign.calendar.year);
  const night = holdGovernorRacesDueToday(campaign, turn);
  const swing = Object.fromEntries(
    CHAMBERS.map((chamber) => [
      chamber,
      seatSwing(share, chamber, campaign.congress.chambers[chamber], campaign, kind),
    ]),
  ) as SeatSwing;
  const races = night.results.length > 0 ? { governors: night.results } : {};
  const stateCalls = projectedStateCalls(campaign, share);
  const classUp = seatClass === undefined ? {} : { senateClass: seatClass };
  if (kind === "midterm") {
    return {
      id: `election:midterm:${turn}`,
      kind,
      turn,
      voteShare: share,
      stateCalls,
      swing,
      summary: [describeMidterm(swing, title), describeGovernorNight(night.results, campaign)]
        .filter((line) => line.length > 0)
        .join(" "),
      ...races,
      ...classUp,
    };
  }
  const { won, contingent } = presidentialVerdict(campaign, share);
  const opening = contingent?.deadlocked ? describeDeadlock(share, title) : describePresidential(share, won, title, opponentName(campaign));
  const verdict = [opening, contingent ? describeContingent(contingent) : ""];
  return {
    id: `election:presidential:${turn}`,
    kind,
    turn,
    voteShare: share,
    stateCalls,
    // A presidential year moves Congress too, on its own sensitivity and with no
    // midterm penalty against it. Before this the chambers a President won with
    // were the chambers the last midterm left them, for four more years.
    swing,
    won,
    summary: [...verdict, describeGovernorNight(night.results, campaign)]
      .filter((line) => line.length > 0)
      .join(" "),
    ...races,
    ...classUp,
  };
}

/**
 * The clock after a result.
 *
 * A win records the result and nothing else. The second term it earns begins at
 * the next Inauguration Day, not on election night: until then the President is
 * still serving the first one, and a clock that turned over in November would
 * count the ten weeks before the oath as the second term's opening.
 *
 * No outcome on a win either: a second term is a presidency whose future is open
 * again, and a clock that still read "re-elected" four years later would be
 * stating the last thing that happened rather than where the campaign stands.
 */
export function advanceClock(clock: TermClock, result: ElectionResult): TermClock {
  const elections = [...clock.elections, result];
  if (result.kind === "presidential" && result.won !== true) return { ...clock, elections, outcome: "defeated" };
  return { ...clock, elections };
}

/**
 * The Inauguration Day a won contest is waiting on, if one is.
 *
 * A term is owed for every contest won, so a clock whose term has not caught up
 * with its wins has an oath still to take, on the Inauguration Day that closes
 * the term being served.
 */
export function pendingInauguration(campaign: Campaign): GameDate | undefined {
  const clock = campaign.termClock;
  const won = clock.elections.filter((election) => election.kind === "presidential" && election.won === true).length;
  if (clock.term > won) return undefined;
  return inaugurationDayOf(campaignFoundingDate(campaign).year + TERM_YEARS * clock.term);
}

/** The clock at the end of a last term, where there is no contest to hold. */
function termLimited(turn: number, title: string): ElectionResult {
  return {
    id: `election:presidential:${turn}`,
    kind: "presidential",
    turn,
    voteShare: 0,
    summary: `${title.charAt(0).toUpperCase()}${title.slice(1)} is not on the ballot. Two terms is what the charter allows, and the administration ends having served both of them.`,
  };
}

// --- What a campaign ended as ----------------------------------------------

export type CampaignEnding = "in-office" | "removed" | "defeated" | "term-limited";

/**
 * How this presidency stands, in one word.
 *
 * Removal is read first because it is the only ending that can arrive on a day
 * nobody scheduled, and a president convicted in the last week of a term did not
 * serve it out. Everything downstream asks this rather than testing two
 * unrelated fields, which is what keeps "you were removed" and "you lost" from
 * ever being printed as the same sentence.
 */
export function selectEnding(campaign: Campaign): CampaignEnding {
  if (campaign.removal.resolved) return "removed";
  const outcome = campaign.termClock.outcome;
  if (outcome === "defeated" || outcome === "term-limited") return outcome;
  return "in-office";
}

/** Whether the campaign is over, whichever way it went. */
export function campaignIsOver(campaign: Campaign): boolean {
  return selectEnding(campaign) !== "in-office";
}

// --- The day ------------------------------------------------------------------

function capitalized(title: string): string {
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}`;
}

/** The second term's oath: the clock turns over on the day, not on election night. */
function inaugurationPacket(campaign: Campaign, title: string, turn: number): EffectPacket {
  const summary = `${capitalized(title)} takes the oath for a second term, and the clock the country will judge it by starts again.`;
  const clock: TermClock = { ...campaign.termClock, term: campaign.termClock.term + 1, termStartTurn: turn };
  return simulated(turn, summary, [
    { kind: "termClock", set: clock },
    { kind: "feed", items: [coverage(summary, turn)] },
  ]);
}

function electionPacket(
  campaign: Campaign,
  charter: Charter | undefined,
  scheduled: ScheduledElection,
  title: string,
  turn: number,
): EffectPacket {
  if (scheduled.kind === "presidential" && campaign.termClock.term >= TERM_LIMIT) {
    const result = termLimited(turn, title);
    const clock: TermClock = { ...campaign.termClock, elections: [...campaign.termClock.elections, result], outcome: "term-limited" };
    return simulated(turn, result.summary, [
      { kind: "termClock", set: clock },
      { kind: "feed", items: [coverage(result.summary, turn)] },
    ]);
  }
  const result = holdElection(campaign, charter, scheduled.kind, turn);
  const effects: Effect[] = [
    { kind: "termClock", set: advanceClock(campaign.termClock, result) },
    { kind: "feed", items: [coverage(result.summary, turn)] },
  ];
  // A Congress chosen in November is sworn in on January 3, and for the nine
  // weeks between the two the chambers the last election made still hold the
  // floor. Recomposing on the night would erase the lame-duck session entirely
  // — the one stretch of a term where a majority about to disappear still votes.
  if (result.swing) {
    effects.push({ kind: "congress", set: withPendingSeating(campaign, result.swing) });
  }
  // The same pure settlement `holdElection` read for the result above, asked
  // again for its effects. Two calls rather than one threaded value because
  // `holdElection` is the seam a projection reads and must return a whole result
  // on its own; they cannot disagree, because nothing here draws.
  effects.push(...holdGovernorRacesDueToday(campaign, turn).effects);
  // A re-elected president comes back with something to spend, and a defeated
  // one spends the remaining weeks as what the papers will call them.
  if (result.kind === "presidential") {
    effects.push({ kind: "metric", deltas: result.won === true ? { standing: 0.08 } : { standing: -0.1 } });
  }
  return simulated(turn, result.summary, effects);
}

/**
 * What the term's calendar owes the campaign by `through`: an election whose
 * day has come, or the oath a won contest is waiting on. At most one, and
 * nothing at all on every other day.
 *
 * A fixed date the player can read off the clock and govern toward is the
 * whole value of this, and a rolling "chance of an election" would be neither
 * fixed nor a date. `turn` is the turn the event is filed under — the result,
 * the ledger entry and the story all carry it — and it is the caller's to say
 * because the day loop and the weekly tick stand on different turns when they
 * reach the same date.
 */
function termEventsDue(
  campaign: Campaign,
  charter: Charter | undefined,
  through: GameDate,
  turn: number,
): readonly EffectPacket[] {
  if ((charter !== undefined && !holdsElections(charter)) || campaignIsOver(campaign)) return [];
  const title = headOfGovernmentTitle(campaign.founding.leadRole, charter?.roleTitles);
  const pending = campaign.congress.seatingOn;
  if (pending !== undefined && compareDates(selectDateOfTurn(campaign, pending.seatsTurn), through) <= 0) {
    return [seatingPacket(campaign, turn)];
  }
  const oath = pendingInauguration(campaign);
  if (oath !== undefined && compareDates(oath, through) <= 0) return [inaugurationPacket(campaign, title, turn)];
  const scheduled = nextElection(campaign);
  // An off-year governors' night is not a federal election: it files no result on
  // the term clock, moves no chamber and stops no run. It is settled by
  // `governorPhase`, in the week its November falls in, rather than here — the
  // day loop runs this every calendar day, so a settlement filed from it lands
  // between two of the following week's phases while carrying the closed week's
  // turn, and the same week then reads differently under the two week layouts.
  if (!scheduled || compareDates(scheduled.date, through) > 0) return [];
  return [electionPacket(campaign, charter, scheduled, title, turn)];
}

/**
 * The charter a campaign was founded under, for the day loop, which is not
 * handed one. A campaign whose charter the dataset does not name is read as the
 * one playable constitution, the same default the vote projection takes.
 */
function charterOfCampaign(campaign: Campaign): Charter | undefined {
  return worldDataset.charters.find((entry) => entry.id === campaign.founding.charter);
}

/**
 * The day-by-day advance's election day: holds whatever the calendar owes the
 * campaign today and returns the campaign it leaves.
 *
 * This is where an election is actually held: on its own day, whatever weekday
 * the weekly tick happens to fall on, so a result is filed on federal Election
 * Day and a defeat ends the run that same day. A day that owes nothing returns
 * the campaign it was given.
 */
export function holdElectionsDueToday(campaign: Campaign): Campaign {
  const due = termEventsDue(campaign, charterOfCampaign(campaign), campaign.calendar, campaign.turn);
  return due.reduce((state, packet) => apply(state, packet), campaign);
}

/**
 * The same calendar, read at the weekly tick.
 *
 * In the day-by-day advance the day's own resolver has already held a date by
 * the time its week closes, so this finds nothing there. It is what a caller
 * driving whole weeks with `advanceTurn` gets instead: the event is held in the
 * week whose last day reaches it, rather than never.
 */
export function electionPhase(charter: Charter): TurnPhase {
  return (state: Campaign) => termEventsDue(state, charter, selectDateOfTurn(state, state.turn + 1), state.turn + 1);
}
