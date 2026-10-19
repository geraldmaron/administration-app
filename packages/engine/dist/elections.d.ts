import { type Charter } from "@admin/world";
import type { Campaign, ElectionKind, ElectionResult, GameDate, TermClock } from "./state.js";
import { type ConstitutionalMilestone } from "./clock.js";
import type { TurnPhase } from "./turn-loop.js";
/**
 * A presidential term, in the weekly turns everything else is counted in: the
 * whole weeks from one Inauguration Day to the next.
 *
 * A count derived from the calendar, for the readings that measure a span in
 * turns (a harness horizon, a week-of-term label). No election is scheduled off
 * it: the dates come from `presidencyElections`, so this can never move one.
 */
export declare const TERM_TURNS: number;
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
export declare const TERM_LIMIT = 2;
/**
 * Whether this charter's executive faces the country on a fixed date at all.
 *
 * Only two of the removal mechanisms describe a government that does. A
 * parliamentary one is chosen by its assembly rather than by a national ballot
 * on a date nobody can move, and a junta or a clerical council does not hold
 * one — so under those charters the clock exists, holds no elections, and the
 * campaign is bounded by the removal arc alone, exactly as it was.
 */
export declare function holdsElections(charter: Charter): boolean;
/** The clock a presidency starts on, the week it takes the oath. */
export declare function openingTermClock(turn: number): TermClock;
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
/**
 * Every federal election a presidency founded on `foundingDate` can face, in
 * the order they fall: a midterm and a contest per term, for as many terms as
 * the office allows.
 *
 * Read off `milestonesBetween`, the calendar every surface prints its dates
 * from, so the election the Desk announces and the one the engine holds are the
 * same event on the same day by construction rather than by agreement.
 */
export declare function presidencyElections(foundingDate: GameDate): readonly ConstitutionalMilestone[];
/**
 * The next fixed date, or nothing at all once the presidency's own future is
 * settled.
 *
 * Elections are held in order and each exactly once, so the next one is the
 * schedule's entry after the ones already on the clock. Nothing is counted down
 * or stored, so a save reloaded halfway through a term knows exactly when it is.
 */
export declare function nextElection(campaign: Campaign): ScheduledElection | undefined;
export type VoteDriver = {
    /** What moved the count, in the words a night's coverage would use. */
    readonly reason: string;
    readonly delta: number;
};
export type VoteProjection = {
    readonly share: number;
    readonly drivers: readonly VoteDriver[];
};
/**
 * What a term is expected to put on the statute book before the absence of a
 * record stops being a gap and becomes the record.
 *
 * Six over four years: a President who signs fewer than about one and a half
 * acts a year has not legislated, and one who clears six has. A design figure
 * rather than a measured one, and the one dial this driver has.
 */
export declare const LAWS_EXPECTED_PER_TERM = 6;
export declare function projectVote(campaign: Campaign): VoteProjection;
export * from "./election-seating.js";
export * from "./turnout.js";
export * from "./momentum.js";
export * from "./states-acting.js";
/**
 * The one place an election is settled.
 *
 * Pure and seed-independent, the same contract every projection in the engine
 * holds: it reads `projectVote` and nothing else to decide the count, so what a
 * president was shown all term is what happens on the night.
 */
export declare function holdElection(campaign: Campaign, charter: Charter | undefined, kind: ElectionKind, turn: number): ElectionResult;
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
export declare function advanceClock(clock: TermClock, result: ElectionResult): TermClock;
/**
 * The Inauguration Day a won contest is waiting on, if one is.
 *
 * A term is owed for every contest won, so a clock whose term has not caught up
 * with its wins has an oath still to take, on the Inauguration Day that closes
 * the term being served.
 */
export declare function pendingInauguration(campaign: Campaign): GameDate | undefined;
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
export declare function selectEnding(campaign: Campaign): CampaignEnding;
/** Whether the campaign is over, whichever way it went. */
export declare function campaignIsOver(campaign: Campaign): boolean;
/**
 * The day-by-day advance's election day: holds whatever the calendar owes the
 * campaign today and returns the campaign it leaves.
 *
 * This is where an election is actually held: on its own day, whatever weekday
 * the weekly tick happens to fall on, so a result is filed on federal Election
 * Day and a defeat ends the run that same day. A day that owes nothing returns
 * the campaign it was given.
 */
export declare function holdElectionsDueToday(campaign: Campaign): Campaign;
/**
 * The same calendar, read at the weekly tick.
 *
 * In the day-by-day advance the day's own resolver has already held a date by
 * the time its week closes, so this finds nothing there. It is what a caller
 * driving whole weeks with `advanceTurn` gets instead: the event is held in the
 * week whose last day reaches it, rather than never.
 */
export declare function electionPhase(charter: Charter): TurnPhase;
