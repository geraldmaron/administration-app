import type { Nation, NationId, RoleId, PersonId } from "@admin/world";
import { type Campaign, type Chamber, type ChamberVote, type Congress, type ForceAuthorization, type AdministrationParty, type UsMajorParty } from "./state.js";
import { type OpeningSeats } from "./founding-congress.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RungLevel } from "./instruments.js";
import type { TurnPhase } from "./turn-loop.js";
export declare const CHAMBERS: readonly Chamber[];
export declare const CHAMBER_NAMES: Readonly<Record<Chamber, string>>;
/** A simple majority of a chamber — one more than half, always an integer. */
export declare function majorityOf(seats: number): number;
/** Two thirds, the bar an override and a treaty have to clear. */
export declare function supermajorityOf(seats: number): number;
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
export declare function clotureOf(seats: number): number;
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
export declare function floorThreshold(congress: Congress, chamber: Chamber, track: LegislativeTrack): number;
/**
 * The same two-week window the stopgap enters the agenda inside.
 *
 * The origination gate and the funding vote have to answer the same deadline or
 * the Hill would treat a lapse as due for purposes of taking a stopgap up and
 * not yet due for purposes of voting it, which is the same defect one stage
 * later.
 */
export declare function fundingContinuityDue(campaign: Campaign): boolean;
/**
 * What this charter calls the person in the chair, mid-sentence.
 *
 * Derived from the seat the campaign was founded on rather than written out,
 * because every sentence in this file is player-facing and "the President" is
 * true of exactly one charter. A charter that authors its own titles is served
 * by the same resolver wherever the caller has the record to hand.
 */
export declare const headOfGovernment: (campaign: Campaign) => string;
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
export declare function openingCongress(nation: Nation, turn: number, administrationParty: AdministrationParty, caucusAnchor: UsMajorParty, seats?: OpeningSeats): Congress;
/** Whether a measure carried in every chamber it had to. */
export declare function carried(votes: readonly ChamberVote[]): boolean;
/**
 * The rungs that are war rather than signaling.
 *
 * A blockade, a strike and an invasion are the introduction of forces into
 * hostilities; an exercise and a forward deployment are posture, reportable but
 * not the thing an authorization is for. A blockade of a state's ports is listed
 * as an act of aggression in General Assembly Resolution 3314, Article 3(c), and
 * a navy closing a coast by force is not posture.
 */
export declare const MAJOR_FORCE_RUNGS: readonly RungLevel[];
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
export declare const WAR_POWERS_WINDOW_TURNS: number;
export type WarPowersStanding = 
/** Not a use of force this applies to at all. */
{
    readonly kind: "not-applicable";
}
/** Covered by a standing authorization. */
 | {
    readonly kind: "authorized";
    readonly authorization: ForceAuthorization;
}
/** The president's own authority covers it, and Congress will hear about it. */
 | {
    readonly kind: "unilateral";
    readonly reason: string;
}
/** Past the office's own authority: Congress has to vote first. */
 | {
    readonly kind: "requires-authorization";
    readonly reason: string;
};
/**
 * Where a proposed use of force stands constitutionally.
 *
 * The three cases are genuinely different and a model that collapsed them would
 * be wrong in both directions: an authorized war is not a scandal, a first
 * unilateral strike is lawful and expensive, and a fourth one in a month is
 * neither.
 */
export declare function warPowersStanding(campaign: Campaign, target: NationId, rung: RungLevel): WarPowersStanding;
/** Whether the ladder should open this rung at all, for the president's own forces. */
export declare function forceIsPermitted(campaign: Campaign, target: NationId, rung: RungLevel): boolean;
/** What acting on the President's own authority costs, before anyone objects. */
export declare const UNILATERAL_FORCE_COST: {
    readonly standing: -0.03;
    readonly stability: -0.025;
};
export declare function recordUnilateralForce(campaign: Campaign, target: NationId, rung: RungLevel, description: string): readonly Effect[];
/** How long an authorization runs before it has to be voted again. */
export declare const AUTHORIZATION_TERM_TURNS = 52;
export type CongressResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
export type ConfirmationProjection = {
    readonly role: RoleId;
    readonly nominee: PersonId;
    readonly vote: ChamberVote;
    readonly wouldConfirm: boolean;
    readonly reasoning: string;
};
/** Confirmation runs through the Senate alone, and needs a simple majority. */
export declare function projectConfirmation(campaign: Campaign, role: RoleId, nominee: PersonId): ConfirmationProjection;
export declare function dispositionTarget(campaign: Campaign): number;
/** How far one order struck down inside the season moves the room, and the most all of them can. */
export declare const STRUCK_ORDER_MOOD_COST = 0.05;
export declare const STRUCK_ORDER_MOOD_CAP = 0.15;
/** How long a ruling stays a fact the chamber reads; a struck order older than this has been priced. */
export declare const STRUCK_ORDER_SEASON_TURNS = 26;
/**
 * Congress's own week: the mood settles, spent authorizations lapse, and the
 * appropriation runs out on schedule whether or not anybody has passed the next
 * one.
 */
export declare const congressPhase: TurnPhase;
