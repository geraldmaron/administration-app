import type { Campaign } from "@admin/engine";
import { place } from "../navigation/places";
import { SUMMONS_DUE } from "../summons/due";
import type { SummonsDueSpec, SummonsKind } from "../summons/types";
import type { CalendarEvent, CalendarUrgency } from "./types";
import { beforeHorizon, type CalendarWindow } from "./window";

/**
 * The institutional clocks the summons layer keeps, read off their due half.
 *
 * Only the due half: the attention loop reads the same specs every tick, and
 * the calendar must not compose a word of a brief to place a date.
 *
 * Several kinds are left out because another calendar source lists every
 * instance where the summons names only the nearest: the bills on the desk,
 * the War Powers windows, the court docket and the constitutional calendar.
 * The removal ladder is left out because it is a standing pressure dated
 * "now", not a date.
 */
const LISTED_ELSEWHERE: ReadonlySet<SummonsKind> = new Set([
  "bill-desk",
  "war-powers-report",
  "war-powers-termination",
  "ruling-due",
  "election-milestone",
  "removal-beat",
]);

type ClockLaw = { readonly lapse?: string; readonly cite?: string };

const CLOCK_LAW: Readonly<Partial<Record<SummonsKind, ClockLaw>>> = {
  appropriation: { lapse: "If Congress hasn't approved the money, funding stops and agencies without it shut down.", cite: "31 U.S.C. §1341" },
  shutdown: { cite: "31 U.S.C. §1341" },
  "aumf-expiry": { lapse: "The permission to use force runs out, and any force used under it no longer has a basis in law." },
  "treaty-ratification": { cite: "U.S. Const. art. II, §2, cl. 2" },
  "nomination-stage": { cite: "U.S. Const. art. II, §2, cl. 2" },
  "rule-effective": { lapse: "The rule goes into effect as written." },
  "rule-disapproval": { lapse: "The rule stays in place.", cite: "5 U.S.C. §802" },
  "acting-authority": { lapse: "The temporary leader's time runs out, and the job sits empty.", cite: "5 U.S.C. §3346" },
  "departure-transition": { lapse: "The Secretary leaves, and their deputy fills in." },
};

function urgencyOf(spec: SummonsDueSpec): CalendarUrgency {
  if (!spec.answerable) return "ambient";
  return spec.class === "interruption" ? "hard" : "soft";
}

function clockEvent(campaign: Campaign, spec: SummonsDueSpec): CalendarEvent | undefined {
  const due = spec.due(campaign);
  if (due === undefined) return undefined;
  const law = CLOCK_LAW[spec.id] ?? {};
  return {
    id: `clock:${spec.id}:${due.subject}`,
    date: due.dueDate,
    kind: spec.source === "appropriations-deadline" || spec.source === "constitutional-deadline" ? "deadline" : "clock",
    title: due.title,
    urgency: urgencyOf(spec),
    entityRefs: [],
    href: place.clock(spec.id),
    summons: spec.id,
    ...(law.lapse ? { lapse: law.lapse } : {}),
    ...(law.cite ? { authorityCite: law.cite } : {}),
  };
}

export function clockCalendar(campaign: Campaign, window: CalendarWindow): readonly CalendarEvent[] {
  return SUMMONS_DUE.filter((spec) => !LISTED_ELSEWHERE.has(spec.id)).flatMap((spec) => {
    const event = clockEvent(campaign, spec);
    return event && beforeHorizon(window, event.date) ? [event] : [];
  });
}
