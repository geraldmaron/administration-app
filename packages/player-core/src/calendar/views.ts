import {
  addDays,
  compareDates,
  daysBetween,
  milestonesBetween,
  selectCampaignClock,
  weekdayOf,
  type Campaign,
  type GameDate,
  type Weekday,
} from "@admin/engine";
import { compareEvents } from "./build";
import { HUNDRED_DAYS } from "./sources-term";
import type { CalendarEvent } from "./types";
import { dateKey, daysInMonth } from "./window";

/** Signed days from the campaign's date: negative once the date has passed. */
export function daysUntil(campaign: Campaign, date: GameDate): number {
  return daysBetween(campaign.calendar, date);
}

function eventsByDay(events: readonly CalendarEvent[]): ReadonlyMap<string, readonly CalendarEvent[]> {
  const grouped = new Map<string, readonly CalendarEvent[]>();
  for (const event of [...events].sort(compareEvents)) {
    const key = dateKey(event.date);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  return grouped;
}

export type CalendarDay = {
  readonly date: GameDate;
  /** False for the leading and trailing days that complete the first and last weeks. */
  readonly inMonth: boolean;
  readonly events: readonly CalendarEvent[];
};

export type CalendarMonth = {
  readonly year: number;
  readonly month: number;
  /** Whole weeks, seven days each, starting on `weekStartsOn`. */
  readonly weeks: readonly (readonly CalendarDay[])[];
};

/**
 * One month as a grid of whole weeks.
 *
 * The days outside the month that complete its first and last weeks carry
 * their events too, so a deadline on the first of next month is not hidden on
 * the last row of this one.
 */
export function calendarMonth(events: readonly CalendarEvent[], year: number, month: number, weekStartsOn: Weekday = 0): CalendarMonth {
  const first: GameDate = { year, month, day: 1 };
  const last: GameDate = { year, month, day: daysInMonth(year, month) };
  const lead = (weekdayOf(first) - weekStartsOn + 7) % 7;
  const trail = (weekStartsOn + 6 - weekdayOf(last) + 7) % 7;
  const start = addDays(first, -lead);
  const total = lead + last.day + trail;
  const byDay = eventsByDay(events);
  const days: readonly CalendarDay[] = Array.from({ length: total }, (_, index) => {
    const date = addDays(start, index);
    return { date, inMonth: date.month === month && date.year === year, events: byDay.get(dateKey(date)) ?? [] };
  });
  const weeks = Array.from({ length: total / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7));
  return { year, month, weeks };
}

export type AgendaDay = {
  readonly date: GameDate;
  readonly events: readonly CalendarEvent[];
};

/** The days from `from` that hold something, in order, across `days` days counting `from` itself. */
export function agenda(events: readonly CalendarEvent[], from: GameDate, days: number): readonly AgendaDay[] {
  const to = addDays(from, Math.max(0, days - 1));
  const inRange = events.filter((event) => compareDates(event.date, from) >= 0 && compareDates(event.date, to) <= 0);
  return [...eventsByDay(inRange).values()].map((dayEvents) => ({ date: dayEvents[0]!.date, events: dayEvents }));
}

export type TermMarkKind = "term-start" | "hundred-days" | "midterm-election" | "presidential-election" | "term-end";

export type TermMark = {
  readonly kind: TermMarkKind;
  readonly label: string;
  readonly date: GameDate;
  /** Where on the term the mark falls, 0 at the oath and 1 at the term's end. */
  readonly position: number;
  readonly past: boolean;
};

export type TermTimeline = {
  readonly termNumber: number;
  readonly start: GameDate;
  readonly now: GameDate;
  readonly end: GameDate;
  readonly dayOfTerm: number;
  readonly daysLeft: number;
  /** How much of the term has run, 0 to 1. */
  readonly progress: number;
  readonly marks: readonly TermMark[];
};

const ELECTION_MARK: Readonly<Record<string, TermMarkKind>> = {
  "midterm-election": "midterm-election",
  "presidential-election": "presidential-election",
};

/** The term from oath to its last noon, with the dates it is measured by and where today stands on it. */
export function termTimeline(campaign: Campaign): TermTimeline {
  const clock = selectCampaignClock(campaign);
  const length = Math.max(1, daysBetween(clock.termStartDate, clock.termEndDate));
  const mark = (kind: TermMarkKind, label: string, date: GameDate): TermMark => ({
    kind,
    label,
    date,
    position: Math.min(1, Math.max(0, daysBetween(clock.termStartDate, date) / length)),
    past: compareDates(date, campaign.calendar) < 0,
  });
  const elections = milestonesBetween(clock.termStartDate, clock.termEndDate).flatMap((milestone) => {
    const kind = ELECTION_MARK[milestone.kind];
    return kind ? [mark(kind, milestone.label, milestone.date)] : [];
  });
  const marks = [
    mark("term-start", clock.termNumber <= 1 ? "Inauguration" : "Second inauguration", clock.termStartDate),
    mark("hundred-days", "The first hundred days", addDays(clock.termStartDate, HUNDRED_DAYS)),
    ...elections,
    mark("term-end", "The term ends", clock.termEndDate),
  ].sort((a, b) => compareDates(a.date, b.date));
  return {
    termNumber: clock.termNumber,
    start: clock.termStartDate,
    now: campaign.calendar,
    end: clock.termEndDate,
    dayOfTerm: clock.dayOfTerm,
    daysLeft: clock.daysLeftInTerm,
    progress: Math.min(1, Math.max(0, clock.dayOfTerm / length)),
    marks,
  };
}
