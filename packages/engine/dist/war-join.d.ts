import { type NationId, type OrgId } from "@admin/world";
import { type Campaign, type Conflict, type ConflictSide, type NationRuntime } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { type Term, type TermKey, type Willingness, type WillingnessForecast } from "./willingness.js";
/**
 * The bar a government's willingness must clear to send forces, and the bar a
 * called ally is held to. One bar for both: a call raises what the ally owes
 * rather than lowering what fighting takes. Named inputs, so a rule that makes
 * allies rally can lower them within its bound and the stamp records the bar
 * that was used. From the centered sketch, where this bar gave ten to thirteen
 * joiners of Estonia across twelve seeds (planning value, pending the battery).
 */
export declare const JOIN_THRESHOLD = 1.087;
export declare const CALL_THRESHOLD = 1.087;
/** Below the bar for forces and above this one, a government would send help short of fighting (planning value). */
export declare const JOIN_AID_THRESHOLD = 0.6;
/** How far the persistent noise can move a decision. Inside it, a forecast says "a close call". */
export declare const JOIN_NOISE = 0.05;
type JoinQuestion = "join-war" | "answer-call";
/** One government's standing question about one side of one war, with the terms it would weigh. */
export type JoinReading = {
    readonly nation: NationId;
    readonly side: ConflictSide;
    readonly question: JoinQuestion;
    /** The government its ties are read against: the side's principal, or the United States when it has called. */
    readonly partner: NationId;
    /** The body the United States called, when this is an answer to one. */
    readonly calledBody?: OrgId;
    readonly obligation: number;
    readonly terms: readonly Term[];
    readonly threshold: number;
};
/**
 * A government in danger at home keeps its army there: the agent's survival
 * drive, where it has turned against the regime (an insecure government whose
 * elite is split). Restated rather than imported, because `governance.ts`
 * reads the policy table when it loads and the war modules load inside that
 * cycle; the paired test pins the two readings equal for every government.
 */
export declare function regimeDanger(runtime: NationRuntime): number;
/**
 * The standing question one government has about one side of a war, or
 * nothing where it has no question to answer: the President's own country, a
 * party already, a government that has left this war, or one with no dealings
 * at all with the side it would be fighting beside.
 */
export declare function joinReading(campaign: Campaign, conflict: Conflict, nation: NationId, side: ConflictSide): JoinReading | undefined;
/** The decision, with the one persistent draw a standing question is allowed. */
export declare function weighJoin(reading: JoinReading, conflict: Conflict, streams: RngStreams): Willingness;
/**
 * The graded answer. Forces at the bar; help short of fighting between the
 * aid bar and it, which a government's own turn acts on through its
 * assistance branch; below both, it stays out. The stamp of a government that
 * would send aid records that it did not send forces.
 */
export declare function joinGrade(willingness: Willingness): "forces" | "aid" | "stayed-out";
/** One government's answer this week, with the reading it weighed and whether it went in. */
export type JoinDecision = {
    readonly reading: JoinReading;
    readonly willingness: Willingness;
    readonly joins: boolean;
};
/** Every government's answer about this war this week, in a stable order. */
export declare function weekOfJoins(campaign: Campaign, conflict: Conflict, streams: RngStreams): readonly JoinDecision[];
export declare function allyJoinEffects(campaign: Campaign, conflict: Conflict, streams: RngStreams): {
    effects: Effect[];
    joined: Record<ConflictSide, NationId[]>;
    beats: string[];
};
/**
 * The reasons of record for this week's decisions about one war: every join,
 * every refusal of a call the United States made, and at most three
 * governments named for staying out, each written once. The state a join
 * changes rides the war's own week; this is its reason, recorded beside it
 * the way a governor's answer is recorded beside the federal act it allowed.
 *
 * Read against the board the war's week is fought on, so the two cannot
 * disagree about who came in.
 */
export declare function joinDecisionPackets(campaign: Campaign, conflict: Conflict, streams: RngStreams): readonly EffectPacket[];
/** A government the projection expects to come in on one side, and the terms that would bring it. */
export type LikelyJoiner = {
    readonly nation: NationId;
    readonly side: ConflictSide;
    readonly forecast: WillingnessForecast;
    readonly leading: readonly TermKey[];
};
/**
 * Who is likely to join one side of a war the board may not carry yet: an
 * aggressor weighing an attack reads this about the war it would start.
 * Likely and close calls both, because a close call is exactly the government
 * an attacker cannot count on staying out.
 */
export declare function likelyJoinersOf(campaign: Campaign, conflict: Conflict, side: ConflictSide): readonly LikelyJoiner[];
/**
 * Who is likely to join one side of a war on the board, forecast without a
 * draw, as the President's services can read it. The forecast weighs a
 * government's temperament, so a government they cannot read is left off
 * rather than forecast from what nobody in Washington knows. The aggressor's
 * own reckoning (`alliedDeterrence`) reads the unfogged list.
 */
export declare function projectLikelyJoiners(campaign: Campaign, conflictId: string, side: ConflictSide): readonly LikelyJoiner[];
/** How each member of a body the United States could call would answer, read before the call is made. */
export declare function projectCallAnswers(campaign: Campaign, org: OrgId, conflictId: string): readonly LikelyJoiner[];
/**
 * What the victim's likely allies put in an attacker's way: who they are, and
 * their share of the strength the attacker would face beside its own. Read
 * for a war that has not started, so an alliance deters by the governments it
 * would actually bring rather than by the paper.
 */
export declare function alliedDeterrence(campaign: Campaign, hypothetical: Conflict): {
    readonly expectedJoiners: readonly NationId[];
    readonly alliedSeverity: number;
    readonly line?: string;
};
/** How one government's decision about a war would have gone, set beside its peers'. */
export type JoinCounterfactual = {
    readonly nation: NationId;
    readonly side: ConflictSide;
    readonly margin: number;
};
/**
 * The peer-relative counterfactual: the same government in the same seat
 * with a typical government's character, which puts its character terms at
 * the world's middle and so at zero. A joiner whose counterfactual falls short
 * came in by character; a non-joiner whose counterfactual clears stayed out
 * by it. The noise is left out, as a projection's is.
 */
export declare function joinCounterfactual(campaign: Campaign, conflictId: string, nation: NationId): JoinCounterfactual | undefined;
export {};
