import type { ReactNode } from "react";
import { daysBetween, type Campaign, type GameDate } from "@admin/engine";
import { formatDate, type CalendarEvent, type CalendarEventKind } from "@admin/player-core";
import type { DatedRow, IconName } from "@admin/ui";

const KIND: Readonly<Record<CalendarEventKind, { readonly label: string; readonly icon: IconName }>> = {
  deadline: { label: "Deadline", icon: "pending" },
  clock: { label: "Legal deadline", icon: "statusExpired" },
  election: { label: "Election", icon: "election" },
  "foreign-election": { label: "Election abroad", icon: "world" },
  court: { label: "Court", icon: "court" },
  legislative: { label: "Congress", icon: "subjectCapitol" },
  appointment: { label: "Appointment", icon: "appoint" },
  emergency: { label: "Emergency", icon: "eventEmergency" },
  "war-powers": { label: "War Powers", icon: "conflict" },
  milestone: { label: "Milestone", icon: "flag" },
  pending: { label: "Waiting on", icon: "pending" },
};

export const dateKey = (date: GameDate): string => `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** The day of the week for a calendar date (Sakamoto's method), so the agenda can name the day without a host clock. */
export function weekdayOf(date: GameDate): string {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const year = date.month < 3 ? date.year - 1 : date.year;
  const index = (year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) + t[date.month - 1]! + date.day) % 7;
  return WEEKDAY[index]!;
}

export function relativeDays(campaign: Campaign, date: GameDate): string {
  const days = daysBetween(campaign.calendar, date);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${-days} days ago`;
  return `In ${days} days`;
}

/** A dated row with the names it is about, drawn under its detail. */
export type EventRow = DatedRow & { readonly refs?: ReactNode };

export function eventRow(event: CalendarEvent, actions: { readonly go: (href: string) => void; readonly cite: (cite: string) => void; readonly refs: (event: CalendarEvent) => ReactNode }): EventRow {
  const kind = KIND[event.kind];
  const refs = actions.refs(event);
  return {
    id: event.id,
    title: event.title,
    kindLabel: kind.label,
    icon: kind.icon,
    urgency: event.urgency,
    ...(event.detail ? { detail: event.detail } : {}),
    ...(refs ? { refs } : {}),
    ...(event.lapse ? { lapse: event.lapse } : {}),
    ...(event.authorityCite ? { cite: event.authorityCite, onCite: () => actions.cite(event.authorityCite!) } : {}),
    ...(event.href ? { onPress: () => actions.go(event.href!) } : {}),
  };
}

export function dayLabel(date: GameDate): string {
  return `${weekdayOf(date)}, ${formatDate(date)}`;
}
