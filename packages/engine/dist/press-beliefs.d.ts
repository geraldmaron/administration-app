import { type IdeologyVector } from "@admin/world";
import type { AlignmentVector, Campaign } from "./state.js";
/**
 * Where the pull comes from.
 *
 * Two sources, both already on the campaign.
 *
 * The catalogue is the first: `ExecutiveOrder.alignment` is authored beside the
 * order and is what `signOrder` accumulates into `player.alignments`. It was
 * once the only one, and that left the desks reading a seven-entry catalogue
 * while the presidency spent its term answering the scenarios that are the
 * game's actual week — an administration could sign nothing and be read as
 * having done nothing.
 *
 * The second is the ledger. Every decision the President takes is stamped
 * there with its week and its causal origin, and two of the things it records
 * are alignment-bearing on their face: which instrument was reached for, and
 * what the act spent of the government's own standing (`institutional`). Both
 * are catalogued or authored facts, never prose — see `decisionPull` for what
 * each is read as and what is deliberately left unread.
 */
export type ActPull = {
    /** Per-axis sum of what the window's acts said, each axis clamped to −1..1. */
    readonly pull: Partial<AlignmentVector>;
    /**
     * The most recent act that said anything, for a surface that has to name it.
     *
     * `kind` travels with it because the two do not go into a sentence the same
     * way: an order has a catalogue name a screen can drop into a clause, and a
     * decision's name is the sentence it is remembered by. A surface that phrased
     * both the same way would print a full stop in the middle of its own line.
     */
    readonly act?: {
        readonly name: string;
        readonly turn: number;
        readonly kind: PresidentialAct["kind"];
    };
};
/**
 * How far back a newsroom's argument with an administration runs.
 *
 * Sixteen weeks: long enough that a term's worth of orders is not read off the
 * last one signed, short enough that a paper is arguing with this month's
 * government rather than with the one that took office.
 */
export declare const PRESS_ACT_MEMORY_TURNS = 16;
/**
 * How far a desk's own reading of the substance can carry it off the shared
 * record. Larger than nothing and smaller than LEAN_WEIGHT (0.35): what a paper
 * was before this president still outweighs any one season of orders, but a
 * government that spends a term signing things one masthead hates is covered
 * accordingly.
 */
export declare const PRESS_BELIEF_WEIGHT = 0.4;
/**
 * How far a single decision can carry a masthead's reading, against an order's
 * authored alignment (0.1 to 0.35 across the catalogue).
 *
 * Smaller than the smallest order on purpose. A signature is a government
 * committing itself in writing; answering the week is what a government does
 * every week, and a term of consistent answers should add up to an argument
 * without any one of them reading as an executive order.
 */
export declare const DECISION_ACT_WEIGHT = 0.08;
/**
 * One thing this administration did, as a desk would file it.
 *
 * `kind` is kept because the two are not the same act to a newsroom: an order
 * is a government committing itself in writing and a decision is a government
 * answering the week, and a surface that names the most recent one should be
 * able to say which it is looking at.
 */
export type PresidentialAct = {
    readonly turn: number;
    /** What the country would call it: the order's name, or the sentence the decision is remembered by. */
    readonly name: string;
    readonly kind: "order" | "decision";
    readonly pull: Partial<AlignmentVector>;
};
/**
 * Everything this administration has done inside the press's memory, oldest
 * first, whether or not it said anything a masthead can read.
 *
 * Exported whole because the podium and the Desk's own wire need the record
 * itself rather than the fold of it — a president explaining the week has to
 * name the act, and an act with no alignment is still an act they took.
 */
export declare function presidentialActs(campaign: Campaign): readonly PresidentialAct[];
/**
 * What this administration has been doing, in the space the outlets think in.
 *
 * Struck-down orders still count: the paper is reading what the government
 * tried to do, and a court undoing it is separately one of the six shared
 * drivers. Counting it twice in the same direction is the only way to get this
 * wrong, and the two terms are about different things.
 */
export declare function recentActPull(campaign: Campaign): ActPull;
/**
 * How one masthead reads that pull. Signed: positive is "this is what we are
 * for", negative is "this is the thing we were founded to be against".
 *
 * The same fold `partyReading` uses, divided by the axis count for the reason
 * `alignmentAffinity` divides by its shared-axis count: it keeps the result in
 * −1..1 without a clamp ever having to bite, which is what lets the four
 * readings still sum to zero across the roster.
 */
export declare function outletReading(beliefs: IdeologyVector, pull: Partial<AlignmentVector>): number;
/** The same reading, rounded, for anything that prints or stores it. */
export declare function outletActReading(beliefs: IdeologyVector, pull: Partial<AlignmentVector>): number;
