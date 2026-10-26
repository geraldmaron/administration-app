import type { Nation, NationId, RoleId, PersonId } from "@admin/world";
import {
  selectAuthorizationAgainst,
  type Campaign,
  type IssuedInstrumentAct,
  type Chamber,
  type ChamberComposition,
  type ChamberVote,
  type Congress,
  type ForceAuthorization,
  type UnauthorizedAction,
  type AdministrationParty,
  type UsMajorParty,
} from "./state.js";
import { leadershipDrift } from "./hill.js";
import { voteOn } from "./congress-votes.js";
import { confirmationQuestion } from "./confirmation-count.js";
import { liveSignature } from "./caucus-count.js";
import { compositionFromSeats, type OpeningSeats } from "./founding-congress.js";
import { administrationReach } from "./party.js";
import { headOfGovernmentTitle, possessive } from "./naming.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RungLevel } from "./instruments.js";
import type { TurnPhase } from "./turn-loop.js";
import { BUDGET_ACCOUNT_SPECS } from "./budget.js";
import { turnsFor } from "./pace.js";
import { CAMPAIGN_OPENING_DATE, fiscalYearEnd, fiscalYearOf, turnOnDate } from "./clock.js";
import { selectOversightPressure } from "./oversight.js";
import { expiredObligations, TERMINATION_WINDOW_DAYS } from "./war-powers-report.js";

// The branch above the presidency.
//
// Everything an administration could do ran out of money, readiness or
// tradecraft, and nothing ran out of permission. So the balance harness's
// reckless proxy could take the heaviest military rung on the board against a
// different country every week for a year: the force gates it had just been
// given belong to ladders whose top rung is one act against one country, and a
// president who is refused nothing simply aims at the next capital.
//
// The constraint that actually binds a presidency is not physical. A president
// cannot sustain or repeat major military action without Congress, cannot seat
// a cabinet without the Senate, and cannot spend a dollar Congress has not
// appropriated. This file is those three, and one number underneath them: how
// the Hill is currently disposed toward this administration, which is what
// every vote in here is really about.

// --- The chambers -----------------------------------------------------------

export const CHAMBERS: readonly Chamber[] = ["house", "senate"];

export const CHAMBER_NAMES: Readonly<Record<Chamber, string>> = {
  house: "the House",
  senate: "the Senate",
};

const HOUSE_SEATS = 435;
const SENATE_SEATS = 100;

/**
 * The members a chamber's count is taken over: its seats less the ones left
 * vacant by a death. Both Houses decide by those present and voting, and the
 * Constitution's two-thirds bars count the same way, so an empty seat is
 * neither a yea nor a nay; Senate cloture's three fifths is of senators duly
 * chosen and sworn, which excludes a vacancy too.
 */
export function seatedOf(congress: Congress, chamber: Chamber): number {
  const vacant = (congress.members ?? []).filter((member) => member.chamber === chamber && member.vacancy !== undefined).length;
  return congress.chambers[chamber].seats - vacant;
}

/** A simple majority of a chamber — one more than half, always an integer. */
export function majorityOf(seats: number): number {
  return Math.floor(seats / 2) + 1;
}

/** Two thirds, the bar an override and a treaty have to clear. */
export function supermajorityOf(seats: number): number {
  return Math.ceil((seats * 2) / 3);
}

/**
 * Three fifths — sixty of a hundred senators — which is the count it takes to
 * end debate on a bill rather than to pass one.
 *
 * Passage is a majority and always has been, but a measure the minority will
 * not stop debating never reaches the vote, so the bar that actually decides
 * whether ordinary legislation becomes law is this one. A model that counted
 * fifty-one taught the single most consequential falsehood available about the
 * American legislature: that a president with a bare Senate can legislate.
 */
export function clotureOf(seats: number): number {
  return Math.ceil(seats * 0.6);
}

/**
 * Which of the Senate's two arithmetics a measure answers to.
 *
 * `reconciliation` is the instructed budget track for direct spending, revenue
 * and the debt limit: debate is limited, so cloture does not arise.
 * Continuing resolutions and regular appropriations stay on `ordinary`.
 * `privileged` is a resolution of disapproval: fifty-one, not sixty.
 */
export type LegislativeTrack = "ordinary" | "reconciliation" | "privileged";

/**
 * The count one chamber needs to carry a measure on a given track.
 *
 * The House has one arithmetic and always has: a majority, with debate closed
 * by a rule the majority writes. Everything below is about the Senate.
 *
 * A nomination is deliberately a majority here too, and that is the current
 * law of the room rather than an omission: the Senate abolished the sixty-vote
 * cloture bar for executive-branch and judicial nominations, so confirmation
 * really is decided by fifty-one.
 */
export function floorThreshold(congress: Congress, chamber: Chamber, track: LegislativeTrack): number {
  const seats = seatedOf(congress, chamber);
  const sixty = chamber === "senate" && track === "ordinary";
  return sixty ? clotureOf(seats) : majorityOf(seats);
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

const FUNDING_CONTINUITY_LEAD_TURNS = 2;

/**
 * The same two-week window the stopgap enters the agenda inside.
 *
 * The origination gate and the funding vote have to answer the same deadline or
 * the Hill would treat a lapse as due for purposes of taking a stopgap up and
 * not yet due for purposes of voting it, which is the same defect one stage
 * later.
 */
export function fundingContinuityDue(campaign: Campaign): boolean {
  return campaign.turn + FUNDING_CONTINUITY_LEAD_TURNS >= campaign.congress.appropriation.throughTurn;
}

/**
 * What this charter calls the person in the chair, mid-sentence.
 *
 * Derived from the seat the campaign was founded on rather than written out,
 * because every sentence in this file is player-facing and "the President" is
 * true of exactly one charter. A charter that authors its own titles is served
 * by the same resolver wherever the caller has the record to hand.
 */
export const headOfGovernment = (campaign: Campaign): string => headOfGovernmentTitle(campaign.founding.leadRole);

const leader = headOfGovernment;

/**
 * The Congress a president inherits.
 *
 * The founding passes the seats it counted from the map, the mandate and the
 * year's swing (`openingSeats`). Without them, composition is read off the
 * country: a government with legitimacy behind it seats more of its own party,
 * and a factional country seats more members who caucus with neither side. The
 * Senate runs closer than the House because it is apportioned by state rather
 * than by population, which is exactly the fact that makes confirmation the
 * harder of the two arithmetics.
 *
 * `administrationParty` and `caucusAnchor` are both required so a fixture
 * cannot omit the labels every player-facing party word is derived from. They
 * are the same value unless the president ran as an independent, who has no
 * caucus of their own and is counted against the one they sit nearest.
 *
 * A president with no party arrives with no coattails either: the seats a
 * legitimate government would have carried in with it are not carried in by
 * someone who had no ticket below them, so the legitimacy term is scaled by
 * their reach. What that leaves is a chamber composed of two caucuses, neither
 * of which is theirs.
 */
export function openingCongress(
  nation: Nation,
  turn: number,
  administrationParty: AdministrationParty,
  caucusAnchor: UsMajorParty,
  seats?: OpeningSeats,
): Congress {
  const { legitimacy, factionalism } = nation.stats.politics;
  const independentShare = clamp01(factionalism * 0.08);
  const coattails = (legitimacy - 0.5) * 0.18 * administrationReach(administrationParty);
  const administrationShare = clamp01(0.5 + coattails - independentShare / 2);
  return {
    // The founding counts real seats (founding-congress.ts); a caller with no
    // seed to count them from keeps the reading off the nation's legitimacy.
    chambers: seats
      ? { house: compositionFromSeats(seats.house, caucusAnchor), senate: compositionFromSeats(seats.senate, caucusAnchor) }
      : {
          house: compose(HOUSE_SEATS, administrationShare, independentShare),
          // Halved lean: fifty states do not swing with a national mood the way
          // four hundred and thirty-five districts do.
          senate: compose(SENATE_SEATS, 0.5 + (administrationShare - 0.5) * 0.5, independentShare),
        },
    administrationParty,
    caucusAnchor,
    disposition: round3(clamp01(0.45 + (legitimacy - 0.5) * 0.4)),
    // Seated separately, by `withLeadership`, because who holds the
    // speakership is a fact about the cast and the cast does not exist yet at
    // the point the chambers are composed.
    leadership: [],
    // Seated separately too, by `withCommittees`, and for the same reason: a
    // panel is people, and the cast does not exist yet.
    committees: {},
    authorizations: [],
    unauthorized: [],
    lobbying: [],
    // A placeholder the seal overwrites with `openingAppropriation`, read off the
    // same fiscal year so it never claims a book that runs past September 30.
    appropriation: {
      enactedTurn: turn,
      throughTurn: turn - 1 + turnOnDate(CAMPAIGN_OPENING_DATE, fiscalYearEnd(fiscalYearOf(CAMPAIGN_OPENING_DATE))),
      onPriorYear: false,
      priorYear: [],
    },
  };
}

function compose(seats: number, administrationShare: number, independentShare: number): ChamberComposition {
  const independent = Math.round(seats * independentShare);
  const administration = Math.round((seats - independent) * administrationShare);
  return { seats, administration, opposition: seats - independent - administration, independent };
}

// --- Whether a vote carries -------------------------------------------------


function sentenceList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)!}`;
}

/** Whether a measure carried in every chamber it had to. */
export function carried(votes: readonly ChamberVote[]): boolean {
  return votes.length > 0 && votes.every((vote) => vote.passed && (vote.cloture?.passed ?? true));
}

// --- War powers -------------------------------------------------------------

/**
 * The rungs that are war rather than signaling.
 *
 * A blockade, a strike and an invasion are the introduction of forces into
 * hostilities; an exercise and a forward deployment are posture, reportable but
 * not the thing an authorization is for. A blockade of a state's ports is listed
 * as an act of aggression in General Assembly Resolution 3314, Article 3(c), and
 * a navy closing a coast by force is not posture.
 */
export const MAJOR_FORCE_RUNGS: readonly RungLevel[] = [3, 4, 5];

/**
 * How long a president may act on their own authority before Congress has to
 * have said yes.
 *
 * Derived from `TERMINATION_WINDOW_DAYS` rather than authored as its own
 * number — war-powers-report.ts runs the real sixty-day clock in days, off
 * the day a report was owed, and this file's own recent-action check ran a
 * second clock in turns that could only ever approximate it. Two constants
 * for one statute meant they could read "sixty days" and disagree about how
 * long that was; rounded up rather than down, because a turn a president
 * never got is a week of latitude the office is not actually owed by the
 * statute, and the day-level version (`expiredObligations`, checked first in
 * `warPowersStanding` below) is what the exact boundary answers to regardless.
 *
 * Inside it a president may introduce forces and answer for it afterward,
 * which is the real latitude of the office; past it, continuing is not
 * something the system permits, it is something that ends presidencies.
 *
 * Running it out is therefore not how the latitude comes back. What the record
 * of an unauthorized action stops doing after this many weeks is stand in for
 * the introduction it belongs to: the introduction's own obligation to
 * terminate is what closes the ladder from then on, and only a vote or the
 * force coming out discharges that.
 */
export const WAR_POWERS_WINDOW_TURNS = turnsFor(TERMINATION_WINDOW_DAYS);

export type WarPowersStanding =
  /** Not a use of force this applies to at all. */
  | { readonly kind: "not-applicable" }
  /** Covered by a standing authorization. */
  | { readonly kind: "authorized"; readonly authorization: ForceAuthorization }
  /** The president's own authority covers it, and Congress will hear about it. */
  | { readonly kind: "unilateral"; readonly reason: string }
  /** Past the office's own authority: Congress has to vote first. */
  | { readonly kind: "requires-authorization"; readonly reason: string };

/**
 * Where a proposed use of force stands constitutionally.
 *
 * The three cases are genuinely different and a model that collapsed them would
 * be wrong in both directions: an authorized war is not a scandal, a first
 * unilateral strike is lawful and expensive, and a fourth one in a month is
 * neither.
 */
export function warPowersStanding(campaign: Campaign, target: NationId, rung: RungLevel): WarPowersStanding {
  if (!MAJOR_FORCE_RUNGS.includes(rung)) return { kind: "not-applicable" };
  const authorization = selectAuthorizationAgainst(campaign, target);
  if (authorization) return { kind: "authorized", authorization };

  // The obligation to terminate outranks the record of the action that opened
  // it. An introduction whose sixty days ran out with no vote behind it is not
  // a spent clock, it is a force the statute says should already be home, and
  // a president standing on that has less latitude than one inside the window
  // rather than more.
  const owed = expiredObligations(campaign);
  const owedHere = owed.filter((obligation) => obligation.target === target);
  if (owedHere.length > 0) {
    return {
      kind: "requires-authorization",
      reason: `the sixty days on the force already committed against ${target} have run out, and until Congress votes or that force comes out ${possessive(leader(campaign))} own authority does not reach it`,
    };
  }
  if (owed.length > 0) {
    return {
      kind: "requires-authorization",
      reason: `this administration owes Congress the termination of a use of force it never voted on, and opening a second front while that stands is not something the office can do`,
    };
  }

  // An order already issued and waiting to execute is a front the President has
  // opened even though no shot has been fired, so a second act cannot be shown
  // as lawful at issue and then refused when the first one lands.
  const ordered = pendingUnilateralForce(campaign);
  const orderedHere = ordered.find((act) => act.request.target === target);
  if (orderedHere) {
    return {
      kind: "requires-authorization",
      reason: `forces are already ordered against ${target} without a vote, and ${possessive(leader(campaign))} own authority does not extend to a second operation there`,
    };
  }
  if (ordered.length > 0) {
    return {
      kind: "requires-authorization",
      reason: `forces are already ordered into action abroad without a vote, and opening a second front on ${possessive(leader(campaign))} own authority is not something the office can do`,
    };
  }

  const recent = campaign.congress.unauthorized.filter(
    (action) => campaign.turn - action.turn < WAR_POWERS_WINDOW_TURNS,
  );
  const againstTarget = recent.filter((action) => action.target === target);
  if (againstTarget.length > 0) {
    return {
      kind: "requires-authorization",
      reason: `forces have been in action against ${target} since week ${againstTarget[0]!.turn} without a vote, and ${possessive(leader(campaign))} own authority does not extend to sustaining it`,
    };
  }
  if (recent.length > 0) {
    return {
      kind: "requires-authorization",
      reason: `this administration is already using force abroad without a vote, and opening a second front on ${possessive(leader(campaign))} own authority is not something the office can do`,
    };
  }
  return {
    kind: "unilateral",
    reason: `${leader(campaign)} may introduce forces; a report to Congress is due within forty-eight hours. The separate sixty-day termination requirement applies to continued hostilities`,
  };
}

function pendingUnilateralForce(campaign: Campaign): readonly IssuedInstrumentAct[] {
  return Object.values(campaign.issuedActs ?? {}).filter((act): act is IssuedInstrumentAct =>
    act.kind === "instrument" &&
    (act.status === "issued" || act.status === "in-progress" || act.status === "awaiting-response") &&
    act.request.actor === campaign.founding.nation &&
    act.request.instrument === "military" &&
    MAJOR_FORCE_RUNGS.includes(act.request.rung) &&
    !selectAuthorizationAgainst(campaign, act.request.target));
}

/** Whether the ladder should open this rung at all, for the president's own forces. */
export function forceIsPermitted(campaign: Campaign, target: NationId, rung: RungLevel): boolean {
  return warPowersStanding(campaign, target, rung).kind !== "requires-authorization";
}

/** What acting on the President's own authority costs, before anyone objects. */
export const UNILATERAL_FORCE_COST = { standing: -0.03, stability: -0.025 } as const;

/**
 * The record of a unilateral action, and the disposition it costs.
 *
 * Congress does not refuse a president for using force; it refuses them for
 * being told afterward. Every one of these makes the next authorization vote
 * harder, which is how repeated unauthorized action compounds without any
 * counter anywhere having to be invented for it.
 */
const UNILATERAL_DISPOSITION_COST = 0.09;

export function recordUnilateralForce(
  campaign: Campaign,
  target: NationId,
  rung: RungLevel,
  description: string,
): readonly Effect[] {
  const action: UnauthorizedAction = {
    id: `unauthorized:${target}:${campaign.turn}`,
    target,
    turn: campaign.turn,
    rung,
    description,
  };
  return [
    {
      kind: "congress",
      set: {
        ...campaign.congress,
        disposition: round3(clamp01(campaign.congress.disposition - UNILATERAL_DISPOSITION_COST)),
        unauthorized: [...campaign.congress.unauthorized, action],
      },
    },
    { kind: "metric", deltas: { ...UNILATERAL_FORCE_COST } },
  ];
}

// --- Asking for the authorization ------------------------------------------
//
// The issued-act lifecycle (issue → calendar → floor vote) lives in
// force-authorization.ts so this file stays under the line budget. The term
// length and the shared CongressResult shape stay here because appropriation
// and war-powers clocks already import them.

/** How long an authorization runs before it has to be voted again. */
export const AUTHORIZATION_TERM_TURNS = 52;

export type CongressResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

// --- Confirmation -----------------------------------------------------------

export type ConfirmationProjection = {
  readonly role: RoleId;
  readonly nominee: PersonId;
  readonly vote: ChamberVote;
  readonly wouldConfirm: boolean;
  readonly reasoning: string;
};

/** Confirmation runs through the Senate alone, and needs a simple majority. */
export function projectConfirmation(campaign: Campaign, role: RoleId, nominee: PersonId): ConfirmationProjection {
  const vote = voteOn(campaign, confirmationQuestion(campaign, nominee));
  return {
    role,
    nominee,
    vote,
    wouldConfirm: vote.passed,
    reasoning:
      vote.yeas >= vote.required + 10
        ? "The nomination is not in doubt; the hearing is a formality the committee will still take its time over."
        : "The margin is close enough that a single defection is the whole story.",
  };
}

// --- The week ---------------------------------------------------------------

/**
 * What the Hill thinks of an administration, recomputed from what it is
 * looking at rather than accumulated.
 *
 * Drifts toward a reading of the presidency — its approval rating, and whether
 * it has been going around Congress — rather than snapping to it, because a
 * legislature's opinion of a president is a slow thing and a disposition that
 * tracked the polls exactly would be the polls under another name.
 */
const DISPOSITION_DRIFT = 0.04;

export function dispositionTarget(campaign: Campaign): number {
  const approval = campaign.player.metrics.approval;
  const unilateral = campaign.congress.unauthorized.length;
  // The third thing the room is looking at. It belongs in the target rather
  // than being charged once when a file opens, for the reason the unilateral
  // count does: the mood is recomputed every week from what the Hill can
  // currently see, so a one-off hit would wash out inside a month and an open
  // inquiry would end up costing an administration nothing. What is priced here
  // is the standing fact that the President is being investigated, and it stops
  // being priced the week that stops being true.
  const oversight = selectOversightPressure(campaign);
  // A court that has just said the President reached past the office
  // emboldens the chamber for a season; the term decays as the ruling ages.
  const struck = struckRecently(campaign);
  return clamp01(0.25 + approval * 0.55 - Math.min(0.3, unilateral * 0.06) - oversight * OVERSIGHT_MOOD_COST - Math.min(STRUCK_ORDER_MOOD_CAP, struck * STRUCK_ORDER_MOOD_COST));
}

/** How far one order struck down inside the season moves the room, and the most all of them can. */
export const STRUCK_ORDER_MOOD_COST = 0.05;
export const STRUCK_ORDER_MOOD_CAP = 0.15;
/** How long a ruling stays a fact the chamber reads; a struck order older than this has been priced. */
export const STRUCK_ORDER_SEASON_TURNS = 26;

function struckRecently(campaign: Campaign): number {
  // A ruling from the background docket narrows a doctrine in a case between
  // other parties; it says nothing about this President's own acts.
  return campaign.judiciary.cases.filter((entry) => entry.holding === "struck-down" && entry.subject?.kind !== "background-docket"
    && campaign.turn - entry.ruledTurn <= STRUCK_ORDER_SEASON_TURNS).length;
}

/**
 * How far being investigated can move the room on its own.
 *
 * Less than repeated unilateral force, and deliberately: an inquiry is a
 * question and going around Congress is an answer. It is enough that a
 * president under a reported inquiry is working with a materially colder
 * chamber, and not so much that an inquiry alone decides every vote.
 */
const OVERSIGHT_MOOD_COST = 0.2;

/**
 * Congress's own week: the mood settles, spent authorizations lapse, and the
 * appropriation runs out on schedule whether or not anybody has passed the next
 * one.
 */
export const congressPhase: TurnPhase = (state: Campaign) => {
  const congress = state.congress;
  const target = dispositionTarget(state);
  const drifted =
    Math.abs(target - congress.disposition) < DISPOSITION_DRIFT
      ? target
      : congress.disposition + Math.sign(target - congress.disposition) * DISPOSITION_DRIFT;

  const live = congress.authorizations.filter((authorization) => state.turn < authorization.expiresTurn);
  const lapsedAuthorizations = congress.authorizations.length - live.length;
  const expiredAppropriation = state.turn >= congress.appropriation.throughTurn;

  const next: Congress = {
    ...congress,
    disposition: round3(drifted),
    authorizations: live,
    appropriation: expiredAppropriation
      ? { ...congress.appropriation, onPriorYear: true }
      : congress.appropriation,
  };
  // The members settle after the room does, and against the room's new
  // reading rather than its old one: what an administration did this week
  // reaches the Speaker through the same account it reaches the floor by.
  // …and against what is actually on the floor, so a caucus whose platform is
  // for the bill in front of it moves toward an administration that is asking
  // for it. Absent a measure with a signature this is the drift it always was.
  const settled = leadershipDrift(congress.leadership, round3(drifted), state.people, congress, liveSignature(state));

  const effects: Effect[] = [{ kind: "congress", set: next }, ...settled];
  // Running the government on last year's numbers is not free: agencies plan
  // nothing, contracts run month to month, and everybody who works for the
  // state can read the news.
  if (next.appropriation.onPriorYear) effects.push({ kind: "metric", deltas: { stability: -0.004 } });

  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn + 1,
      narration: { summary: weekSummary(next, lapsedAuthorizations) },
      effects,
    },
  ] satisfies readonly EffectPacket[];
};

function weekSummary(congress: Congress, lapsed: number): string {
  if (lapsed > 0) {
    return `${lapsed === 1 ? "An authorization for the use of military force expires" : `${lapsed} authorizations for the use of military force expire`} on the Hill.`;
  }
  if (congress.appropriation.onPriorYear) {
    return "Congress has passed no budget, and the government runs another week on the prior year's appropriation.";
  }
  if (congress.appropriation.priorYear.length > 0) {
    const struck = sentenceList(
      congress.appropriation.priorYear.map((account) => BUDGET_ACCOUNT_SPECS[account].name.toLowerCase()),
    );
    return `The appropriation holds, but ${struck} spends another week at the rate the last Congress set.`;
  }
  return congress.disposition >= 0.55
    ? "Congress is working with the administration this week."
    : "The Hill is in no hurry to help the administration this week.";
}
