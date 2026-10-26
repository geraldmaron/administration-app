import {
  BEAT_THRESHOLDS,
  DAYS_PER_TURN,
  DISAPPROVAL_WINDOW_TURNS,
  INSTITUTION_CATALOG,
  actOf,
  campaignDay,
  executiveOrder,
  institutionForRole,
  selectActiveNominations,
  selectDepartureTransitions,
  selectBills,
  selectNation,
  selectNextMilestones,
  selectObligations,
  selectPerson,
  selectRemoval,
  stageDuration,
  terminationClockRuns,
  terminationDaysRemaining,
  weeksFor,
  type Campaign,
  type ConstitutionalMilestone,
  type DepartureTransition,
  type ExecutiveOrderRecord,
  type InstitutionRuntime,
  type Nomination,
  type PendingRule,
  type ReportObligation,
} from "@admin/engine";
import { daysUntil, dueInDays, dueOnDate, dueOnTurn, urgencyForDays, urgencyForWeeks, weeksUntil } from "./clock-math";
import type { SummonsDue } from "./types";

/**
 * When the clocks the executive branch runs on its own account come due.
 *
 * The reading half of `clocks-executive.ts`. Several of these are measured in
 * ordinal days rather than turns, because the statute is: a war powers report is
 * owed inside forty-eight hours, and rounding that to a week would misstate the
 * obligation in the direction of comfort. `dueInDays` keeps the day count as the
 * record and derives the turn from it, rather than the other way round.
 */

/**
 * A day count turned into the turn it falls in, for a history line that reads
 * in weeks. Inauguration is day 0 and turn 1, and every day the engine writes
 * is a multiple of the turn length, which is exactly where rounding up would
 * have put a first-week introduction of force in "week 0".
 */
export function turnOfDay(day: number): number {
  return weeksFor(day, "floor") + 1;
}

const OFFICE_TITLES: ReadonlyMap<string, string> = new Map(
  INSTITUTION_CATALOG.flatMap((institution) =>
    institution.offices.map((office) => [String(office.id), office.title] as const),
  ),
);

export const INSTITUTION_NAMES: ReadonlyMap<string, string> = new Map(
  INSTITUTION_CATALOG.map((institution) => [String(institution.id), institution.name] as const),
);

export function unfiledObligation(campaign: Campaign): ReportObligation | undefined {
  return selectObligations(campaign).find((obligation) => obligation.filing === undefined);
}

export function targetName(campaign: Campaign, obligation: ReportObligation): string {
  return selectNation(campaign, obligation.target)?.base.identity.name ?? String(obligation.target);
}

export function reportTitle(campaign: Campaign, obligation: ReportObligation): string {
  return `Report to Congress on ${targetName(campaign, obligation)}`;
}

export function reportDue(campaign: Campaign): SummonsDue | undefined {
  const obligation = unfiledObligation(campaign);
  if (obligation === undefined) return undefined;
  const days = daysUntil(campaign, obligation.dueDay);
  return dueInDays(campaign, days, urgencyForDays(days, DAYS_PER_TURN), {
    subject: "war-powers-report",
    title: reportTitle(campaign, obligation),
  });
}

/**
 * The introduction closest to the point where the force must come home, among
 * those the statute actually counts down: a rung below hostilities, an
 * authorized introduction or a force already brought out runs no clock, and a
 * summons over one would tell the President a deadline that does not exist.
 */
export function nearestTermination(campaign: Campaign): ReportObligation | undefined {
  return selectObligations(campaign)
    .filter((obligation) => terminationClockRuns(campaign, obligation))
    .sort((a, b) => terminationDaysRemaining(campaign, a) - terminationDaysRemaining(campaign, b))[0];
}

export function terminationTitle(campaign: Campaign, obligation: ReportObligation): string {
  return `Time limit on forces in ${targetName(campaign, obligation)}`;
}

export function terminationDue(campaign: Campaign): SummonsDue | undefined {
  const obligation = nearestTermination(campaign);
  if (obligation === undefined) return undefined;
  const days = terminationDaysRemaining(campaign, obligation);
  return dueInDays(campaign, days, urgencyForDays(days, 2 * DAYS_PER_TURN), {
    // The Desk's own unauthorized-force row carries this subject. One use of
    // force without a vote is one problem, whichever surface raises it.
    subject: "war-powers",
    title: terminationTitle(campaign, obligation),
  });
}

/** Days until a nomination's current stage is up, which is when the next thing has to happen. */
export function stageDaysLeft(campaign: Campaign, nomination: Nomination): number {
  return nomination.stageEnteredDay + stageDuration(campaign, nomination) - campaignDay(campaign);
}

export function nearestNomination(campaign: Campaign): Nomination | undefined {
  return [...selectActiveNominations(campaign)].sort(
    (a, b) => stageDaysLeft(campaign, a) - stageDaysLeft(campaign, b),
  )[0];
}

export function nominationTitle(campaign: Campaign, nomination: Nomination): string {
  const nominee = selectPerson(campaign, nomination.nominee)?.base.name ?? String(nomination.nominee);
  const office = OFFICE_TITLES.get(String(nomination.office)) ?? String(nomination.office);
  return `${nominee} for ${office}`;
}

export function nominationDue(campaign: Campaign): SummonsDue | undefined {
  const nomination = nearestNomination(campaign);
  if (nomination === undefined) return undefined;
  const days = stageDaysLeft(campaign, nomination);
  return dueInDays(campaign, days, urgencyForDays(days), {
    subject: `nomination:${nomination.id}`,
    title: nominationTitle(campaign, nomination),
  });
}

export function nearestRuling(campaign: Campaign): ExecutiveOrderRecord | undefined {
  return campaign.orders
    .filter((order) => order.review?.status === "pending")
    .sort((a, b) => (a.review?.dueTurn ?? 0) - (b.review?.dueTurn ?? 0))[0];
}

export function rulingTitle(order: ExecutiveOrderRecord): string {
  return `A court rules on ${order.order}`;
}

export function rulingDue(campaign: Campaign): SummonsDue | undefined {
  const order = nearestRuling(campaign);
  const dueTurn = order?.review?.dueTurn;
  if (order === undefined || dueTurn === undefined) return undefined;
  return dueOnTurn(campaign, dueTurn, urgencyForWeeks(weeksUntil(campaign, dueTurn), 1), {
    // The Desk's own order-review row carries this subject.
    subject: "order-review",
    title: rulingTitle(order),
  });
}

/** The proceeding closest to binding the country, which is the one the week is about. */
export function nearestRule(campaign: Campaign): PendingRule | undefined {
  return [...campaign.pendingRules]
    .filter((rule) => rule.status === "pending")
    .sort((a, b) => a.effectiveTurn - b.effectiveTurn)[0];
}

function ruleName(rule: PendingRule): string {
  return executiveOrder(rule.order)?.name ?? rule.order;
}

export function ruleEffectiveTitle(rule: PendingRule): string {
  return `The rule behind ${ruleName(rule).toLowerCase()}`;
}

export function ruleEffectiveDue(campaign: Campaign): SummonsDue | undefined {
  const rule = nearestRule(campaign);
  if (rule === undefined) return undefined;
  return dueOnTurn(campaign, rule.effectiveTurn, urgencyForWeeks(weeksUntil(campaign, rule.effectiveTurn)), {
    subject: `rule:${rule.id}`,
    title: ruleEffectiveTitle(rule),
  });
}

/** Weeks Congress still has to write a resolution of disapproval against a landed rule. */
export function disapprovalWeeksLeft(campaign: Campaign, rule: PendingRule): number {
  return DISAPPROVAL_WINDOW_TURNS - (campaign.turn - (rule.resolvedTurn ?? rule.effectiveTurn));
}

/**
 * The landed rule Congress could still take back, and against which it has not
 * yet moved.
 *
 * Once a resolution of disapproval is actually introduced it is a bill on the
 * desk, and the desk clock owns that fact. This clock is the window before
 * that: a rule of the President's that binds today and might not next month.
 */
export function exposedRule(campaign: Campaign): PendingRule | undefined {
  const contested = new Set(
    selectBills(campaign).flatMap((bill) =>
      bill.status !== "dead" && actOf(bill)?.disapproves === true && bill.target !== undefined
        ? [bill.target]
        : [],
    ),
  );
  return [...campaign.pendingRules]
    .filter(
      (rule) =>
        rule.status === "in-effect" &&
        !contested.has(rule.order) &&
        disapprovalWeeksLeft(campaign, rule) > 0,
    )
    .sort((a, b) => b.effectiveTurn - a.effectiveTurn)[0];
}

/**
 * How long a landed rule is worth a badge.
 *
 * The window runs nine weeks, but Congress moves on the rule that has just
 * landed — the engine picks the newest one — so the exposure is real in the
 * first fortnight and theoretical after it. A badge lit for nine straight
 * weeks is a badge nobody reads.
 */
export const DISAPPROVAL_LIVE_TURNS = 2;

export function ruleDisapprovalTitle(rule: PendingRule): string {
  return `Congress can still take back ${ruleName(rule).toLowerCase()}`;
}

export function ruleDisapprovalDue(campaign: Campaign): SummonsDue | undefined {
  const rule = exposedRule(campaign);
  if (rule === undefined) return undefined;
  const since = campaign.turn - (rule.resolvedTurn ?? rule.effectiveTurn);
  // Never `due`: this window closing is the President's own good news, and a
  // clock that painted it adverse would rank relief above a lapsed
  // appropriation on the same screen.
  return dueOnTurn(
    campaign,
    (rule.resolvedTurn ?? rule.effectiveTurn) + DISAPPROVAL_WINDOW_TURNS,
    since <= DISAPPROVAL_LIVE_TURNS ? "closing" : "standing",
    { subject: `rule-disapproval:${rule.id}`, title: ruleDisapprovalTitle(rule) },
  );
}

/**
 * The announced departure that goes first with nobody sent up to succeed it: a
 * Secretary serving out a transition leaves on this turn and the deputy acts,
 * unless a successor is before the Senate by then. One with a successor
 * pending is the nomination's clock, not this one.
 */
export function nearestDeparture(campaign: Campaign): DepartureTransition | undefined {
  return selectDepartureTransitions(campaign)
    .filter((transition) => !transition.successorPending)
    .sort((a, b) => a.leavesTurn - b.leavesTurn)[0];
}

export function departureTitle(campaign: Campaign, transition: DepartureTransition): string {
  const name = selectPerson(campaign, transition.person)?.base.name ?? String(transition.person);
  const department = institutionForRole(transition.role);
  return `${name} is leaving ${department ? (INSTITUTION_NAMES.get(String(department.id)) ?? department.name) : "the cabinet"}`;
}

export function departureDue(campaign: Campaign): SummonsDue | undefined {
  const transition = nearestDeparture(campaign);
  if (transition === undefined) return undefined;
  const weeks = weeksUntil(campaign, transition.leavesTurn);
  return dueOnTurn(campaign, transition.leavesTurn, urgencyForWeeks(weeks), {
    subject: `departure:${String(transition.role)}`,
    title: departureTitle(campaign, transition),
  });
}

type ActingSeat = { readonly runtime: InstitutionRuntime; readonly expiresDay: number };

export function nearestActing(campaign: Campaign): ActingSeat | undefined {
  return Object.values(campaign.institutions)
    .flatMap((runtime) => {
      const expiresDay = runtime.actingExpiresDay;
      if (runtime.actingLeader === undefined || expiresDay === undefined) return [];
      return [{ runtime, expiresDay }];
    })
    .sort((a, b) => a.expiresDay - b.expiresDay)[0];
}

export function institutionName(seat: ActingSeat): string {
  return INSTITUTION_NAMES.get(String(seat.runtime.id)) ?? String(seat.runtime.id);
}

export function actingTitle(seat: ActingSeat): string {
  return `Temporary leader at ${institutionName(seat)}`;
}

export function actingDue(campaign: Campaign): SummonsDue | undefined {
  const seat = nearestActing(campaign);
  if (seat === undefined) return undefined;
  const days = daysUntil(campaign, seat.expiresDay);
  return dueInDays(campaign, days, urgencyForDays(days), {
    subject: `acting:${String(seat.runtime.id)}`,
    title: actingTitle(seat),
  });
}

/** The milestones that decide who holds the seat, as against the ones that merely date the year. */
const SEAT_MILESTONES: ReadonlySet<ConstitutionalMilestone["kind"]> = new Set([
  "midterm-election",
  "presidential-election",
]);

export function nextSeatMilestone(campaign: Campaign): ConstitutionalMilestone | undefined {
  return selectNextMilestones(campaign, 8).find((milestone) => SEAT_MILESTONES.has(milestone.kind));
}

export function milestoneDue(campaign: Campaign): SummonsDue | undefined {
  const milestone = nextSeatMilestone(campaign);
  if (milestone === undefined) return undefined;
  return dueOnDate(
    campaign,
    milestone.date,
    milestone.daysAway,
    urgencyForDays(milestone.daysAway, 2 * DAYS_PER_TURN),
    // The same subject the constitutional calendar raises the date under, so
    // the election is one entry on the desk rather than two.
    { subject: `milestone:${milestone.kind}`, title: milestone.label },
  );
}

/**
 * Where the removal arc stops being a number and becomes a step on a ladder.
 *
 * The engine's own beat ladder, imported rather than copied: a summons that
 * warned of invented quarter marks while the real beats opened elsewhere would
 * be a false alarm on the one clock that ends presidencies, and a transcribed
 * copy of the ladder becomes exactly that the first time the ladder is tuned.
 */
const REMOVAL_RUNGS: readonly number[] = BEAT_THRESHOLDS;

export function nextRung(pressure: number): number | undefined {
  return REMOVAL_RUNGS.find((rung) => pressure < rung);
}

/** Within this much of the next rung, the ladder is close enough to interrupt the week. */
const RUNG_REACH = 0.08;

/**
 * Which approach the removal summons belongs to: the rung it is nearing, or
 * nothing while pressure is out of reach. The summons is a level on the Desk;
 * the world stops for it once per value of this, and again only after pressure
 * has left reach and come back.
 */
export function removalEpisode(campaign: Campaign): string | undefined {
  if (removalDue(campaign) === undefined) return undefined;
  const rung = nextRung(selectRemoval(campaign).pressure);
  return rung === undefined ? undefined : `rung:${rung}`;
}

export const REMOVAL_TITLE = "Pressure to remove you is nearing the next step";

export function removalDue(campaign: Campaign): SummonsDue | undefined {
  const removal = selectRemoval(campaign);
  if (removal.resolved) return undefined;
  const rung = nextRung(removal.pressure);
  if (rung === undefined || rung - removal.pressure > RUNG_REACH) return undefined;
  return dueOnTurn(campaign, campaign.turn, "due", {
    // The Desk's own removal row carries this subject.
    subject: "removal",
    title: REMOVAL_TITLE,
  });
}
