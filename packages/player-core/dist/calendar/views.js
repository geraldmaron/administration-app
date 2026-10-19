import { addDays, compareDates, daysBetween, milestonesBetween, selectCampaignClock, weekdayOf, } from "@admin/engine";
import { compareEvents } from "./build";
import { HUNDRED_DAYS } from "./sources-term";
import { dateKey, daysInMonth } from "./window";
/** Signed days from the campaign's date: negative once the date has passed. */
export function daysUntil(campaign, date) {
    return daysBetween(campaign.calendar, date);
}
function eventsByDay(events) {
    const grouped = new Map();
    for (const event of [...events].sort(compareEvents)) {
        const key = dateKey(event.date);
        grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    return grouped;
}
/**
 * One month as a grid of whole weeks.
 *
 * The days outside the month that complete its first and last weeks carry
 * their events too, so a deadline on the first of next month is not hidden on
 * the last row of this one.
 */
export function calendarMonth(events, year, month, weekStartsOn = 0) {
    const first = { year, month, day: 1 };
    const last = { year, month, day: daysInMonth(year, month) };
    const lead = (weekdayOf(first) - weekStartsOn + 7) % 7;
    const trail = (weekStartsOn + 6 - weekdayOf(last) + 7) % 7;
    const start = addDays(first, -lead);
    const total = lead + last.day + trail;
    const byDay = eventsByDay(events);
    const days = Array.from({ length: total }, (_, index) => {
        const date = addDays(start, index);
        return { date, inMonth: date.month === month && date.year === year, events: byDay.get(dateKey(date)) ?? [] };
    });
    const weeks = Array.from({ length: total / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7));
    return { year, month, weeks };
}
/** The days from `from` that hold something, in order, across `days` days counting `from` itself. */
export function agenda(events, from, days) {
    const to = addDays(from, Math.max(0, days - 1));
    const inRange = events.filter((event) => compareDates(event.date, from) >= 0 && compareDates(event.date, to) <= 0);
    return [...eventsByDay(inRange).values()].map((dayEvents) => ({ date: dayEvents[0].date, events: dayEvents }));
}
const ELECTION_MARK = {
    "midterm-election": "midterm-election",
    "presidential-election": "presidential-election",
};
/** The term from oath to its last noon, with the dates it is measured by and where today stands on it. */
export function termTimeline(campaign) {
    const clock = selectCampaignClock(campaign);
    const length = Math.max(1, daysBetween(clock.termStartDate, clock.termEndDate));
    const mark = (kind, label, date) => ({
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
