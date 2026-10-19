import {
  addDays,
  compareDates,
  milestonesBetween,
  selectCampaignClock,
  type Campaign,
  type ConstitutionalMilestone,
  type ConstitutionalMilestoneKind,
} from "@admin/engine";
import { place } from "../navigation/places";
import type { SummonsKind } from "../summons/types";
import type { CalendarEvent, CalendarEventKind, CalendarUrgency } from "./types";
import { dateKey, inWindow, type CalendarWindow } from "./window";

/**
 * The dates the Constitution and the statute book put on every presidency,
 * and the ones the term itself is measured by.
 *
 * Read off the engine's `milestonesBetween`, the same calendar the engine holds
 * its elections on, so a date here and the day the vote is actually held are
 * one fact.
 */

type MilestoneShape = {
  readonly kind: CalendarEventKind;
  readonly urgency: CalendarUrgency;
  readonly cite?: string;
  readonly href?: string;
  readonly lapse?: string;
  readonly summons?: SummonsKind;
};

const MILESTONE_SHAPE: Readonly<Record<ConstitutionalMilestoneKind, MilestoneShape>> = {
  inauguration: { kind: "milestone", urgency: "ambient", cite: "U.S. Const. amend. XX, §1" },
  "midterm-election": { kind: "election", urgency: "ambient", cite: "2 U.S.C. §7", href: place.approval(), summons: "election-milestone" },
  "presidential-election": { kind: "election", urgency: "ambient", cite: "3 U.S.C. §1", href: place.approval(), summons: "election-milestone" },
  // Off-year governors' races are set by state law, so no federal citation is given.
  "gubernatorial-election": { kind: "election", urgency: "ambient" },
  "congress-convenes": { kind: "legislative", urgency: "ambient", cite: "U.S. Const. amend. XX, §2", href: place.congress() },
  "fiscal-year-start": { kind: "milestone", urgency: "ambient", cite: "31 U.S.C. §1102", href: place.budget() },
  "appropriations-deadline": {
    kind: "deadline",
    urgency: "soft",
    cite: "31 U.S.C. §1341",
    href: place.budget(),
    lapse: "If Congress doesn't pass a budget or a short-term funding bill, the money stops and agencies shut down.",
  },
};

function milestoneEvent(milestone: ConstitutionalMilestone): CalendarEvent {
  const shape = MILESTONE_SHAPE[milestone.kind];
  return {
    id: `milestone:${milestone.kind}:${dateKey(milestone.date)}`,
    date: milestone.date,
    kind: shape.kind,
    title: milestone.label,
    urgency: shape.urgency,
    entityRefs: [],
    ...(shape.href ? { href: shape.href } : {}),
    ...(shape.lapse ? { lapse: shape.lapse } : {}),
    ...(shape.cite ? { authorityCite: shape.cite } : {}),
    ...(shape.summons ? { summons: shape.summons } : {}),
  };
}

/** The customary measure of a new administration, counted from the day this term began. */
export const HUNDRED_DAYS = 100;

function termEvents(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[] {
  const clock = selectCampaignClock(campaign);
  const hundred = addDays(clock.termStartDate, HUNDRED_DAYS);
  const events: readonly CalendarEvent[] = [
    {
      id: `term:${clock.termNumber}:hundred-days`,
      date: hundred,
      kind: "milestone",
      title: "The first hundred days",
      detail: "This is a tradition, not a rule. Reporters and Congress use this date to judge how a new president's start went.",
      urgency: "ambient",
      entityRefs: [],
      href: place.record(),
    },
    {
      id: `term:${clock.termNumber}:end`,
      date: clock.termEndDate,
      kind: "milestone",
      title: "The term ends at noon",
      urgency: "ambient",
      entityRefs: [],
      href: place.record(),
      authorityCite: "U.S. Const. amend. XX, §1",
    },
  ];
  return events.filter((event) => inWindow(window, event.date));
}

/**
 * Every constitutional and term date inside the window.
 *
 * The inauguration that ends this term is the same noon as the term's end, so
 * it is told once, as the end.
 */
export function termCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[] {
  const termEnd = selectCampaignClock(campaign).termEndDate;
  // `milestonesBetween` excludes its own start date, so the window opens a day early to keep today.
  const milestones = milestonesBetween(addDays(window.from, -1), window.to)
    .filter((milestone) => !(milestone.kind === "inauguration" && compareDates(milestone.date, termEnd) === 0))
    .map(milestoneEvent);
  return [...milestones, ...termEvents(campaign, window)];
}
