import { addDays, compareDates, selectCampaignClock, type Campaign } from "@admin/engine";
import { clockCalendar } from "./sources-clocks";
import { courtCalendar } from "./sources-courts";
import { emergencyCalendar, warPowersCalendar } from "./sources-security";
import { termCalendar } from "./sources-term";
import { legislativeCalendar, seatCalendar } from "./sources-washington";
import { foreignElectionCalendar } from "./sources-world";
import { pendingCalendar } from "./sources-pending";
import type { CalendarEvent, CalendarOptions, CalendarUrgency } from "./types";
import { dateKey, type CalendarWindow } from "./window";

const URGENCY_RANK: Readonly<Record<CalendarUrgency, number>> = { hard: 0, soft: 1, ambient: 2 };

/** By date; on one day the harder obligation first, then a stable order by id. */
export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  return compareDates(a.date, b.date) || URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.id.localeCompare(b.id);
}

/**
 * The fiscal year's statutory end and the day this government's money actually
 * runs out are often the same day. When they are, the clock reading the real
 * appropriation is the one that says what happens, so the generic date yields.
 */
function withoutShadowedDeadlines(events: readonly CalendarEvent[]): readonly CalendarEvent[] {
  const funded = new Set(events.filter((event) => event.id.startsWith("clock:appropriation:")).map((event) => dateKey(event.date)));
  return events.filter((event) => !(event.id.startsWith("milestone:appropriations-deadline:") && funded.has(dateKey(event.date))));
}

/** Days to the end of the term, at least a day, so a calendar always reaches tomorrow. */
function defaultHorizon(campaign: Campaign): number {
  return Math.max(1, selectCampaignClock(campaign).daysLeftInTerm);
}

/**
 * Every dated thing on the President's calendar, soonest first.
 *
 * Derived on read from the clocks the engine and the summons layer already
 * keep. Nothing is stored and nothing is written: reading the calendar cannot
 * move the world.
 */
export function buildCalendar(campaign: Campaign, options: CalendarOptions = {}): readonly CalendarEvent[] {
  const horizonDays = options.horizonDays ?? defaultHorizon(campaign);
  const window: CalendarWindow = { from: campaign.calendar, to: addDays(campaign.calendar, horizonDays) };
  const excluded = new Set(options.exclude ?? []);
  const events = [
    ...termCalendar(campaign, window),
    ...clockCalendar(campaign, window),
    ...legislativeCalendar(campaign, window),
    ...seatCalendar(campaign, window, horizonDays),
    ...courtCalendar(campaign, window),
    ...warPowersCalendar(campaign, window),
    ...emergencyCalendar(campaign, window),
    ...foreignElectionCalendar(campaign, window),
    ...pendingCalendar(campaign, window),
  ];
  return withoutShadowedDeadlines(events)
    .filter((event) => !excluded.has(event.kind))
    .sort(compareEvents);
}
