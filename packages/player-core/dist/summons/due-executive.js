import { BEAT_THRESHOLDS, DAYS_PER_TURN, DISAPPROVAL_WINDOW_TURNS, INSTITUTION_CATALOG, actOf, campaignDay, executiveOrder, institutionForRole, selectActiveNominations, selectDepartureTransitions, selectBills, selectNation, selectNextMilestones, selectObligations, selectPerson, selectRemoval, stageDuration, terminationClockRuns, terminationDaysRemaining, weeksFor, } from "@admin/engine";
import { daysUntil, dueInDays, dueOnDate, dueOnTurn, urgencyForDays, urgencyForWeeks, weeksUntil } from "./clock-math";
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
export function turnOfDay(day) {
    return weeksFor(day, "floor") + 1;
}
const OFFICE_TITLES = new Map(INSTITUTION_CATALOG.flatMap((institution) => institution.offices.map((office) => [String(office.id), office.title])));
export const INSTITUTION_NAMES = new Map(INSTITUTION_CATALOG.map((institution) => [String(institution.id), institution.name]));
export function unfiledObligation(campaign) {
    return selectObligations(campaign).find((obligation) => obligation.filing === undefined);
}
export function targetName(campaign, obligation) {
    return selectNation(campaign, obligation.target)?.base.identity.name ?? String(obligation.target);
}
export function reportTitle(campaign, obligation) {
    return `Report to Congress on ${targetName(campaign, obligation)}`;
}
export function reportDue(campaign) {
    const obligation = unfiledObligation(campaign);
    if (obligation === undefined)
        return undefined;
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
export function nearestTermination(campaign) {
    return selectObligations(campaign)
        .filter((obligation) => terminationClockRuns(campaign, obligation))
        .sort((a, b) => terminationDaysRemaining(campaign, a) - terminationDaysRemaining(campaign, b))[0];
}
export function terminationTitle(campaign, obligation) {
    return `Time limit on forces in ${targetName(campaign, obligation)}`;
}
export function terminationDue(campaign) {
    const obligation = nearestTermination(campaign);
    if (obligation === undefined)
        return undefined;
    const days = terminationDaysRemaining(campaign, obligation);
    return dueInDays(campaign, days, urgencyForDays(days, 2 * DAYS_PER_TURN), {
        // The Desk's own unauthorized-force row carries this subject. One use of
        // force without a vote is one problem, whichever surface raises it.
        subject: "war-powers",
        title: terminationTitle(campaign, obligation),
    });
}
/** Days until a nomination's current stage is up, which is when the next thing has to happen. */
export function stageDaysLeft(campaign, nomination) {
    return nomination.stageEnteredDay + stageDuration(campaign, nomination) - campaignDay(campaign);
}
export function nearestNomination(campaign) {
    return [...selectActiveNominations(campaign)].sort((a, b) => stageDaysLeft(campaign, a) - stageDaysLeft(campaign, b))[0];
}
export function nominationTitle(campaign, nomination) {
    const nominee = selectPerson(campaign, nomination.nominee)?.base.name ?? String(nomination.nominee);
    const office = OFFICE_TITLES.get(String(nomination.office)) ?? String(nomination.office);
    return `${nominee} for ${office}`;
}
export function nominationDue(campaign) {
    const nomination = nearestNomination(campaign);
    if (nomination === undefined)
        return undefined;
    const days = stageDaysLeft(campaign, nomination);
    return dueInDays(campaign, days, urgencyForDays(days), {
        subject: `nomination:${nomination.id}`,
        title: nominationTitle(campaign, nomination),
    });
}
export function nearestRuling(campaign) {
    return campaign.orders
        .filter((order) => order.review?.status === "pending")
        .sort((a, b) => (a.review?.dueTurn ?? 0) - (b.review?.dueTurn ?? 0))[0];
}
export function rulingTitle(order) {
    return `A court rules on ${order.order}`;
}
export function rulingDue(campaign) {
    const order = nearestRuling(campaign);
    const dueTurn = order?.review?.dueTurn;
    if (order === undefined || dueTurn === undefined)
        return undefined;
    return dueOnTurn(campaign, dueTurn, urgencyForWeeks(weeksUntil(campaign, dueTurn), 1), {
        // The Desk's own order-review row carries this subject.
        subject: "order-review",
        title: rulingTitle(order),
    });
}
/** The proceeding closest to binding the country, which is the one the week is about. */
export function nearestRule(campaign) {
    return [...campaign.pendingRules]
        .filter((rule) => rule.status === "pending")
        .sort((a, b) => a.effectiveTurn - b.effectiveTurn)[0];
}
function ruleName(rule) {
    return executiveOrder(rule.order)?.name ?? rule.order;
}
export function ruleEffectiveTitle(rule) {
    return `The rule behind ${ruleName(rule).toLowerCase()}`;
}
export function ruleEffectiveDue(campaign) {
    const rule = nearestRule(campaign);
    if (rule === undefined)
        return undefined;
    return dueOnTurn(campaign, rule.effectiveTurn, urgencyForWeeks(weeksUntil(campaign, rule.effectiveTurn)), {
        subject: `rule:${rule.id}`,
        title: ruleEffectiveTitle(rule),
    });
}
/** Weeks Congress still has to write a resolution of disapproval against a landed rule. */
export function disapprovalWeeksLeft(campaign, rule) {
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
export function exposedRule(campaign) {
    const contested = new Set(selectBills(campaign).flatMap((bill) => bill.status !== "dead" && actOf(bill)?.disapproves === true && bill.target !== undefined
        ? [bill.target]
        : []));
    return [...campaign.pendingRules]
        .filter((rule) => rule.status === "in-effect" &&
        !contested.has(rule.order) &&
        disapprovalWeeksLeft(campaign, rule) > 0)
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
export function ruleDisapprovalTitle(rule) {
    return `Congress can still take back ${ruleName(rule).toLowerCase()}`;
}
export function ruleDisapprovalDue(campaign) {
    const rule = exposedRule(campaign);
    if (rule === undefined)
        return undefined;
    const since = campaign.turn - (rule.resolvedTurn ?? rule.effectiveTurn);
    // Never `due`: this window closing is the President's own good news, and a
    // clock that painted it adverse would rank relief above a lapsed
    // appropriation on the same screen.
    return dueOnTurn(campaign, (rule.resolvedTurn ?? rule.effectiveTurn) + DISAPPROVAL_WINDOW_TURNS, since <= DISAPPROVAL_LIVE_TURNS ? "closing" : "standing", { subject: `rule-disapproval:${rule.id}`, title: ruleDisapprovalTitle(rule) });
}
/**
 * The announced departure that goes first with nobody sent up to succeed it: a
 * Secretary serving out a transition leaves on this turn and the deputy acts,
 * unless a successor is before the Senate by then. One with a successor
 * pending is the nomination's clock, not this one.
 */
export function nearestDeparture(campaign) {
    return selectDepartureTransitions(campaign)
        .filter((transition) => !transition.successorPending)
        .sort((a, b) => a.leavesTurn - b.leavesTurn)[0];
}
export function departureTitle(campaign, transition) {
    const name = selectPerson(campaign, transition.person)?.base.name ?? String(transition.person);
    const department = institutionForRole(transition.role);
    return `${name} is leaving ${department ? (INSTITUTION_NAMES.get(String(department.id)) ?? department.name) : "the cabinet"}`;
}
export function departureDue(campaign) {
    const transition = nearestDeparture(campaign);
    if (transition === undefined)
        return undefined;
    const weeks = weeksUntil(campaign, transition.leavesTurn);
    return dueOnTurn(campaign, transition.leavesTurn, urgencyForWeeks(weeks), {
        subject: `departure:${String(transition.role)}`,
        title: departureTitle(campaign, transition),
    });
}
export function nearestActing(campaign) {
    return Object.values(campaign.institutions)
        .flatMap((runtime) => {
        const expiresDay = runtime.actingExpiresDay;
        if (runtime.actingLeader === undefined || expiresDay === undefined)
            return [];
        return [{ runtime, expiresDay }];
    })
        .sort((a, b) => a.expiresDay - b.expiresDay)[0];
}
export function institutionName(seat) {
    return INSTITUTION_NAMES.get(String(seat.runtime.id)) ?? String(seat.runtime.id);
}
export function actingTitle(seat) {
    return `Temporary leader at ${institutionName(seat)}`;
}
export function actingDue(campaign) {
    const seat = nearestActing(campaign);
    if (seat === undefined)
        return undefined;
    const days = daysUntil(campaign, seat.expiresDay);
    return dueInDays(campaign, days, urgencyForDays(days), {
        subject: `acting:${String(seat.runtime.id)}`,
        title: actingTitle(seat),
    });
}
/** The milestones that decide who holds the seat, as against the ones that merely date the year. */
const SEAT_MILESTONES = new Set([
    "midterm-election",
    "presidential-election",
]);
export function nextSeatMilestone(campaign) {
    return selectNextMilestones(campaign, 8).find((milestone) => SEAT_MILESTONES.has(milestone.kind));
}
export function milestoneDue(campaign) {
    const milestone = nextSeatMilestone(campaign);
    if (milestone === undefined)
        return undefined;
    return dueOnDate(campaign, milestone.date, milestone.daysAway, urgencyForDays(milestone.daysAway, 2 * DAYS_PER_TURN), 
    // The same subject the constitutional calendar raises the date under, so
    // the election is one entry on the desk rather than two.
    { subject: `milestone:${milestone.kind}`, title: milestone.label });
}
/**
 * Where the removal arc stops being a number and becomes a step on a ladder.
 *
 * The engine's own beat ladder, imported rather than copied: a summons that
 * warned of invented quarter marks while the real beats opened elsewhere would
 * be a false alarm on the one clock that ends presidencies, and a transcribed
 * copy of the ladder becomes exactly that the first time the ladder is tuned.
 */
const REMOVAL_RUNGS = BEAT_THRESHOLDS;
export function nextRung(pressure) {
    return REMOVAL_RUNGS.find((rung) => pressure < rung);
}
/** Within this much of the next rung, the ladder is close enough to interrupt the week. */
const RUNG_REACH = 0.08;
export const REMOVAL_TITLE = "Pressure to remove you is nearing the next step";
export function removalDue(campaign) {
    const removal = selectRemoval(campaign);
    if (removal.resolved)
        return undefined;
    const rung = nextRung(removal.pressure);
    if (rung === undefined || rung - removal.pressure > RUNG_REACH)
        return undefined;
    return dueOnTurn(campaign, campaign.turn, "due", {
        // The Desk's own removal row carries this subject.
        subject: "removal",
        title: REMOVAL_TITLE,
    });
}
