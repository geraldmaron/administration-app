import { type NationId, type NationTraits } from "@admin/world";
import { type Campaign } from "./state.js";
import type { RngStreams } from "./rng.js";
import { type ActionProjection, type ResolutionRequest } from "./resolution.js";
import { type RedLineCrossing } from "./red-lines.js";
import { type DecisionStamp, type Term } from "./willingness.js";
import { type EngagementRequest } from "./engagement.js";
import { type ResponseIntent } from "./npc-response.js";
export type NpcScoreTerms = {
    readonly agendaFit: number;
    readonly intentMatch: number;
    readonly opportunity: number;
    readonly escalationFit: number;
    readonly restraint: number;
    readonly affordability: number;
    readonly propensity: number;
    readonly focus: number;
    readonly salience: number;
    readonly redLine: number;
    readonly survival: number;
    readonly response: number;
    readonly jitter: number;
};
export type NpcCandidate = {
    readonly request: ResolutionRequest;
    readonly rungName: string;
    readonly projection: ActionProjection;
    readonly score: number;
    readonly terms: NpcScoreTerms;
    /**
     * The declared line this move would be answering, where it is answering one.
     * Carried on the candidate rather than re-derived by the caller so that the
     * sentence the world reads names the same promise the score was raised by.
     */
    readonly answering?: RedLineCrossing;
    /** The act this move answers, where its score was raised by one: what the bulletin names it as answering. */
    readonly responding?: ResponseIntent;
};
export type NpcRejection = {
    readonly request: ResolutionRequest;
    readonly reason: string;
    readonly missingCapability: string;
};
export type NpcDecision = {
    readonly actor: NationId;
    readonly turn: number;
    readonly chosen?: NpcCandidate;
    readonly ranked: readonly NpcCandidate[];
    readonly rejected: readonly NpcRejection[];
    readonly holdReason?: string;
    /** The engagement that outscored every coercive move, where one did. Exclusive with `chosen`. */
    readonly engaged?: NpcEngagementCandidate;
};
export declare function scoreOf(terms: NpcScoreTerms): number;
export type NpcDecisionOptions = {
    readonly targets?: readonly NationId[];
};
/**
 * What the President's own position does to the price of a move against them:
 * a government fighting for its survival at home is a cheaper target, and one
 * other capitals deal with on good terms is a dearer one. Centered so a
 * presidency at middling standing and under no pressure prices nothing.
 */
export declare function presidencyExposure(campaign: Campaign): number;
/** The whole price a government puts on a move against the President: the record's reading and the presidency's own position. */
export declare function playerTargetMeasure(campaign: Campaign, actorTraits: NationTraits): number;
export type NpcEngagementCandidate = {
    readonly request: EngagementRequest;
    readonly score: number;
    readonly terms: NpcScoreTerms;
};
export declare function decideNpcAction(campaign: Campaign, actor: NationId, streams: RngStreams, options?: NpcDecisionOptions): NpcDecision;
/**
 * The agent's terms as the decision model's weighted terms, in the order the
 * agent declares them. `scale` is the pricing a government applies to a move
 * against the President it has watched concede, which multiplies the whole
 * score and so multiplies every term's share of it.
 */
export declare function toTerms(terms: NpcScoreTerms, scale?: number): readonly Term[];
/**
 * The reason of record for the move a government chose: its weighted terms
 * against the line below which it would have held. Recomputed from what the
 * decision already holds and draws nothing, so stamping a move cannot change
 * which move was made. An intelligence read whatever the act was, because why a
 * foreign government did something is its own counsel even when the act is not.
 */
export declare function npcActStamp(campaign: Campaign, decision: NpcDecision): DecisionStamp | undefined;
/**
 * The reason of record for an engagement a government chose over every
 * coercive move: the same terms at the weight the argmax gave them. The other
 * side's decision to receive it is stamped by the engagement itself.
 */
export declare function npcEngagementStamp(decision: NpcDecision): DecisionStamp | undefined;
export declare function explainNpcDecision(decision: NpcDecision): string;
