import { selectForeignSeat, type Campaign } from "@admin/engine";
import { calendarRow, type NationId } from "@admin/world";
import { place } from "../navigation/places";
import type { CalendarEvent } from "./types";
import { dateKey, inWindow, type CalendarWindow } from "./window";

/**
 * The selections abroad the simulation will actually hold.
 *
 * Read off the engine's seat record rather than the dataset table, so the date
 * shown is the date the engine rolls the selection on: a table date already
 * passed is carried forward a term the way the engine carries it, and a seat
 * the campaign has since played keeps its own next date.
 */

function selectionWords(electionType: string | undefined): string {
  if (!electionType) return "Selection";
  if (electionType.startsWith("presidential")) return "Presidential election";
  if (electionType.startsWith("parliamentary")) return "Parliamentary election";
  if (electionType.startsWith("no_mechanism")) return "Leadership selection";
  return "Selection";
}

/** The table gives most dates to the month; the engine holds them on a planning day it says so about. */
function precisionNote(nation: NationId): string | undefined {
  const precision = calendarRow(nation)?.precision;
  if (precision === "month") return "Only the month is known, so the day shown is an estimate.";
  if (precision === "year") return "Only the year is known, so the month and day shown are estimates.";
  return undefined;
}

function selectionEvent(campaign: Campaign, nation: NationId): CalendarEvent | undefined {
  const next = selectForeignSeat(campaign, nation)?.next;
  if (!next) return undefined;
  const name = campaign.nations[nation]?.base.identity.name ?? nation;
  const note = precisionNote(nation);
  return {
    id: `foreign-election:${nation}:${dateKey(next)}`,
    date: next,
    kind: "foreign-election",
    title: `${name}: ${selectionWords(calendarRow(nation)?.electionType).toLowerCase()}`,
    ...(note ? { detail: note } : {}),
    urgency: "ambient",
    entityRefs: [{ kind: "nation", id: nation }],
    href: place.country(nation),
  };
}

export function foreignElectionCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[] {
  return (Object.keys(campaign.nations) as NationId[])
    .filter((nation) => nation !== campaign.founding.nation)
    .sort()
    .flatMap((nation) => {
      const event = selectionEvent(campaign, nation);
      return event && inWindow(window, event.date) ? [event] : [];
    });
}
