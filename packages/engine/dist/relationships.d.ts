import type { Grudge, NationId, Relationship } from "@admin/world";
import { type Campaign, type FlagSet } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
import type { InstrumentId } from "./instruments.js";
export declare function grudgeDecayRate(vengefulness: number): number;
export declare function createGrudge(cause: string, weight: number, createdTurn: number, vengefulness: number): Grudge;
export declare function grudgeWeight(relationship: Relationship): number;
export declare function historyPressure(relationship: Relationship): number;
/**
 * How much the landed coercion done to `relationship.from` weighs against
 * `relationship.to`, as a value at or below zero.
 *
 * `deed-toward:<X>` is the record of what this government did to X, and the
 * nation on a bound deed flag is always the counterparty — never this
 * government's own. So the only relationship this record can be charged
 * against is a counterpart's reading of the administration, which is exactly
 * the direction the NPC agent scores on. The mirror form, `deed-from:<X>`,
 * would answer the opposite question, what X did to this government, for the
 * administration's own reading of X. It is deliberately not read here: nothing
 * scores that direction, and a term nobody calls is a term that can drift out
 * of true unnoticed.
 */
export declare function deedPressure(flags: FlagSet, relationship: Relationship, player: NationId): number;
/**
 * How much harder `target` is to move with `instrument` because `actor` has
 * already used that same instrument on it recently. Reads the acting
 * direction's own history (`actor` -> `target`), which is where an ordinary
 * successful act of `actor`'s is stamped — the same direction
 * `historyPressure` reads, and disjoint from it by kind (see
 * `REPEAT_ACT_KINDS`): an instrument's repeat kind is never one
 * `historyPressure` classifies, so a repeated act is never charged against
 * both terms.
 *
 * Zero for a first attempt (nothing on file yet to call a repeat) and for
 * every instrument `REPEAT_ACT_KINDS` does not yet name, which is the honest
 * answer when the ladder itself has not written anything to check against.
 *
 * This is deliberately not a term on `disposition()`: it prices how
 * habituated a target has become to one specific approach, not how favorably
 * it reads the actor overall, and the resistance a repeated démarche meets is
 * a property of the démarche, not of the relationship's standing sense of the
 * other government.
 */
export declare function repeatDrag(campaign: Campaign, actor: NationId, target: NationId, instrument: InstrumentId): number;
export declare function disposition(relationship: Relationship, campaign?: Campaign): number;
export declare function bothDirections(campaign: Campaign, a: NationId, b: NationId): {
    readonly aToB: Relationship | undefined;
    readonly bToA: Relationship | undefined;
};
export declare const grudgeDecayPhase: TurnPhase;
