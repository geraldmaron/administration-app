import {
  CALL_GRACE_TURNS,
  daysBetween,
  selectBillsAwaitingSignature,
  selectCompactCalls,
  selectDateOfTurn,
  selectActiveNominations,
  selectNation,
  selectSigningWindow,
  executiveOrder,
  isOpenCase,
  type Campaign,
  type CompactCall,
} from "@admin/engine";
import { PLACES, anchored, place } from "../navigation/places";
import { subjectHref } from "../shell/subject";
import { stanceForUrgency } from "../summons/clock-math";
import { nominationTitle } from "../summons/due-executive";
import { appropriationDue, SHUTDOWN_TITLE, shutdownDue } from "../summons/due-legislative";
import { dueFigure, dueSentence } from "../summons/rows";
import { commoditySources } from "./family-commodity";
import { emergencySources } from "./family-emergency";
import { familyRaise, type FamilySource } from "./family-raise";

// The families a presidential case is raised for, read off the records that
// already hold them: a bill on the desk, a nominee with findings against them,
// the money running out, an emergency a state or a declaration is waiting on,
// and an allied government invoking a compact. Each source yields the case it
// raises and the Desk row that stops the world for it, under one id, so the
// matter is one thing whichever surface draws it.

// The case is due on the last of the ten days after presentment, the date the
// engine reads: the bill becomes law unsigned the morning after it.
function billSource(campaign: Campaign, bill: ReturnType<typeof selectBillsAwaitingSignature>[number]): FamilySource {
  const signing = selectSigningWindow(campaign, bill);
  const dueDate = signing.deadline;
  const window = signing.windowDays;
  const left = Math.max(0, daysBetween(campaign.calendar, dueDate));
  const id = `case:${bill.id}`;
  const href = anchored(subjectHref({ kind: "bill", id: bill.id }), "bill-desk");
  return {
    raise: familyRaise("bill", id, bill.title, { kind: "bill", id: bill.id }, dueDate),
    row: {
      id,
      source: "bill-signature",
      urgency: "hard",
      subject: `bill:${bill.id}`,
      title: bill.title,
      reason: "Congress has passed it. If you sign it, it becomes law. If you veto it, it goes back to Congress with your reasons.",
      href,
      stance: "caution",
      icon: "law",
      dueDate,
      summons: "bill-desk",
      clock: { kind: "statutory", name: "Time to sign", window, consumed: Math.min(window, window - left), unit: "day", statute: "Article I, Section 7" },
    },
    door: { href, label: "Open the bill" },
  };
}

function billSources(campaign: Campaign): readonly FamilySource[] {
  return selectBillsAwaitingSignature(campaign).map((bill) => billSource(campaign, bill));
}

function nominationSources(campaign: Campaign): readonly FamilySource[] {
  return selectActiveNominations(campaign)
    .filter((nomination) => nomination.controversies.length > 0)
    .map((nomination) => {
      const id = `case:nomination:${nomination.id}`;
      const title = nominationTitle(campaign, nomination);
      // The withdraw act is on the nominee's own file; the office page does not draw a nomination.
      const href = anchored(subjectHref({ kind: "person", id: String(nomination.nominee) }), "person-acts");
      const findings = nomination.controversies.length;
      return {
        raise: familyRaise("nomination", id, title, { kind: "nomination", id: nomination.id }),
        row: {
          id,
          source: "nomination" as const,
          urgency: "soft" as const,
          subject: `nomination:${nomination.id}`,
          title,
          reason: `${findings === 1 ? "A problem has" : `${findings} problems have`} come up in the nominee's background. You can stand by them or withdraw the nomination.`,
          href,
          stance: "caution" as const,
          figure: String(findings),
          icon: "emptyCabinet",
        },
        door: { href, label: "Open the nominee" },
      };
    });
}

/** Court cases represented by an open authored answer remain live while their duplicate row is hidden. */
export function authoredCourtResponseIds(campaign: Campaign): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const item of Object.values(campaign.cases ?? {})) {
    if (item.kind !== "authored-scenario" || !isOpenCase(item.status) || !item.authoredSnapshot) continue;
    try {
      const snapshot: unknown = JSON.parse(item.authoredSnapshot);
      if (!snapshot || typeof snapshot !== "object" || !("orderCase" in snapshot)) continue;
      const orderCase = snapshot.orderCase;
      if (orderCase && typeof orderCase === "object" && "proceedingId" in orderCase &&
        typeof orderCase.proceedingId === "string" && "posture" in orderCase && orderCase.posture === "adverse-lower") {
        ids.add(`case:review:${orderCase.proceedingId}`);
      }
    } catch {
      continue;
    }
  }
  return ids;
}

function courtResponseSources(campaign: Campaign): readonly FamilySource[] {
  const authored = authoredCourtResponseIds(campaign);
  return (campaign.judiciary.proceedings ?? []).flatMap((proceeding) => {
    if (proceeding.subject.kind !== "executive-order" || proceeding.stage !== "appeal" ||
      proceeding.lower?.holding !== "struck-down" || proceeding.lower.enforcement !== "in-force" || proceeding.governmentReview) return [];
    const id = `case:review:${proceeding.id}`;
    const record = campaign.cases?.[id];
    if (!record || !isOpenCase(record.status) || record.clock.kind === "none") return [];
    if (authored.has(id)) return [];
    const order = executiveOrder(proceeding.subject.orderId);
    const name = order?.name ?? "the executive order";
    const href = anchored(place.case(proceeding.subject.recordId), "case-response");
    return [{ raise: record, row: { id, source: "court-ruling" as const, urgency: "hard" as const,
      subject: proceeding.id, title: `A lower court blocks ${name}`,
      reason: "You can accept the lower court's ruling, or ask the Solicitor General, the government's top lawyer in court, to appeal it. While the ruling stands, the order is on hold.",
      href, stance: "adverse" as const, icon: "law" as const, dueDate: record.clock.dueAt },
      door: { href, label: "Open the court case" } }];
  });
}

// The money running out is a case once it is this season's business, not a
// date eleven months out; before then the statutory clock stays on the calendar.
/** The budget's funding clock, which draws the lapse and the date the money runs out. */
export const BUDGET_FUNDING = anchored(place.budget(), "budget-status");

function appropriationSource(campaign: Campaign): FamilySource | undefined {
  const due = appropriationDue(campaign);
  if (due === undefined || due.urgency === "standing") return undefined;
  const through = campaign.congress.appropriation.throughTurn;
  const id = `case:budget:${through}`;
  return {
    raise: familyRaise("budget", id, due.title, { kind: "appropriation", id: String(through) }, due.dueDate),
    row: {
      id,
      source: "appropriations-deadline",
      urgency: due.urgency === "due" ? "hard" : "soft",
      subject: due.subject,
      title: due.title,
      reason: dueSentence(campaign.calendar, due),
      href: BUDGET_FUNDING,
      stance: stanceForUrgency(due.urgency),
      figure: dueFigure(campaign.calendar, due),
      icon: PLACES.budget.icon,
      dueDate: due.dueDate,
      summons: "appropriation",
    },
    door: { href: BUDGET_FUNDING, label: "Open the budget" },
  };
}

// A closed government has no date it reopens: Congress reopens it by passing
// something. The lapse is a case with no clock, which the budget family's
// contract allows because it can still end by an act or by the default.
function lapseSource(campaign: Campaign): FamilySource | undefined {
  const due = shutdownDue(campaign);
  if (due === undefined) return undefined;
  const id = `case:budget:lapse:${due.dueTurn}`;
  const raise = familyRaise("budget", id, SHUTDOWN_TITLE, { kind: "appropriation", id: `lapse:${due.dueTurn}` }, due.dueDate);
  return {
    raise: { ...raise, clock: { kind: "none" }, defaultOutcome: { kind: "none" } },
    row: {
      id,
      source: "appropriations-deadline",
      urgency: "hard",
      subject: due.subject,
      title: SHUTDOWN_TITLE,
      reason: dueSentence(campaign.calendar, due),
      href: BUDGET_FUNDING,
      stance: "adverse",
      figure: dueFigure(campaign.calendar, due),
      icon: PLACES.budget.icon,
      summons: "shutdown",
    },
    door: { href: BUDGET_FUNDING, label: "Open the budget" },
  };
}

function budgetSources(campaign: Campaign): readonly FamilySource[] {
  return [appropriationSource(campaign), lapseSource(campaign)].filter((source): source is FamilySource => source !== undefined);
}

function allyName(campaign: Campaign, call: CompactCall): string {
  return selectNation(campaign, call.ally)?.base.identity.name ?? String(call.ally);
}

// The grace is the window in which an answer is still an answer; past it the
// other members start counting the silence, which is the default this family
// names ("relationship inference"). The row carries no due date: a
// diplomatic request is a kind a player may log, and a logged row must never
// be one a deadline hangs on — the case's own clock holds it instead.
function foreignSource(campaign: Campaign, call: CompactCall): FamilySource {
  const id = `case:foreign-request:${call.org as string}:${call.conflict}`;
  const ally = allyName(campaign, call);
  const title = `${call.orgName} is waiting on you over ${ally}`;
  const waited = call.unansweredTurns;
  const changed = campaign.turn - call.openedTurn <= 1 || waited === 1;
  // The guarantee is honored or broken on the war the ally is fighting, where the acts that join it are.
  const href = anchored(subjectHref({ kind: "war", id: call.conflict }), "war-join");
  return {
    raise: familyRaise("foreign-request", id, title, { kind: "nation", id: String(call.ally) }, selectDateOfTurn(campaign, call.openedTurn + CALL_GRACE_TURNS + 1)),
    row: {
      id,
      source: "diplomatic-request",
      urgency: changed ? "soft" : "ambient",
      subject: `compact:${call.org as string}:${call.conflict}`,
      title,
      reason:
        waited > 0
          ? `${call.watching.length === 1 ? "One other member is" : `${call.watching.length} other members are`} watching to see if you keep your promise to defend.`
          : `${ally} has been attacked and is calling on you as its ally. You've promised to defend it.`,
      href,
      stance: waited > 0 ? "adverse" : "caution",
      figure: waited > 0 ? `${waited}w` : "new",
      icon: "world",
      clock: { kind: "elapsed", name: "Unanswered", elapsed: waited, unit: "week" },
    },
    door: { href, label: "Open the war" },
  };
}

function foreignSources(campaign: Campaign): readonly FamilySource[] {
  return selectCompactCalls(campaign)
    .filter((call) => !call.answered)
    .map((call) => foreignSource(campaign, call));
}

const SOURCES = new WeakMap<Campaign, readonly FamilySource[]>();

/**
 * Every live matter a family raises a case for, in family order.
 *
 * Computed once per campaign for the same reason the Desk's rows are: a
 * campaign is immutable, and six surfaces read this on one render.
 */
export function familySources(campaign: Campaign): readonly FamilySource[] {
  const held = SOURCES.get(campaign);
  if (held !== undefined) return held;
  const sources = [
    ...billSources(campaign),
    ...nominationSources(campaign),
    ...courtResponseSources(campaign),
    ...budgetSources(campaign),
    ...emergencySources(campaign),
    ...foreignSources(campaign),
    ...commoditySources(campaign),
  ];
  SOURCES.set(campaign, sources);
  return sources;
}
