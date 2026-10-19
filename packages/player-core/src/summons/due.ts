import {
  actingDue,
  departureDue,
  milestoneDue,
  nominationDue,
  removalDue,
  reportDue,
  ruleDisapprovalDue,
  ruleEffectiveDue,
  rulingDue,
  terminationDue,
} from "./due-executive";
import { appropriationDue, aumfDue, billDeskDue, shutdownDue, treatyDue } from "./due-legislative";
import type { SummonsDueSpec } from "./types";

/**
 * Every institutional clock the campaign carries, as a reading and nothing more.
 *
 * One declaration of what each clock is — which place answers it, whether it
 * stops the week, which of the engine's sources of presidential attention it
 * speaks for — with the prose attached separately in `clocks.ts`. The attention
 * loop reads this list; the folio and the Record read the composed one.
 *
 * Every kind names a source, and the map is exhaustive by type: a fifteenth
 * clock cannot be added without saying what kind of demand on the President it
 * is, which is the whole reason a statutory deadline and a war can be ranked
 * against each other at all.
 */
export const SUMMONS_DUE: readonly SummonsDueSpec[] = [
  // campaign.congress.appropriation.throughTurn — the turn funding runs through.
  {
    id: "appropriation",
    owner: "budget",
    class: "interruption",
    source: "appropriations-deadline",
    answerable: true,
    due: appropriationDue,
  },
  // selectShutdown() — the lapse past its grace window, counting up. Carries the
  // appropriation's own subject rather than a second one: the money running out
  // and the doors closing are one fact.
  {
    id: "shutdown",
    owner: "budget",
    class: "interruption",
    source: "appropriations-deadline",
    answerable: true,
    due: shutdownDue,
  },
  // The enrolled bill nearest its tenth day after presentment, Sundays excepted.
  {
    id: "bill-desk",
    owner: "policy",
    class: "document",
    source: "bill-signature",
    answerable: true,
    due: billDeskDue,
  },
  // selectActiveAuthorizations() — ForceAuthorization.expiresTurn. An expiring
  // authorization is an instrument of Congress coming to an end, which is the
  // same demand on the President as an unratified treaty and is why they share
  // a source: nothing in the engine's list separates the two.
  {
    id: "aumf-expiry",
    owner: "security",
    class: "document",
    source: "treaty-deadline",
    answerable: true,
    due: aumfDue,
  },
  // selectTreatiesAwaitingRatification() — TreatyRecord.status === "signed".
  {
    id: "treaty-ratification",
    owner: "congress",
    class: "document",
    source: "treaty-deadline",
    answerable: true,
    due: treatyDue,
  },
  // selectObligations() — ReportObligation.dueDay, the 48-hour report window.
  {
    id: "war-powers-report",
    owner: "security",
    class: "document",
    source: "military-escalation",
    answerable: true,
    due: reportDue,
  },
  // terminationDaysRemaining() — the 60-day window, plus any certified extension.
  {
    id: "war-powers-termination",
    owner: "security",
    class: "interruption",
    source: "military-escalation",
    answerable: true,
    due: terminationDue,
  },
  // selectActiveNominations() + stageDuration() — the day the current stage is up.
  {
    id: "nomination-stage",
    owner: "washington",
    class: "document",
    source: "nomination",
    answerable: true,
    due: nominationDue,
  },
  // campaign.orders[].review.dueTurn — a pending judicial review of an order.
  {
    id: "ruling-due",
    owner: "courts",
    class: "document",
    source: "court-ruling",
    answerable: true,
    due: rulingDue,
  },
  // campaign.pendingRules — the week a signed order's rulemaking is final. An
  // agency writing the President's order into a binding rule is the executive
  // branch asking to be noticed, which is what `agency-request` names.
  {
    id: "rule-effective",
    owner: "policy",
    class: "document",
    source: "agency-request",
    answerable: true,
    due: ruleEffectiveDue,
  },
  // campaign.pendingRules + DISAPPROVAL_WINDOW_TURNS — a landed rule Congress
  // can still undo. A window one branch holds over another's act is a
  // separation-of-powers clock, which is where the statutory calendar already
  // sits in the engine's list.
  {
    id: "rule-disapproval",
    owner: "policy",
    class: "document",
    source: "constitutional-deadline",
    answerable: false,
    due: ruleDisapprovalDue,
  },
  // campaign.institutions[].actingExpiresDay — statutory acting authority, which
  // runs out into the same answer a nomination does: a name, or an empty chair.
  {
    id: "acting-authority",
    owner: "washington",
    class: "document",
    source: "nomination",
    answerable: true,
    due: actingDue,
  },
  // Announced cabinet departures with nobody sent up: the turn the Secretary
  // goes and the deputy acts, answered the way an acting clock is, with a name.
  {
    id: "departure-transition",
    owner: "washington",
    class: "document",
    source: "nomination",
    answerable: true,
    due: departureDue,
  },
  // selectNextMilestones() — the election and term-boundary dates on the calendar.
  {
    id: "election-milestone",
    owner: "nation",
    class: "interruption",
    source: "constitutional-deadline",
    answerable: false,
    due: milestoneDue,
  },
  // selectRemoval() — pressure approaching the next rung of the ladder. The case
  // being built against a president is an investigation of one.
  {
    id: "removal-beat",
    owner: "brief",
    class: "interruption",
    source: "investigation",
    answerable: true,
    due: removalDue,
  },
];
