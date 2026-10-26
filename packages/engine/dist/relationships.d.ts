import type { Grudge, NationId, Relationship } from "@admin/world";
import { type Campaign, type FlagSet } from "./state.js";
import { type StandingReading } from "./relationship-graph.js";
import type { TurnPhase } from "./turn-loop.js";
import type { InstrumentId } from "./instruments.js";
/** Planning value: days for half of a favor above a pair's standing reading to fade. 39 weeks. */
export declare const FAVOR_HALF_LIFE_DAYS = 273;
/**
 * Planning value: how many favor half-lives a grievance takes to halve, at the
 * forgiving and the vengeful end of the scale. A nation's vengefulness places it
 * between the two.
 */
export declare const GRIEVANCE_HALF_LIFE_MULTIPLE: {
    readonly forgiving: 2;
    readonly vengeful: 4;
};
/** What is left of a departure from target after `elapsedDays`, at `halfLifeDays`. */
export declare function retained(elapsedDays: number, halfLifeDays: number): number;
/** The shared form: `current` moved toward `target` by `elapsedDays` of memory. */
export declare function approach(current: number, target: number, elapsedDays: number, halfLifeDays: number): number;
/** Days for half of a grievance to fade, for a government of this vengefulness. */
export declare function grievanceHalfLifeDays(vengefulness: number): number;
/**
 * A grudge's stored decay rate: the share of its fading weight it loses each
 * day. Higher vengefulness, slower decay. Stored rather than re-derived so a
 * grievance keeps the temper of the government that formed it.
 */
export declare function grudgeDecayRate(vengefulness: number): number;
export declare function createGrudge(cause: string, weight: number, createdTurn: number, vengefulness: number): Grudge;
/** A grudge from an older save, restated in the daily rate; a current one unchanged. */
export declare function migrateGrudge(grudge: Grudge): Grudge;
/** Planning value: the least a war's grudge ever weighs. */
export declare const WAR_GRUDGE_FLOOR = 0.15;
/** One grudge aged by `elapsedDays`, or undefined once it is forgotten. */
export declare function ageGrudge(grudge: Grudge, elapsedDays: number): Grudge | undefined;
export declare function grudgeWeight(relationship: Relationship): number;
export declare function historyPressure(relationship: Relationship, now: number): number;
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
/** One durable cause and what it does to where a pair settles. */
export type DurableShift = {
    readonly cause: string;
    readonly trust: number;
    readonly tension: number;
    readonly militaryThreat: number;
};
/** Every durable cause standing between `from` and `to`, as `from` reads `to`, in their summing order. */
export declare function durableShifts(campaign: Campaign, from: NationId, to: NationId): readonly DurableShift[];
/** Where this relationship's trust, tension and threat settle once every favor and slight has faded. */
export declare function relationshipAnchor(campaign: Campaign, relationship: Relationship): StandingReading | undefined;
/** Planning value: days for a standing pressure to close half the distance to the level it holds a reading at. */
export declare const PRESSURE_BUILD_HALF_LIFE_DAYS = 28;
/** One week of a standing pressure: toward `level`, never back the other way. */
export declare function pressDown(current: number, level: number): number;
/** The same, for a reading a pressure raises. */
export declare function pressUp(current: number, level: number): number;
/**
 * The trust a standing pressure holds `relationship` at: `drop` below where
 * the pair stands. Undefined where either nation has no record to stand on.
 */
export declare function pressedTrustLevel(campaign: Campaign, relationship: Relationship, drop: number): number | undefined;
/** The threat a standing pressure holds `relationship` at: `rise` above what the two records give. */
export declare function pressedThreatLevel(campaign: Campaign, relationship: Relationship, rise: number): number | undefined;
/**
 * A turn phase: one week of memory on every relationship. Grudges fade toward
 * their cause's floor, and trust, tension and threat settle toward the pair's standing
 * reading, a favor faster than an injury. One packet for the whole graph,
 * because this is the world's weekly bookkeeping rather than an act, and a
 * packet per pair would put thousands of ledger lines a week on the record.
 */
export declare const grudgeDecayPhase: TurnPhase;
