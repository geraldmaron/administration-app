import type { Person } from "@admin/world";
import type { Campaign, GameDate, OpponentState, UsMajorParty } from "./state.js";
/** The seats the other party's nominee comes from: statehouses and the Hill's senior members. */
export declare const OPPONENT_BENCH_ROLES: readonly string[];
/**
 * The most the matchup can be worth, either way, in share of the vote.
 *
 * Three points: the spread between a strong and a weak nominee in a modern
 * American contest is a few points, not ten. A planning value, labeled as
 * such, and the one dial the seeded margin has.
 */
export declare const MARGIN_BOUND = 0.03;
/** The party the President runs against: the other major, and for an Independent the one farther away. */
export declare function opposingParty(campaign: Campaign): UsMajorParty;
/** Everyone the other party could nominate, strongest first. */
export declare function opponentBench(campaign: Campaign): readonly Person[];
/**
 * The nominee the seed draws from the bench, and the margin they are worth.
 * Undefined with no bench. Each of the strongest few holds a draw keyed by
 * their own id and the highest takes it, so a reshuffle of the field's order,
 * or someone else in it leaving, never renames the nominee.
 */
export declare function drawOpponent(campaign: Campaign): OpponentState | undefined;
/**
 * The opponent the contest has named: the one frozen at the seal, or for a
 * save sealed before the seal named one, the one its seed draws.
 */
export declare function selectOpponent(campaign: Campaign): OpponentState | undefined;
/** The other party's candidate, drawn once at the seal so a later change to the bench cannot rename them. */
export declare function withNamedOpponent(campaign: Campaign): Campaign;
/** Whether the President still has a contest ahead: none has been filed on the term clock. */
export declare function contestAhead(campaign: Campaign): boolean;
/** The day the President's own contest falls on: the first presidential Election Day of the presidency. */
export declare function contestDay(campaign: Campaign): GameDate;
/**
 * How much of the matchup the country knows by `date`, 0..1.
 *
 * Squared rather than straight: for the first two years of a term the other
 * party has a bench and no nominee, and the candidate is defined in the
 * election year itself, which is when the band should close fastest.
 */
export declare function matchupKnown(campaign: Campaign, date?: GameDate): number;
/** The part of the matchup the count already carries, in share of the vote. Zero once no contest is ahead. */
export declare function opponentShift(campaign: Campaign): number;
/**
 * How far either side of the projection the night can still land, from the
 * part of the matchup nobody knows yet. A bound, not a spread: whatever the
 * candidate turns out to be worth sits inside it. A fact about the calendar,
 * so a reader drawing it over many dates asks for the opponent once, not here.
 */
export declare function marginHalfWidth(campaign: Campaign, date?: GameDate): number;
/**
 * Who acts as President when the House never finds a majority of the states.
 * The House keeps balloting until the inauguration, and delegations that did
 * not move on the first ballot are read as not moving on the last. Then the
 * Vice President-elect acts (Twentieth Amendment, section 3), chosen by the
 * Senate from the two tickets' running mates by a majority of the whole
 * number (Twelfth Amendment); with no such majority either, the Speaker acts
 * under the succession statute (3 U.S.C. §19).
 */
export type ContingentActing = "administration-running-mate" | "opponent-running-mate" | "speaker";
export type ContingentVote = {
    /** State delegations whose majority sits with the administration. */
    readonly forAdministration: number;
    readonly forOpponent: number;
    /** Delegations split evenly, which cast no vote. */
    readonly divided: number;
    /** A majority of the states. */
    readonly needed: number;
    readonly won: boolean;
    /** Neither side reached a majority of the states on any ballot before the inauguration. */
    readonly deadlocked: boolean;
    /** Who acts as President after a deadlock; absent when the House chose. */
    readonly acting?: ContingentActing;
};
/**
 * When the Electoral College ties, the House chooses, one vote a state.
 *
 * Read off the delegations the campaign holds on the night. Each state votes as
 * the majority of its House members does; an even delegation casts nothing,
 * and the District, which has no voting member, has no say. A President who
 * cannot find a majority of the states does not keep the office, and a House
 * that finds nobody hands the chair to whoever the deadlock rule seats.
 */
export declare function contingentHouseVote(campaign: Campaign): ContingentVote;
