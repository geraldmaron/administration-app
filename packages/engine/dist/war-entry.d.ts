import type { Nation, NationId } from "@admin/world";
import { type Campaign, type Conflict, type ConflictSide, type NationRuntime } from "./state.js";
import type { EffectPacket } from "./effects.js";
import { type DeterrenceAssessment } from "./conflicts.js";
import { type WarPowersStanding } from "./congress.js";
export type JoinOption = {
    readonly conflict: Conflict;
    readonly side: ConflictSide;
    /** The principal being joined. */
    readonly alongside: NationId;
    /** The principal on the other side, who will read this as an act of war. */
    readonly against: NationId;
};
export type JoinConflictResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
    readonly missingCapability?: string;
};
/**
 * Whether this nation could bring anything to this side of this war. Reach is
 * read exactly the way the weekly tick reads it, so a nation that would
 * contribute nothing to `sideStrength` cannot join and then contribute nothing.
 */
export declare function joinCapability(campaign: Campaign, joiner: NationId, conflict: Conflict): JoinCheck;
type JoinCheck = {
    readonly ok: boolean;
    readonly missingCapability?: string;
};
/**
 * Every war this nation could enter, and on which side. The surface reads this
 * rather than filtering conflicts itself, so what a screen offers and what
 * `joinConflict` accepts are the same rule and cannot drift. The one refusal
 * left out is the statute's: a war the office's own authority does not reach
 * is still offered, and `projectJoin` names the missing vote before the
 * button, because hiding the war would hide the reason.
 */
export declare function selectJoinableConflicts(campaign: Campaign, joiner: NationId): readonly JoinOption[];
export type JoinCost = {
    readonly standing: number;
    readonly militaryReadiness: number;
    readonly stability: number;
};
/** The multiple of the base price a join into this war costs this joiner. */
export declare function joinPriceScale(campaign: Campaign, joiner: NationId, conflict: Conflict, side: ConflictSide): number;
/**
 * What entering costs the President, stated before it is entered. Derived from
 * the same function `joinConflict` spends through, and from the same
 * unilateral-force price the ladder's strike pays where no authorization
 * covers the war, so a screen cannot promise a price the commitment then does
 * not charge.
 */
export declare function joinCost(campaign: Campaign, conflict: Conflict, side: ConflictSide): JoinCost;
export type JoinProjection = {
    readonly cost: JoinCost;
    readonly warPowers: WarPowersStanding;
    /** What the office is missing to go in, where its own authority does not reach this war. */
    readonly refusal?: string;
    readonly deterrence: DeterrenceAssessment;
};
/**
 * Everything a join would start, read before it is taken: the price, where it
 * stands under the War Powers Resolution, and what the other side's arsenal
 * puts at stake. Only the President's own government is projected, because
 * only it answers to this Congress.
 */
export declare function projectJoin(campaign: Campaign, conflictId: string, side: ConflictSide): JoinProjection | undefined;
/**
 * Enter an existing war on one side of it. Pure: it reads the board and returns
 * a packet, and the caller runs it through apply() like every other change.
 * Both doors into a war, the Operations room and a scenario reply, come here.
 */
export declare function joinConflict(campaign: Campaign, joiner: NationId, conflictId: string, side: ConflictSide): JoinConflictResult;
export declare function liveNation(runtime: NationRuntime): Nation;
/** A government as a sentence carries it: "the United States", "Iran". */
export declare function nameOf(campaign: Campaign, nation: NationId): string;
export {};
