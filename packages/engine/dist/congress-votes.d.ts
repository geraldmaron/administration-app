import type { DomesticSignature } from "./domestic-signature.js";
import { type CaucusReadings } from "./caucus-count.js";
import type { Campaign, CaucusTally, Chamber, ChamberVote, Congress, HillCaucus, UsMajorParty, VoteCaucus } from "./state.js";
/** Most of the other side votes to keep the lights on, however they feel about the President. */
export declare const KEEP_GOVERNMENT_OPEN_FLOOR = 0.61;
export declare const KEEP_GOVERNMENT_OPEN_OPPOSITION = 0.55;
/**
 * Which side of the aisle a chamber's independents vote with.
 *
 * The one convention `majorityCaucus` and the committee panels already count
 * by: every independent senator of the last two decades has caucused with the
 * Democrats, so they sit with the administration under a Democrat-anchored
 * presidency and across the aisle under a Republican-anchored one.
 */
export declare function independentsSitWith(caucusAnchor: UsMajorParty): HillCaucus;
/** A count that was tallied by bloc, so its tallies are always there to read. */
export type CaucusVote = ChamberVote & {
    readonly byCaucus: Readonly<Record<VoteCaucus, CaucusTally>>;
};
/** Whose measure this is, which is what decides which caucus is whipped for it. */
export type VoteStance = "administration" | "opposition" | "neutral";
/**
 * Which end the question is counted from.
 *
 * `with`: the yeas are members voting with the President's ask. `against`: the
 * yeas are members voting to bind or to remove him — a veto override, a
 * resolution of disapproval, the articles — which `with` cannot answer, because
 * counting an override as a vote with the President makes the friendliest
 * chamber the likeliest to overrule him.
 */
export type VoteFrame = "with" | "against";
/** A question put to one chamber. */
export type VoteQuestion = {
    readonly signature?: DomesticSignature;
    readonly actId?: string;
    readonly asOf?: Campaign["calendar"];
    readonly chamber: Chamber;
    /** The measure's appeal on the floor, on the scale the count already reads. */
    readonly appeal: number;
    /**
     * What the question is worth to each member on its own terms, added to their
     * support after the caucus position rather than folded into the room. A
     * nominee's record is this: the room plus the Senate's deference already
     * reaches its ceiling for most nominees early in a term, and a record added
     * there was clipped away, so every capable nominee counted the same.
     */
    readonly merit?: number;
    /** The count it has to reach. */
    readonly required: number;
    /**
     * Whose question it is: a measure the administration is asking for, one the
     * opposition is, or one that belongs to neither. Read in the `with` frame,
     * where it decides which caucus is whipped for the bill and which has to be
     * carried. A question counted `against` the President is answered by whether
     * members will bind him, and who introduced it is the least of it, so the
     * stance is not read there.
     */
    readonly stance: VoteStance;
    readonly counted?: VoteFrame;
    /** Per-caucus readings of the act's own signature, where the caller has them. */
    readonly readings?: CaucusReadings;
    /**
     * A floor under the room's support. One question has one: a clean stopgap,
     * where members answer to the government staying open rather than to how much
     * they like the President who signed nothing else.
     */
    readonly floor?: number;
    /** An explicit share for the other side, where the question decides it rather than the room. */
    readonly oppositionShare?: number;
    /**
     * `against` only: how far the President's own caucus will go with the other
     * side on this particular question. The default is the override band.
     */
    readonly defection?: number;
    /**
     * `against` only, and the mark of a question about the President himself
     * rather than about a measure: the share of his own caucus the caller has
     * decided breaks, and independents voting with the caucus they sit with
     * instead of with the room. Zero unless its condition holds.
     */
    readonly administrationBreak?: number;
};
/**
 * Take one chamber's count on a question, through the one counter.
 *
 * Every count in the game comes out of here, and comes out tallied by bloc: a
 * screen that has to say how many of the President's own members would have to
 * break can always read it, and a count that could not say so was the reason
 * the removal arc needed a counter of its own.
 */
export declare function voteOn(campaign: Campaign, question: VoteQuestion): CaucusVote;
/** Ordinary legislative business has a debate gate and a distinct majority decision. */
export declare function legislativeVoteOn(campaign: Campaign, question: VoteQuestion): CaucusVote;
/** A floor vote on a measure, counted rather than decided. */
export declare function countVote(congress: Congress, chamber: Chamber, appeal: number, required: number, states?: Campaign["states"], readings?: CaucusReadings, stance?: VoteStance, people?: Campaign["people"]): CaucusVote;
/**
 * A clean stopgap is the one vote where members answer to the government
 * staying open, not to how much they like the President who signed nothing else.
 *
 * The floor and the other side's share together are what keep a sixty-vote
 * stopgap from being a shutdown with no way out of it: at any disposition the
 * chamber can hold, a clean continuing resolution clears sixty in the Senate.
 * The minority leader is the counterparty on this one measure, and this is what
 * that means arithmetically.
 */
export declare function countFundingContinuityVote(congress: Congress, chamber: Chamber, appeal: number, required: number, states?: Campaign["states"], people?: Campaign["people"]): CaucusVote;
/** A veto override, or any question whose yeas are members voting to bind the President. */
export declare function countVoteAgainst(congress: Congress, chamber: Chamber, appeal: number, required: number, states?: Campaign["states"], defection?: number, people?: Campaign["people"]): CaucusVote;
/** A question about the President himself, counted bloc by bloc. */
export declare function countVoteAgainstByCaucus(congress: Congress, chamber: Chamber, appeal: number, required: number, states: Campaign["states"] | undefined, administrationBreak: number, people?: Campaign["people"]): CaucusVote;
