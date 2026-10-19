import { type NationId } from "@admin/world";
import { type Campaign, type Commitment, type CommitmentKind, type CommitmentSource, type CommitmentStatus, type CommitmentTarget } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
export type CommitmentDraft = {
    readonly kind: CommitmentKind;
    readonly actor: NationId;
    readonly target: CommitmentTarget;
    readonly resource: Commitment["resource"];
    readonly source: CommitmentSource;
    readonly review: Commitment["review"];
    readonly rationale: string;
    /** See `Commitment.addressedCondition` — left unset unless the caller can name it. */
    readonly addressedCondition?: Commitment["addressedCondition"];
};
export declare function commitmentId(draft: CommitmentDraft, turn: number): string;
/**
 * The id a draft opens under. The base id names kind, actor, target and turn,
 * which two different operations can share (an aid line and an arms line
 * to one nation in one week). A stored commitment under that id that is the
 * same operation keeps it, so resubmitting is idempotent; a different one
 * pushes this draft to the next free suffix, so neither overwrites the other.
 */
export declare function openingCommitmentId(campaign: Campaign, draft: CommitmentDraft): string;
/** Every commitment a nation is currently keeping. */
export declare function activeCommitments(campaign: Campaign, actor: NationId): readonly Commitment[];
/** Everything a nation has ever committed to, kept or abandoned. */
export declare function selectCommitments(campaign: Campaign, actor: NationId): readonly Commitment[];
/** What a nation has standing toward one particular country, war or body. */
export declare function commitmentsToward(campaign: Campaign, actor: NationId, targetId: string): readonly Commitment[];
export type CommitmentResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Open a commitment.
 *
 * Refused rather than silently trimmed when the forces it names are not there:
 * a deployment the order of battle cannot supply is a promise that would be
 * discovered as empty at exactly the moment it was called on, which is a worse
 * outcome than being told now.
 */
export declare function openCommitment(campaign: Campaign, draft: CommitmentDraft): CommitmentResult;
/**
 * Suspend, resume or wind down a commitment.
 *
 * Winding one down is a decision with a document rather than a slider, so the
 * caller states its reason and the packet narrates it — a country whose aid
 * was cut finds out that it was cut, and by whom.
 */
export declare function setCommitmentStatus(campaign: Campaign, id: string, status: CommitmentStatus, reason: string): CommitmentResult;
export declare function describeCommitment(commitment: Commitment, campaign?: Campaign): string;
/**
 * A week of everything the administration is carrying.
 *
 * One packet for all of them rather than one each: a president does not get a
 * separate bill for every promise, they get the week's total, and a ledger
 * with forty entries a week in it is a ledger nobody reads. What the packet
 * says is what a treasury statement says — the total, and how many promises it
 * is the total of.
 */
export declare const commitmentPhase: TurnPhase;
export declare function releaseWarCommitments(campaign: Campaign, conflictId: string, belligerents: readonly NationId[], reason: string): readonly Effect[];
/**
 * What one party that leaves a war takes home with it: the forces it
 * committed to that war. The President's country also releases the fighting
 * it committed against the side it was fighting, the rule a war's end holds
 * it to.
 */
export declare function releaseCommitmentsOf(campaign: Campaign, conflictId: string, nation: NationId, against: NationId, reason: string): readonly Effect[];
/** The forces a government commits to a war it has just joined, or nothing where every formation it names is spoken for. */
export declare function joinerCommitment(campaign: Campaign, nation: NationId, conflictId: string): Commitment | undefined;
/**
 * The commitment a government owes a war it joined and has not yet backed
 * with forces, when it acts against the side it is fighting. Nothing where it
 * is fighting no such war, or already has forces in it.
 */
export declare function joinedWarCommitment(campaign: Campaign, actor: NationId, target: NationId): readonly Effect[];
/** What the week of commitments costs, for a screen that has to preview it. */
export declare function commitmentWeeklyCost(campaign: Campaign): number;
