import type { Campaign } from "./state.js";
import type { Nomination } from "./nomination.js";
import type { OfficeId } from "./institutions.js";
import { confirmationVote } from "./confirmation-count.js";
import { committeeDisposition } from "./committees.js";

// The stage machine a nomination walks: what each stage is, how long it takes
// in this Senate, what happens when its clock runs out, and which nominations
// are still moving through it. Kept apart from the acts that open, withdraw
// and seat, because the machine is the part that answers to the calendar and
// the Senate, and the acts are the part that answers to the President. The
// appointment acts read the still-moving half too, to refuse a chair a name is
// already before the Senate for.

export type NominationStage =
  | "shortlist"
  | "vetting"
  | "prepared"
  | "nominated"
  | "referred"
  | "disclosures"
  | "hearing-scheduled"
  | "hearing"
  | "committee-action"
  | "executive-calendar"
  | "floor-pending"
  | "cloture"
  | "vote"
  | "confirmed"
  | "rejected"
  | "withdrawn"
  | "returned"
  | "sworn-in";

/** The stages a nomination is still moving through. */
export const ACTIVE_STAGES: readonly NominationStage[] = [
  "shortlist",
  "vetting",
  "prepared",
  "nominated",
  "referred",
  "disclosures",
  "hearing-scheduled",
  "hearing",
  "committee-action",
  "executive-calendar",
  "floor-pending",
  "cloture",
  "vote",
  // Confirmed is not the end: an officer is sworn in some days later, and
  // until they are the chair is still empty. Treating confirmation as terminal
  // was the difference between a Senate vote and somebody actually running the
  // department.
  "confirmed",
];

/** The stages nothing further happens from. */
export const TERMINAL_STAGES: readonly NominationStage[] = [
  "rejected",
  "withdrawn",
  "returned",
  "sworn-in",
];

export function isTerminal(stage: NominationStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function selectActiveNominations(campaign: Campaign): readonly Nomination[] {
  return Object.values(campaign.nominations).filter((nomination) => !isTerminal(nomination.stage));
}

export function selectNominationForOffice(campaign: Campaign, office: OfficeId): Nomination | undefined {
  return selectActiveNominations(campaign).find((nomination) => nomination.office === office);
}

// --- Stage durations --------------------------------------------------------

// Median days each stage takes with a cooperative Senate and an uncontroversial
// nominee. Every one of these is stretched by disposition, controversy and
// floor congestion below; none of them is ever compressed below its floor,
// because the parts of this process that are paperwork do not go faster
// because the president is popular.
const STAGE_DAYS: Readonly<Record<NominationStage, number>> = {
  shortlist: 14,
  vetting: 30,
  prepared: 7,
  nominated: 1,
  referred: 3,
  disclosures: 21,
  "hearing-scheduled": 14,
  hearing: 1,
  "committee-action": 14,
  "executive-calendar": 7,
  "floor-pending": 14,
  cloture: 2,
  vote: 1,
  confirmed: 7,
  rejected: 0,
  withdrawn: 0,
  returned: 0,
  "sworn-in": 0,
};

// The Senate's own stages stretch when the Senate does not like the president;
// the executive's own stages (shortlist, vetting, preparation) do not, because
// they happen in the White House.
const SENATE_STAGES: readonly NominationStage[] = [
  "referred",
  "disclosures",
  "hearing-scheduled",
  "hearing",
  "committee-action",
  "executive-calendar",
  "floor-pending",
  "cloture",
  "vote",
];

const DISPOSITION_STRETCH = 1.6;
const CONTROVERSY_STRETCH_PER = 0.35;
// Floor time is the binding constraint on a large government. Every other
// nomination waiting on the calendar makes this one wait longer, which is why
// a president who sends up sixty names at once seats them more slowly than one
// who sequences them.
const CONGESTION_STRETCH_PER = 0.06;
const CONGESTION_FREE = 4;

export const CONGESTED_STAGES: readonly NominationStage[] = ["executive-calendar", "floor-pending", "cloture", "vote"];

// The stages that happen inside a committee room rather than on the floor.
// These are the ones a chair's own reading of the administration stretches or
// shortens: the calendar past them belongs to the Majority Leader, and a panel
// that likes a nominee cannot buy them floor time.
const COMMITTEE_STAGES: readonly NominationStage[] = [
  "referred",
  "disclosures",
  "hearing-scheduled",
  "hearing",
  "committee-action",
];

/**
 * The disposition this nomination's current stage is stretched by.
 *
 * A committee stage answers to its own panel; everything else on the Senate's
 * side answers to the room. A nomination referred to no committee — an office
 * the catalog names none for — reads the room at every stage, which is what
 * every nomination did before the panels were seated.
 */
function stageDisposition(campaign: Campaign, nomination: Nomination): number {
  return COMMITTEE_STAGES.includes(nomination.stage)
    ? committeeDisposition(campaign, nomination.committee)
    : campaign.congress.disposition;
}

// Every congested stage is an active one, so counting the stored nominations
// in those stages is the floor queue without walking the terminal ones twice.
function queuedOnFloor(campaign: Campaign): number {
  return Object.values(campaign.nominations).filter((nomination) => CONGESTED_STAGES.includes(nomination.stage)).length;
}

/**
 * The four legs a nomination runs, in order: the White House's own vetting,
 * the committee, the floor, and the oath. A screen draws a nomination as these
 * rather than as its fourteen stages, and they are defined here, beside the
 * stage lists that decide which stages the committee and the floor stretch, so
 * the legs a player sees are the ones the clock actually runs on.
 */
export type NominationLeg = "white-house" | "committee" | "floor" | "seated";

export const NOMINATION_LEGS: readonly NominationLeg[] = ["white-house", "committee", "floor", "seated"];

/** Which leg a stage belongs to; a nomination that ended without a seat is on none. */
export function nominationLeg(stage: NominationStage): NominationLeg | undefined {
  if (stage === "confirmed" || stage === "sworn-in") return "seated";
  if (isTerminal(stage)) return undefined;
  if (CONGESTED_STAGES.includes(stage)) return "floor";
  if (COMMITTEE_STAGES.includes(stage)) return "committee";
  return "white-house";
}

/** How many days this nomination's current stage takes, in this Senate, right now. */
export function stageDuration(campaign: Campaign, nomination: Nomination): number {
  const base = STAGE_DAYS[nomination.stage];
  if (base === 0) return 0;
  let days = base;
  if (SENATE_STAGES.includes(nomination.stage)) {
    const resistance = 1 - stageDisposition(campaign, nomination);
    days *= 1 + resistance * DISPOSITION_STRETCH;
    days *= 1 + nomination.controversies.length * CONTROVERSY_STRETCH_PER;
  }
  if (CONGESTED_STAGES.includes(nomination.stage)) {
    const queued = Math.max(0, queuedOnFloor(campaign) - CONGESTION_FREE);
    days *= 1 + queued * CONGESTION_STRETCH_PER;
  }
  return Math.round(days);
}

// --- The state machine ------------------------------------------------------

const NEXT_STAGE: Readonly<Partial<Record<NominationStage, NominationStage>>> = {
  shortlist: "vetting",
  vetting: "prepared",
  prepared: "nominated",
  nominated: "referred",
  referred: "disclosures",
  disclosures: "hearing-scheduled",
  "hearing-scheduled": "hearing",
  hearing: "committee-action",
  "committee-action": "executive-calendar",
  "executive-calendar": "floor-pending",
  "floor-pending": "cloture",
  cloture: "vote",
  confirmed: "sworn-in",
};

const STAGE_NOTES: Readonly<Partial<Record<NominationStage, string>>> = {
  prepared: "Paperwork is complete and the nomination is ready to go up.",
  nominated: "The nomination is formally transmitted to the Senate.",
  referred: "Referred to committee.",
  disclosures: "Financial disclosures and the background questionnaire go in.",
  "hearing-scheduled": "The committee sets a hearing date.",
  hearing: "The nominee testifies.",
  "committee-action": "The committee votes to report the nomination.",
  "executive-calendar": "Placed on the Executive Calendar to wait for floor time.",
  "floor-pending": "Pending on the floor.",
  cloture: "Cloture is filed.",
  vote: "The Senate votes.",
  "sworn-in": "Sworn in.",
};

/**
 * Whether a committee reports a nomination out, or sits on it.
 *
 * A committee that will not act is the way most nominations actually die, and
 * it is a different death from a lost floor vote: nothing is voted down, the
 * nomination simply never leaves the room. Modeling only the floor vote made
 * the Senate look far more decisive than it is.
 *
 * Which room it is decides it. This reads the panel the office was referred to
 * rather than the whole Senate's mood, so a president can lose a nominee to one
 * chair while the rest of a cabinet moves.
 */
function committeeWouldReport(campaign: Campaign, nomination: Nomination): boolean {
  const hostility = 1 - committeeDisposition(campaign, nomination.committee);
  const controversyWeight = nomination.controversies.length * 0.12;
  return hostility + controversyWeight < 0.62;
}

/**
 * Whether cloture would be invoked, which is a lower bar than it used to be: a
 * majority since 2013, counted the way the floor vote is.
 */
function clotureWouldSucceed(campaign: Campaign, nomination: Nomination): boolean {
  const vote = confirmationVote(campaign, nomination.nominee);
  return vote.yeas >= vote.required;
}

export type StageResolution = {
  readonly stage: NominationStage;
  readonly note: string;
  readonly outcome?: string;
};

/**
 * What happens when the current stage's clock runs out.
 *
 * Every branch here is a real way a nomination ends or stalls. `returned` is
 * the one that surprises players and is worth keeping: a nomination the Senate
 * never acted on is returned to the President rather than carried forward, and
 * a president who lets one sit has to start it again.
 */
export function resolveStage(campaign: Campaign, nomination: Nomination): StageResolution {
  if (nomination.stage === "committee-action") {
    if (!committeeWouldReport(campaign, nomination)) {
      return {
        stage: "returned",
        note: "The committee never reports the nomination, and it is returned at the end of the session.",
        outcome: "returned without committee action",
      };
    }
  }
  if (nomination.stage === "cloture") {
    if (!clotureWouldSucceed(campaign, nomination)) {
      return {
        stage: "returned",
        note: "Cloture is not invoked, and the nomination goes no further.",
        outcome: "failed to reach a vote",
      };
    }
  }
  if (nomination.stage === "vote") {
    const vote = confirmationVote(campaign, nomination.nominee);
    if (vote.passed) {
      return { stage: "confirmed", note: `Confirmed, ${vote.yeas} to ${vote.nays}.` };
    }
    return {
      stage: "rejected",
      note: `Rejected, ${vote.yeas} to ${vote.nays}.`,
      outcome: "rejected on the floor",
    };
  }
  const next = NEXT_STAGE[nomination.stage];
  if (!next) return { stage: nomination.stage, note: "" };
  return { stage: next, note: STAGE_NOTES[next] ?? `Moves to ${next}.` };
}
