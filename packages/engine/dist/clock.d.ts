import type { Campaign, GameDate } from "./state.js";
import type { OfficeDay } from "./state-week.js";
/**
 * Days from 1970-01-01 for a proleptic Gregorian date, and back.
 *
 * Howard Hinnant's civil algorithms, unmodified. They are here rather than a
 * loop over `daysInMonth` because every question below — how far apart are two
 * dates, what weekday is this, what is the second Tuesday of November — is
 * O(1) once a date is an integer, and O(months) if it is not. A campaign asks
 * these on every advance across a hundred-plus scheduled events.
 */
export declare function daysFromCivil(date: GameDate): number;
export declare function civilFromDays(days: number): GameDate;
/** Signed: positive when `to` is later. */
export declare function daysBetween(from: GameDate, to: GameDate): number;
/** Negative counts run backwards, which `advanceCalendar` cannot do. */
export declare function addDays(date: GameDate, days: number): GameDate;
/** -1, 0 or 1, so a caller can sort dates without unpacking them. */
export declare function compareDates(a: GameDate, b: GameDate): number;
export declare function isSameDate(a: GameDate, b: GameDate): boolean;
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** 0 = Sunday. 1970-01-01 was a Thursday, which is what the +4 settles. */
export declare function weekdayOf(date: GameDate): Weekday;
/** The `nth` (1-based) `weekday` of a month — used by the election rules below. */
export declare function nthWeekdayOfMonth(year: number, month: number, weekday: Weekday, nth: number): GameDate;
/**
 * Inauguration Day: January 20 of the year following a presidential election,
 * fixed by the Twentieth Amendment. A term runs exactly four years from it.
 */
export declare const INAUGURATION_MONTH = 1;
export declare const INAUGURATION_DAY = 20;
/** The oath of the term the player takes office in: the inauguration after the 2028 election. */
export declare const FIRST_INAUGURATION: GameDate;
/**
 * The day a sealed campaign opens on: the oath itself. The seal reads it from
 * here rather than writing a date of its own, so the calendar has one owner and
 * the date a campaign starts can never disagree with the dates the clock counts
 * from — the midterm, the contest and the fiscal year are all read off it.
 */
export declare const CAMPAIGN_OPENING_DATE: GameDate;
/** The federal fiscal year opens October 1; appropriations are due the day before. */
export declare const FISCAL_YEAR_START_MONTH = 10;
export declare const FISCAL_YEAR_START_DAY = 1;
/** A new Congress convenes January 3, also by the Twentieth Amendment. */
export declare const CONGRESS_CONVENES_MONTH = 1;
export declare const CONGRESS_CONVENES_DAY = 3;
export declare const TERM_YEARS = 4;
/**
 * Federal Election Day: the Tuesday after the first Monday in November, which
 * is not the same thing as the first Tuesday. In a year whose November opens on
 * a Tuesday the first Monday falls on the 7th and the election on the 8th.
 */
export declare function federalElectionDay(year: number): GameDate;
/** Presidential elections fall on the election day of every year divisible by four. */
export declare function isPresidentialElectionYear(year: number): boolean;
/** Midterms are the even years that are not presidential years. */
export declare function isMidtermYear(year: number): boolean;
/**
 * Virginia and New Jersey elect their governors in the November after a
 * presidential election, the only two states that do, so the first autumn of a
 * term is not the quiet one it would otherwise be.
 */
export declare function isOffYearGubernatorialYear(year: number): boolean;
export declare function inaugurationDayOf(year: number): GameDate;
/** October 1 of the calendar year before: FY2030 opens October 1, 2029. */
export declare function fiscalYearStart(fiscalYear: number): GameDate;
/**
 * The last day appropriations for `fiscalYear` can be enacted before the
 * accounts lapse: September 30 before the year opens, so FY2030's is
 * September 30, 2029.
 */
export declare function appropriationsDeadline(fiscalYear: number): GameDate;
/** The fiscal year a date falls in. FY2030 runs October 1, 2029 through September 30, 2030. */
export declare function fiscalYearOf(date: GameDate): number;
/** The last day of `fiscalYear`, which is the next year's appropriations deadline. */
export declare function fiscalYearEnd(fiscalYear: number): GameDate;
export type ConstitutionalMilestoneKind = "inauguration" | "midterm-election" | "presidential-election" | "gubernatorial-election" | "congress-convenes" | "fiscal-year-start" | "appropriations-deadline";
export type ConstitutionalMilestone = {
    readonly kind: ConstitutionalMilestoneKind;
    readonly date: GameDate;
    /** How it is named on a surface. Whole sentences live on the surface, not here. */
    readonly label: string;
    readonly daysAway: number;
};
export type CampaignClock = {
    readonly currentDate: GameDate;
    readonly inaugurationDate: GameDate;
    readonly termStartDate: GameDate;
    readonly termEndDate: GameDate;
    /** 1 for the term taken office in, 2 for one won at the ballot. */
    readonly termNumber: number;
    /** Days since inauguration. Never used for RNG — `campaign.turn` still is. */
    readonly ordinal: number;
    readonly dayOfTerm: number;
    readonly daysLeftInTerm: number;
};
/**
 * Everything the Constitution puts on the calendar between two dates, in order.
 *
 * Derived rather than stored, so it cannot fall out of step with the date the
 * campaign is actually on, and so a save carries none of it.
 */
export declare function milestonesBetween(from: GameDate, to: GameDate): readonly ConstitutionalMilestone[];
/** The milestones ahead of `from`, nearest first, at most `limit` of them. */
export declare function nextConstitutionalDates(from: GameDate, limit?: number): readonly ConstitutionalMilestone[];
/**
 * Reads the clock off a campaign's own date and term.
 *
 * `termStartDate` is derived from the term the campaign is serving rather than
 * stored, so no save gains a field and no existing campaign is refused. A first
 * term starts on the campaign's founding date — which is the day this
 * administration took office — and a later term starts at the inauguration
 * following its election.
 */
export declare function campaignClock(input: {
    readonly currentDate: GameDate;
    readonly foundingDate: GameDate;
    readonly termNumber: number;
}): CampaignClock;
/**
 * The day this administration took office.
 *
 * Stored on the campaign when present. Derived from the calendar and turn
 * only for a save that predates the field, then persisted by `loadSave` so a
 * later intra-week advance cannot move the founding date.
 */
export declare function campaignFoundingDate(campaign: Campaign): GameDate;
/**
 * The day of this presidency: how many days have passed since the oath.
 *
 * Measured off the calendar rather than multiplied out of the turn ordinal, so
 * it is the same number `CampaignClock.ordinal` reports and the same number a
 * room's date is rendered from. Inauguration day is day zero, which is what
 * makes "opened on day 0, due on day 60" a sentence about the calendar rather
 * than about the tick that happened to be running.
 */
export declare function campaignDay(campaign: Campaign): number;
/**
 * The office day of a date, counted from the oath.
 *
 * Day 1 is the first day after inauguration. The oath morning itself has not
 * had an office day yet; callers that ask anyway get day 1, which is the day
 * the first step lands on.
 */
export declare function dayOfWeekInOffice(campaign: Campaign, date?: GameDate): OfficeDay;
/**
 * The day the week the campaign is standing in closes on.
 *
 * The one-shot week runs every phase on this day and the office-day cut runs
 * its seventh group on it, so a weekly phase that dates a clock here starts
 * that clock on the same day under either layout; dated off its own office
 * day, the clock would run up to six extra days whenever the cut is on. The
 * oath morning keeps its own date, because `advanceTurn` ticks the first week
 * there before any day has been stepped.
 */
export declare function weekCloseDate(campaign: Campaign): GameDate;
/** The clock a surface reads, off the campaign itself. */
export declare function selectCampaignClock(campaign: Campaign): CampaignClock;
/**
 * The calendar date a given turn fell on.
 *
 * Surfaces hold a turn ordinal in a dozen places — an order's turn, a ledger
 * entry's turn, a review's ruling turn — and every one of them wants to show a
 * date. Derived from the same founding date as everything else here, so a
 * screen never has to reconstruct it and two screens can never disagree about
 * what day week nine was.
 */
export declare function selectDateOfTurn(campaign: Campaign, turn: number): GameDate;
/**
 * The turn a day's business is filed under, for a presidency whose first turn
 * opened on `foundingDate`.
 *
 * It is the turn the day-by-day advance is on while it does that day's work,
 * so an election on a Tuesday and an order signed that Tuesday carry the same
 * turn, whichever weekday the oath fell on. A week closes at the end of its
 * seventh day, after that day's business, which is why the day a turn is dated
 * from (`selectDateOfTurn`) still files under the turn before it.
 */
export declare function turnOnDate(foundingDate: GameDate, date: GameDate): number;
/** `turnOnDate`, off the campaign's own founding date. */
export declare function selectTurnOfDate(campaign: Campaign, date: GameDate): number;
/** The turn the last day of `fiscalYear` is filed under: what a book for that year funds the government through. */
export declare function selectFiscalYearEndTurn(campaign: Campaign, fiscalYear: number): number;
/**
 * The fiscal year a book enacted today pays for.
 *
 * The year the calendar is in, unless the government is already funded to its
 * end, in which case it is the next one: a budget passed in March pays for the
 * year that opens in October, and one passed in a lapsed October pays for the
 * year that has already begun. A second book in the same spring pays for the
 * same year again, so funding cannot be banked a year at a time.
 */
export declare function selectBudgetYear(campaign: Campaign): number;
/** What the Constitution puts on this president's calendar next. */
export declare function selectNextMilestones(campaign: Campaign, limit?: number): readonly ConstitutionalMilestone[];
/** "March 14, 2027" — the one date format the player app writes. */
export declare function formatGameDate(date: GameDate): string;
/** "Mar 14" — the short form, for a row that cannot spend a line on a date. */
export declare function formatGameDateShort(date: GameDate): string;
