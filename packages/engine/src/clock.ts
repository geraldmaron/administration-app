import { advanceCalendar } from "./calendar.js";
import { elapsedDays, weeksFor } from "./pace.js";
import type { Campaign, GameDate } from "./state.js";
import type { OfficeDay } from "./state-week.js";
import { DAYS_PER_TURN } from "./turn-clock.js";

// The campaign clock: the presidency told in the dates it actually runs on.
//
// The game has always kept a `GameDate`, and `advanceCalendar` has always moved
// it. What it has never had is anything that could answer "when is the next
// thing the Constitution makes me do" — so the presidency was experienced as a
// turn ordinal, and every screen said WK7 because WK7 was the only reading
// anything could produce.
//
// Nothing here reads a wall clock or constructs a `Date`. Every function is
// arithmetic over the civil calendar, which is what keeps a campaign
// deterministic and replayable: the same campaign always produces the same
// milestones, on the same days, on every machine.
//
// The deterministic simulation ordinal (`campaign.turn`) is untouched and stays
// the RNG's and the save format's index. It is no longer the experience.
//
// This module is also the one place that answers "what day of this presidency
// is it". Every day-stamped record in the engine — a nomination's opening, a
// war powers window, a finding's close, an intelligence tasking — is on the
// same counter the rooms print dates from, because a second derivation of the
// same day is a second presidency running a week apart from the first.
//
// A turn becomes days, and days a turn, only through pace.ts's converters, a
// leaf with no imports of its own: turn-loop sits in a value-import cycle that
// reaches the effect applier, and this module is read at module scope by
// constants that must never see it half-initialized.

/**
 * Days from 1970-01-01 for a proleptic Gregorian date, and back.
 *
 * Howard Hinnant's civil algorithms, unmodified. They are here rather than a
 * loop over `daysInMonth` because every question below — how far apart are two
 * dates, what weekday is this, what is the second Tuesday of November — is
 * O(1) once a date is an integer, and O(months) if it is not. A campaign asks
 * these on every advance across a hundred-plus scheduled events.
 */
export function daysFromCivil(date: GameDate): number {
  const y = date.year - (date.month <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (date.month + (date.month > 2 ? -3 : 9)) + 2) / 5) + date.day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function civilFromDays(days: number): GameDate {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  return { year: y + (month <= 2 ? 1 : 0), month, day };
}

/** Signed: positive when `to` is later. */
export function daysBetween(from: GameDate, to: GameDate): number {
  return daysFromCivil(to) - daysFromCivil(from);
}

/** Negative counts run backwards, which `advanceCalendar` cannot do. */
export function addDays(date: GameDate, days: number): GameDate {
  if (days >= 0) return advanceCalendar(date, days);
  return civilFromDays(daysFromCivil(date) + days);
}

/** -1, 0 or 1, so a caller can sort dates without unpacking them. */
export function compareDates(a: GameDate, b: GameDate): number {
  const diff = daysFromCivil(a) - daysFromCivil(b);
  return diff === 0 ? 0 : diff < 0 ? -1 : 1;
}

export function isSameDate(a: GameDate, b: GameDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 0 = Sunday. 1970-01-01 was a Thursday, which is what the +4 settles. */
export function weekdayOf(date: GameDate): Weekday {
  const shifted = (daysFromCivil(date) + 4) % 7;
  return ((shifted + 7) % 7) as Weekday;
}

/** The `nth` (1-based) `weekday` of a month — used by the election rules below. */
export function nthWeekdayOfMonth(year: number, month: number, weekday: Weekday, nth: number): GameDate {
  const first = { year, month, day: 1 };
  const offset = (weekday - weekdayOf(first) + 7) % 7;
  return addDays(first, offset + (nth - 1) * 7);
}

// --- The dates the presidency is actually built around -------------------

/**
 * Inauguration Day: January 20 of the year following a presidential election,
 * fixed by the Twentieth Amendment. A term runs exactly four years from it.
 */
export const INAUGURATION_MONTH = 1;
export const INAUGURATION_DAY = 20;

/** The oath of the term the player takes office in: the inauguration after the 2028 election. */
export const FIRST_INAUGURATION: GameDate = { year: 2029, month: INAUGURATION_MONTH, day: INAUGURATION_DAY };

/**
 * The day a sealed campaign opens on: the oath itself. The seal reads it from
 * here rather than writing a date of its own, so the calendar has one owner and
 * the date a campaign starts can never disagree with the dates the clock counts
 * from — the midterm, the contest and the fiscal year are all read off it.
 */
export const CAMPAIGN_OPENING_DATE: GameDate = FIRST_INAUGURATION;

/** The federal fiscal year opens October 1; appropriations are due the day before. */
export const FISCAL_YEAR_START_MONTH = 10;
export const FISCAL_YEAR_START_DAY = 1;

/** A new Congress convenes January 3, also by the Twentieth Amendment. */
export const CONGRESS_CONVENES_MONTH = 1;
export const CONGRESS_CONVENES_DAY = 3;

export const TERM_YEARS = 4;

/**
 * Federal Election Day: the Tuesday after the first Monday in November, which
 * is not the same thing as the first Tuesday. In a year whose November opens on
 * a Tuesday the first Monday falls on the 7th and the election on the 8th.
 */
export function federalElectionDay(year: number): GameDate {
  const firstMonday = nthWeekdayOfMonth(year, 11, 1, 1);
  return addDays(firstMonday, 1);
}

/** Presidential elections fall on the election day of every year divisible by four. */
export function isPresidentialElectionYear(year: number): boolean {
  return year % 4 === 0;
}

/** Midterms are the even years that are not presidential years. */
export function isMidtermYear(year: number): boolean {
  return year % 2 === 0 && !isPresidentialElectionYear(year);
}

/**
 * Virginia and New Jersey elect their governors in the November after a
 * presidential election, the only two states that do, so the first autumn of a
 * term is not the quiet one it would otherwise be.
 */
export function isOffYearGubernatorialYear(year: number): boolean {
  return year % 4 === 1;
}

export function inaugurationDayOf(year: number): GameDate {
  return { year, month: INAUGURATION_MONTH, day: INAUGURATION_DAY };
}

/** October 1 of the calendar year before: FY2030 opens October 1, 2029. */
export function fiscalYearStart(fiscalYear: number): GameDate {
  return { year: fiscalYear - 1, month: FISCAL_YEAR_START_MONTH, day: FISCAL_YEAR_START_DAY };
}

/**
 * The last day appropriations for `fiscalYear` can be enacted before the
 * accounts lapse: September 30 before the year opens, so FY2030's is
 * September 30, 2029.
 */
export function appropriationsDeadline(fiscalYear: number): GameDate {
  return addDays(fiscalYearStart(fiscalYear), -1);
}

/** The fiscal year a date falls in. FY2030 runs October 1, 2029 through September 30, 2030. */
export function fiscalYearOf(date: GameDate): number {
  return date.month >= FISCAL_YEAR_START_MONTH ? date.year + 1 : date.year;
}

/** The last day of `fiscalYear`, which is the next year's appropriations deadline. */
export function fiscalYearEnd(fiscalYear: number): GameDate {
  return appropriationsDeadline(fiscalYear + 1);
}

// --- The clock a surface reads ------------------------------------------

export type ConstitutionalMilestoneKind =
  | "inauguration"
  | "midterm-election"
  | "presidential-election"
  | "gubernatorial-election"
  | "congress-convenes"
  | "fiscal-year-start"
  | "appropriations-deadline";

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
export function milestonesBetween(from: GameDate, to: GameDate): readonly ConstitutionalMilestone[] {
  const found: { kind: ConstitutionalMilestoneKind; date: GameDate; label: string }[] = [];
  for (let year = from.year; year <= to.year + 1; year++) {
    found.push({ kind: "congress-convenes", date: { year, month: CONGRESS_CONVENES_MONTH, day: CONGRESS_CONVENES_DAY }, label: "Congress convenes" });
    found.push({ kind: "fiscal-year-start", date: fiscalYearStart(year + 1), label: `FY${year + 1} begins` });
    found.push({ kind: "appropriations-deadline", date: appropriationsDeadline(year + 1), label: `FY${year + 1} appropriations due` });
    if (isPresidentialElectionYear(year)) {
      found.push({ kind: "presidential-election", date: federalElectionDay(year), label: "Presidential election" });
      found.push({ kind: "inauguration", date: inaugurationDayOf(year + 1), label: "Inauguration Day" });
    }
    if (isMidtermYear(year)) {
      found.push({ kind: "midterm-election", date: federalElectionDay(year), label: "Midterm elections" });
    }
    if (isOffYearGubernatorialYear(year)) {
      found.push({ kind: "gubernatorial-election", date: federalElectionDay(year), label: "Governors' races in Virginia and New Jersey" });
    }
  }
  return found
    .filter((m) => compareDates(m.date, from) > 0 && compareDates(m.date, to) <= 0)
    .sort((a, b) => compareDates(a.date, b.date))
    .map((m) => ({ ...m, daysAway: daysBetween(from, m.date) }));
}

/** The milestones ahead of `from`, nearest first, at most `limit` of them. */
export function nextConstitutionalDates(from: GameDate, limit = 3): readonly ConstitutionalMilestone[] {
  // Two years is past the widest gap between any two milestones above, so this
  // window can never come back short while milestones remain.
  return milestonesBetween(from, addDays(from, 366 * 2)).slice(0, limit);
}

/**
 * Reads the clock off a campaign's own date and term.
 *
 * `termStartDate` is derived from the term the campaign is serving rather than
 * stored, so no save gains a field and no existing campaign is refused. A first
 * term starts on the campaign's founding date — which is the day this
 * administration took office — and a later term starts at the inauguration
 * following its election.
 */
export function campaignClock(input: {
  readonly currentDate: GameDate;
  readonly foundingDate: GameDate;
  readonly termNumber: number;
}): CampaignClock {
  const { currentDate, foundingDate, termNumber } = input;
  const termStartDate =
    termNumber <= 1 ? foundingDate : inaugurationDayOf(foundingDate.year + TERM_YEARS * (termNumber - 1));
  const termEndDate = { ...termStartDate, year: termStartDate.year + TERM_YEARS };
  return {
    currentDate,
    inaugurationDate: foundingDate,
    termStartDate,
    termEndDate,
    termNumber,
    ordinal: daysBetween(foundingDate, currentDate),
    dayOfTerm: daysBetween(termStartDate, currentDate),
    daysLeftInTerm: daysBetween(currentDate, termEndDate),
  };
}

// --- The campaign's own clock, read off the campaign ---------------------

/**
 * The day this administration took office.
 *
 * Stored on the campaign when present. Derived from the calendar and turn
 * only for a save that predates the field, then persisted by `loadSave` so a
 * later intra-week advance cannot move the founding date.
 */
export function campaignFoundingDate(campaign: Campaign): GameDate {
  if (campaign.foundingDate) return campaign.foundingDate;
  return addDays(campaign.calendar, -elapsedDays(campaign.turn - 1));
}

/**
 * The day of this presidency: how many days have passed since the oath.
 *
 * Measured off the calendar rather than multiplied out of the turn ordinal, so
 * it is the same number `CampaignClock.ordinal` reports and the same number a
 * room's date is rendered from. Inauguration day is day zero, which is what
 * makes "opened on day 0, due on day 60" a sentence about the calendar rather
 * than about the tick that happened to be running.
 */
export function campaignDay(campaign: Campaign): number {
  return daysBetween(campaignFoundingDate(campaign), campaign.calendar);
}

/**
 * The office day of a date, counted from the oath.
 *
 * Day 1 is the first day after inauguration. The oath morning itself has not
 * had an office day yet; callers that ask anyway get day 1, which is the day
 * the first step lands on.
 */
export function dayOfWeekInOffice(campaign: Campaign, date: GameDate = campaign.calendar): OfficeDay {
  const elapsed = daysBetween(campaignFoundingDate(campaign), date);
  const stepped = elapsed <= 0 ? 1 : elapsed;
  return ((((stepped - 1) % 7) + 1) as OfficeDay);
}

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
export function weekCloseDate(campaign: Campaign): GameDate {
  const elapsed = campaignDay(campaign);
  if (elapsed <= 0) return campaign.calendar;
  return addDays(campaign.calendar, (DAYS_PER_TURN - (elapsed % DAYS_PER_TURN)) % DAYS_PER_TURN);
}

/** The clock a surface reads, off the campaign itself. */
export function selectCampaignClock(campaign: Campaign): CampaignClock {
  return campaignClock({
    currentDate: campaign.calendar,
    foundingDate: campaignFoundingDate(campaign),
    termNumber: campaign.termClock.term,
  });
}

/**
 * The calendar date a given turn fell on.
 *
 * Surfaces hold a turn ordinal in a dozen places — an order's turn, a ledger
 * entry's turn, a review's ruling turn — and every one of them wants to show a
 * date. Derived from the same founding date as everything else here, so a
 * screen never has to reconstruct it and two screens can never disagree about
 * what day week nine was.
 */
export function selectDateOfTurn(campaign: Campaign, turn: number): GameDate {
  return addDays(campaignFoundingDate(campaign), elapsedDays(turn - 1));
}

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
export function turnOnDate(foundingDate: GameDate, date: GameDate): number {
  return Math.max(1, weeksFor(daysBetween(foundingDate, date), "ceil"));
}

/** `turnOnDate`, off the campaign's own founding date. */
export function selectTurnOfDate(campaign: Campaign, date: GameDate): number {
  return turnOnDate(campaignFoundingDate(campaign), date);
}

/** The turn the last day of `fiscalYear` is filed under: what a book for that year funds the government through. */
export function selectFiscalYearEndTurn(campaign: Campaign, fiscalYear: number): number {
  return selectTurnOfDate(campaign, fiscalYearEnd(fiscalYear));
}

/**
 * The fiscal year a book enacted today pays for.
 *
 * The year the calendar is in, unless the government is already funded to its
 * end, in which case it is the next one: a budget passed in March pays for the
 * year that opens in October, and one passed in a lapsed October pays for the
 * year that has already begun. A second book in the same spring pays for the
 * same year again, so funding cannot be banked a year at a time.
 */
export function selectBudgetYear(campaign: Campaign): number {
  const current = fiscalYearOf(campaign.calendar);
  const fundedToItsEnd = campaign.congress.appropriation.throughTurn >= selectFiscalYearEndTurn(campaign, current);
  return fundedToItsEnd ? current + 1 : current;
}

/** What the Constitution puts on this president's calendar next. */
export function selectNextMilestones(campaign: Campaign, limit = 3): readonly ConstitutionalMilestone[] {
  return nextConstitutionalDates(campaign.calendar, limit);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** "March 14, 2027" — the one date format the player app writes. */
export function formatGameDate(date: GameDate): string {
  return `${MONTH_NAMES[date.month - 1]} ${date.day}, ${date.year}`;
}

/** "Mar 14" — the short form, for a row that cannot spend a line on a date. */
export function formatGameDateShort(date: GameDate): string {
  return `${MONTH_NAMES[date.month - 1]!.slice(0, 3)} ${date.day}`;
}
