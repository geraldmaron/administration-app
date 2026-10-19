import type { Campaign } from "@admin/engine";
import { selectPending } from "../desk/pending";
import type { CalendarEvent, EntityRef, EntityRefKind } from "./types";
import { beforeHorizon, type CalendarWindow } from "./window";

// The answers the President is waiting on, on the day each is due. A
// statutory clock's due date is already on the calendar as that clock, so the
// pending reading's copy of it stays off; what is left is the waits only the
// pending reading knows: investigations, votes, reports, a partner's answer.

const REF_KINDS: ReadonlySet<string> = new Set<EntityRefKind>(["person", "nation", "state", "bill", "case", "institution", "war", "order"]);

function refsOf(about: readonly string[]): readonly EntityRef[] {
  return about.flatMap((key) => {
    const [kind, ...rest] = key.split(":");
    return kind && REF_KINDS.has(kind) && rest.length ? [{ kind: kind as EntityRefKind, id: rest.join(":") }] : [];
  });
}

export function pendingCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[] {
  return selectPending(campaign)
    .filter((item) => !item.id.startsWith("summons:") && beforeHorizon(window, item.dueDate))
    .map((item): CalendarEvent => ({
      id: `pending:${item.id}`,
      date: item.dueDate,
      kind: "pending",
      title: item.title,
      detail: item.waitingOn ? `Waiting on ${item.waitingOn}. ${item.line}` : item.line,
      urgency: item.urgency,
      entityRefs: refsOf(item.about),
      href: item.href,
    }));
}
