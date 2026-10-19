import { type Bill, type Campaign, type ChamberVote } from "./state.js";
import type { EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
import { type ConstitutionalGround, type LawConstraint, type LegislativeAct } from "./legislative-acts.js";
/**
 * Everything the acts currently in force put out of the president's reach.
 *
 * Merged in one place so that no caller has to walk the record itself: a
 * constraint the orders screen enforced and the ladder did not would be a law
 * that binds only where somebody remembered it.
 */
export declare function lawConstraints(campaign: Campaign): LawConstraint;
/** A final Supreme Court construction narrows only this enacted bill's named grant. */
export declare function statutoryAuthorityLimited(campaign: Campaign, billId: string, orderId: string): boolean;
/** Whether statute has taken away the office's own war-making latitude. */
export declare function lawsBarUnilateralForce(campaign: Campaign): boolean;
/** Whether statute forbids one particular executive order outright. */
export declare function lawBlocksOrder(campaign: Campaign, orderId: string): Bill | undefined;
/** The act of Congress that puts the legislature behind one order, if one has passed. */
export declare function lawAuthorizesOrder(campaign: Campaign, orderId: string): Bill | undefined;
/**
 * Which of the three grounds an order stands on this week.
 *
 * A prohibition governs an authorization rather than cancelling out with it:
 * Congress saying no is the later and more specific word, and an order named by
 * both is one the legislature has taken back. There is no fourth answer — an
 * order nobody has legislated about is standing in the silence, which is where
 * almost every order stands and is a real position rather than a missing one.
 */
export declare function constitutionalGround(campaign: Campaign, orderId: string): ConstitutionalGround;
/**
 * What Congress could take up this week, given the country it is looking at.
 *
 * An act is off the agenda while a bill for it is in progress or on the desk,
 * and after it is law — permanently, unless the act declares itself a recurring
 * one, in which case the calendar reopens it.
 */
export declare function billsOnTheAgenda(campaign: Campaign): readonly LegislativeAct[];
/**
 * The two-thirds count on passing a vetoed bill over the President's objection.
 *
 * Counted through `countVoteAgainst` rather than `countVote`, whose yeas are
 * members voting *with* the President: counting an override that way makes the
 * friendlier chamber the likelier one to overrule him and a genuinely hostile
 * Congress incapable of it, so an override would never carry in natural play.
 * Removal answers to the same arithmetic, from the same function, for the same
 * reason.
 */
export declare function projectOverride(campaign: Campaign, bill: Bill): readonly ChamberVote[];
/** Whether an override would carry, for a screen that has to show the margin. */
export declare function overrideWouldCarry(campaign: Campaign, bill: Bill): boolean;
export type LegislationResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function signBill(campaign: Campaign, id: string): LegislationResult;
/**
 * Return it, with a message.
 *
 * The veto message is required rather than optional: a veto is a signed
 * document in the American system, and the record of a presidency that refused
 * six bills without ever saying why would be a record of nothing.
 */
export declare function vetoBill(campaign: Campaign, id: string, message: string): LegislationResult;
/**
 * What sending the administration's own bill up costs on the Hill.
 *
 * Floor time is the scarcest thing a chamber has, and a president who takes it
 * has spent something whether or not the bill carries. This is the price of the
 * asking; the price of losing is below.
 */
export declare const TRANSMISSION_DISPOSITION_COST = 0.03;
/**
 * The acts the President could send up this week.
 *
 * Congress's own agenda, narrowed to the bills this administration wrote. An
 * act nobody in the administration sponsored is not the President's to
 * transmit — a president may lobby for the opposition's bill and may sign it,
 * but they cannot introduce it.
 *
 * And narrowed again to the bills this administration would have written, which
 * is the half that was missing: every president was offered every
 * administration bill in the catalogue, so a Republican could transmit the
 * revenue bill written for the other party's platform and a president who ran on
 * nothing could transmit a plank they never stood on.
 */
export declare function transmittableActs(campaign: Campaign): readonly LegislativeAct[];
/**
 * Whether this administration could have written this bill: the platform it
 * sealed carries the plank the act enacts, and its own party would have run on
 * that plank in the first place.
 *
 * Both halves are about the plank rather than about the act's industries. A
 * measure with no plank is nobody's program — a debt ceiling, a stopgap, an
 * authorization — and any administration may send it up. A measure that enacts
 * one is the promise a president stood on, and it is not transmittable by a
 * president who stood on something else, whatever the chamber thinks of it.
 *
 * The party half is the plank's own program read against the party's platform:
 * not how much they like it, but whether it points their way at all. A
 * Republican who somehow carried a redistribution plank still cannot send up the
 * bill that enacts it, because the program it puts in force is the other side's.
 */
export declare function administrationWouldWrite(campaign: Campaign, act: LegislativeAct): boolean;
/**
 * Send an administration bill to the Hill now, rather than waiting for Congress
 * to reach it.
 *
 * This was the largest hole in the legislative model: every bill in the game
 * arrived because `originate` drew it, so a president had opinions about
 * legislation and no way to act on one. The office's actual power here is
 * narrow and real — the administration writes a bill, transmits it, and spends
 * capital getting it to the floor. It does not get to decide the count.
 *
 * What it buys is a place on the calendar, not a result. The bill enters the
 * chambers at referral exactly as an originated one does and takes its chances
 * through markup and the floor from there — the President's own bill is not a
 * measure Congress passes on the day it is asked to. The count the screen shows
 * is `projectPassage`, which is the count the floor stage will actually run; the
 * weeks in between are what can move it.
 */
export declare function transmit(campaign: Campaign, actId: string): LegislationResult;
/**
 * Congress legislating, and answering a veto.
 *
 * Origination is on a cadence rather than every week, because a chamber that
 * put a bill on the desk every seven days would make the signing ceremony the
 * thing a player does instead of the thing they occasionally have to. The draw
 * that picks which act is seeded on the campaign and the turn, so a replay
 * legislates identically.
 */
export declare const legislationPhase: TurnPhase;
/** Congress's own hopper stops one short of the cap unless an administration bill already holds a slot. */
export declare function originationBlocked(bills: readonly Bill[], cleared?: readonly string[]): boolean;
