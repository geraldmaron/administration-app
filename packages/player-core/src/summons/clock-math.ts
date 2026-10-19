import {
  DAYS_PER_TURN,
  addDays,
  weeksFor,
  campaignDay,
  formatGameDate,
  selectDateOfTurn,
  type Campaign,
  type GameDate,
} from "@admin/engine";
import type { MetricStance } from "../format/figures";
import type { SummonsDue, SummonsUrgency } from "./types";

/**
 * The arithmetic every clock runs on, and nothing else.
 *
 * Split out of `compose.ts` because the due half of a summons must be readable
 * without the advisor: `compose.ts` reaches into the owning room's counsel to
 * write prose, and the attention loop asks fourteen clocks what they are owed
 * on every tick. A module that answered that question by composing fourteen
 * briefs would run the whole advisor to decide whether the world may keep
 * running.
 *
 * Nothing here reads a room, a door or an advisor. Campaign state and dates in,
 * numbers and words out.
 */

/** Inside this many weeks a clock stops being calendar and starts being this week's work. */
const CLOSING_WEEKS = 2;

export function weeksUntil(campaign: Campaign, dueTurn: number): number {
  return dueTurn - campaign.turn;
}

export function daysUntil(campaign: Campaign, dueDay: number): number {
  return dueDay - campaignDay(campaign);
}

export function urgencyForWeeks(weeks: number, closingWithin = CLOSING_WEEKS): SummonsUrgency {
  if (weeks <= 0) return "due";
  return weeks <= closingWithin ? "closing" : "standing";
}

export function urgencyForDays(days: number, closingWithin = CLOSING_WEEKS * DAYS_PER_TURN): SummonsUrgency {
  if (days <= 0) return "due";
  return days <= closingWithin ? "closing" : "standing";
}

/**
 * How a clock reads on the stance scale every other figure in the app uses.
 *
 * A lapsed obligation is adverse rather than merely cautionary: the
 * consequence has already begun, and softening it would put a summons below a
 * press number on the same screen.
 */
export function stanceForUrgency(urgency: SummonsUrgency): MetricStance {
  if (urgency === "due") return "adverse";
  return urgency === "closing" ? "caution" : "neutral";
}

export function weeksPhrase(weeks: number): string {
  if (weeks <= 0) return "This week";
  return weeks === 1 ? "Next week" : `In ${weeks} weeks`;
}

export function daysPhrase(days: number): string {
  if (days <= 0) return "Now";
  return days === 1 ? "Tomorrow" : `In ${days} days`;
}

/** A span of weeks in the words the rest of the app counts in. */
export function weekCount(weeks: number): string {
  return weeks === 1 ? "1 week" : `${weeks} weeks`;
}

/**
 * A span of days in the app's words: days while a day is still worth
 * counting, weeks past three of them, the same cut the deadline tracks use.
 */
export function dayCount(days: number): string {
  if (days === 1) return "1 day";
  if (days < 21) return `${days} days`;
  return weekCount(weeksFor(days, "round"));
}

/** The countdown as the folio's headline figure: a bare count, in the unit the clock runs in. */
export function weeksFigure(weeks: number): string {
  if (weeks < 0) return "Lapsed";
  return weeks === 0 ? "Due" : weekCount(weeks);
}

export function daysFigure(days: number): string {
  if (days < 0) return "Lapsed";
  return days === 0 ? "Due" : dayCount(days);
}

export function weekLabel(turn: number): string {
  return `Week ${turn}`;
}

/**
 * The calendar day a turn fell on, in the one date format the player app
 * writes — never the raw turn ordinal `weekLabel` prints, which asks a
 * player to already know how long a turn is before "Week 61" means anything
 * as a deadline.
 */
export function dateLabel(campaign: Campaign, turn: number): string {
  return formatGameDate(selectDateOfTurn(campaign, turn));
}

/** What a clock is materially about and what it is called, said once per reading. */
type SummonsSubject = {
  readonly subject: string;
  readonly title: string;
};

/**
 * A clock the engine keeps in turns.
 *
 * `dueDate` is the day that turn falls on, taken from the engine's own
 * turn-to-date selector rather than reconstructed here, so a folio and a
 * deadline can never disagree about what day week nine was.
 */
export function dueOnTurn(
  campaign: Campaign,
  dueTurn: number,
  urgency: SummonsUrgency,
  about: SummonsSubject,
): SummonsDue {
  return { dueTurn, dueDate: selectDateOfTurn(campaign, dueTurn), urgency, ...about };
}

/**
 * A clock the engine keeps in days — the war-powers window, an acting
 * appointment, a nomination stage.
 *
 * The day count is the record; the turn ordinal is derived from it and kept
 * only so that one ranking scale spans both kinds of clock. This is the single
 * place in the summons layer where a day count becomes a week, which is what
 * stops a report owed in two days and one owed in six from being the same
 * figure on four separate screens.
 */
export function dueInDays(
  campaign: Campaign,
  days: number,
  urgency: SummonsUrgency,
  about: SummonsSubject,
): SummonsDue {
  return {
    // The turn the deadline falls in, not the turn after which it has passed:
    // a Thursday six days out is still this week's business.
    dueTurn: campaign.turn + weeksFor(days, "floor"),
    dueDate: addDays(campaign.calendar, days),
    urgency,
    ...about,
  };
}

/** A clock the engine already keeps as a calendar date — a constitutional milestone. */
export function dueOnDate(
  campaign: Campaign,
  date: GameDate,
  daysAway: number,
  urgency: SummonsUrgency,
  about: SummonsSubject,
): SummonsDue {
  return {
    dueTurn: campaign.turn + weeksFor(daysAway, "floor"),
    dueDate: date,
    urgency,
    ...about,
  };
}
