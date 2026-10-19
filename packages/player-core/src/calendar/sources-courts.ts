import type { Campaign } from "@admin/engine";
import { courtDocket, type DocketCase } from "../judiciary/courts";
import type { CalendarEvent, EntityRef } from "./types";
import { beforeHorizon, dateOfTurn, inWindow, type CalendarWindow } from "./window";

/**
 * The federal courts' next steps, read off the docket the Courts screen draws.
 *
 * Reading the docket rather than the proceedings directly is what keeps a
 * challenged order and an autonomous suit on one footing, and keeps the date
 * here the date the docket prints.
 */

function refsOf(row: DocketCase): readonly EntityRef[] {
  return [{ kind: "case", id: row.id }, ...(row.order ? [{ kind: "order" as const, id: row.order }] : [])];
}

function nextStepEvent(campaign: Campaign, row: DocketCase): CalendarEvent {
  // A step whose turn has arrived is taken at the next week's turn, which is when the bench acts on it.
  const turn = campaign.turn + Math.max(1, row.weeksLeft);
  return {
    id: `court:${row.id}:next`,
    date: dateOfTurn(campaign, turn),
    kind: "court",
    title: `Next step in court: ${row.orderName}`,
    detail: row.question,
    urgency: "ambient",
    entityRefs: refsOf(row),
    href: row.href,
  };
}

/** The docket carries a challenged order's calendar; an autonomous suit's is on its proceeding. */
function supremeCalendarOf(campaign: Campaign, row: DocketCase): DocketCase["calendar"] {
  return row.calendar ?? campaign.judiciary.proceedings?.find((proceeding) => proceeding.id === row.id)?.calendar;
}

function supremeEvents(campaign: Campaign, row: DocketCase): readonly CalendarEvent[] {
  const calendar = supremeCalendarOf(campaign, row);
  if (!calendar || calendar.status !== "scheduled") return [];
  const base = { kind: "court" as const, urgency: "ambient" as const, entityRefs: refsOf(row), href: row.href };
  return [
    { ...base, id: `court:${row.id}:argument`, date: dateOfTurn(campaign, calendar.argumentTurn), title: `Supreme Court argument: ${row.orderName}` },
    {
      ...base,
      id: `court:${row.id}:opinion`,
      date: dateOfTurn(campaign, calendar.opinionTurn),
      title: `Supreme Court opinion expected: ${row.orderName}`,
      detail: "The Court usually tries to rule by the end of its term, but this isn't a legal deadline.",
    },
  ];
}

/** A case on the Supreme Court's calendar has its argument as its next step, so it is told once, as the argument. */
export function courtCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[] {
  return courtDocket(campaign).pending.flatMap((row) => {
    const supreme = supremeEvents(campaign, row);
    if (supreme.length > 0) return supreme.filter((event) => inWindow(window, event.date));
    const next = nextStepEvent(campaign, row);
    return beforeHorizon(window, next.date) ? [next] : [];
  });
}
