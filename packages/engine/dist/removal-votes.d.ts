import type { Charter } from "@admin/world";
import { type CaucusVote } from "./congress-votes.js";
import type { Campaign } from "./state.js";
export { CAUCUS_BREAK_CEILING } from "./electorate.js";
/**
 * Beyond a reading, what the last two beats of an impeachment actually take.
 *
 * Pressure decides when the question is put; it does not decide the answer. A
 * president is impeached when a majority of the House votes the articles and
 * removed when two thirds of the Senate convicts. So the ladder stops being the
 * whole mechanism and becomes what it is in the fiction: the point at which
 * somebody has to be counted.
 *
 * Both are counted by caucus from the chambers as they are seated, because
 * that is what has decided every real trial. The Senate has never convicted a
 * President: the 1868 trial acquitted by one vote, and the three since
 * acquitted with the President's own party holding. A count that spread the
 * room's mood across every seat convicted a President whose party held more
 * than a third of the Senate the moment the room soured enough, which no
 * Senate has done.
 *
 * Nothing here is stored. The counts are projected from the Congress as it
 * stands whenever they are read, which is what lets a president whip against
 * them: seating a chamber leadership, spending disposition, or losing a
 * midterm moves the count the same week.
 *
 * Only impeachment is counted. A coup, a clerical council and an electoral
 * defeat do not go through a chamber, and a charter whose institutions never
 * hold this vote must not be gated on one it cannot hold.
 */
export type RemovalVoteStep = "articles" | "conviction";
/**
 * Whether the President's own caucus is breaking on this count, and the two
 * facts that decide it, so a screen can say which one is holding them.
 */
export type CaucusBreak = {
    /** The reading has reached the ladder's last rung: removal-grade conduct, not a bad season. */
    readonly grave: boolean;
    /** The President's own identifiers' approval this week: what their caucus reads. */
    readonly approval: number;
    /** The President's own side has given up far enough that a grave charge would cost members. */
    readonly collapsed: boolean;
    /** The share of the President's caucus voting yea: zero unless the charge is grave. */
    readonly breaking: number;
};
/**
 * The President's caucus on one count: their party's seats and the
 * independents who sit with it.
 */
export type CaucusWhip = {
    readonly seats: number;
    /** How many of them vote yea this week. */
    readonly yeas: number;
    /** How many of them the count needs to carry; zero when the other side carries it alone. */
    readonly mustBreak: number;
};
export type RemovalVote = {
    /** The beat of the ladder this count decides: 1 articles, 2 conviction. */
    readonly beat: number;
    readonly step: RemovalVoteStep;
    readonly question: string;
    readonly vote: CaucusVote;
    readonly caucus: CaucusWhip;
    readonly caucusBreak: CaucusBreak;
};
/**
 * When the President's own caucus votes to remove them: only when the charge is
 * grave, and then in proportion to how far the President's own identifiers have
 * given up (`electorate.ts#caucusBreakShare`). A member reads their own voters,
 * not the country: at a 30 percent headline an honest failing President still
 * holds about 78 percent of their identifiers, so a quarter of the caucus is
 * gone if a grave charge arrives, and none of it without one.
 *
 * `collapsed` says whether the break is under way at all: more than a twentieth
 * of the caucus, about two senators in fifty.
 */
export declare const CAUCUS_BREAK_VISIBLE = 0.05;
export declare function caucusBreakAt(campaign: Campaign, pressure: number, removalRung: number): CaucusBreak;
/**
 * Both counts at a given reading. `rungs` is the ladder: each count's case is
 * measured from its own rung, and the charge is grave at the last one.
 */
export declare function countRemovalVotes(state: Campaign, charter: Charter, pressure: number, rungs: readonly number[]): readonly RemovalVote[];
/**
 * One count, in a sentence: what the chamber has, against what it needs, and,
 * while it is short on the President's own side, how many of them it needs.
 */
export declare function removalVoteLine(vote: RemovalVote): string;
