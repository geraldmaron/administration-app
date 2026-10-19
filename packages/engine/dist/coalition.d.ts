import { type NationId } from "@admin/world";
import { type Campaign } from "./state.js";
import type { InstrumentId } from "./instrument-ids.js";
import type { MetricCost, ResolutionRequest } from "./resolution.js";
/**
 * Trust in the actor at which a partner is read as likely to back a move.
 * Stricter than the 0.4 the ripple rules read as "aligned" with a target,
 * because backing asks more than sympathy does.
 */
export declare const BACKING_TRUST = 0.5;
export type BackerCompact = {
    readonly name: string;
    readonly kind: "defense" | "economic" | "political";
};
export type Backer = {
    readonly nation: NationId;
    readonly name: string;
    readonly trust: number;
    readonly compact: BackerCompact;
};
export type Coalition = {
    /** Strongest compact first, then most trusting. */
    readonly backers: readonly Backer[];
    /** Partners who share a compact with the actor but are aligned with the target or share its bloc. */
    readonly torn: number;
};
export declare function coalitionFor(campaign: Campaign, actor: NationId, target: NationId, trustFloor?: number): Coalition;
/**
 * How much one backer counts toward a full coalition, by the compact it is
 * bound by. A treaty ally lends bases, ships and a vote; a trade-bloc partner
 * mostly lends its name.
 */
export declare const BACKER_WEIGHT: Readonly<Record<BackerCompact["kind"], number>>;
/**
 * Weighted backers at which a coalition is as strong as it gets. Past this,
 * more names on the statement change nothing: the odds of a move are set by
 * whether the people who matter joined, not by how many signed.
 */
export declare const BACKING_SATURATION = 4;
/**
 * Relative lift a full coalition gives an act's odds, by instrument.
 *
 * Sanctions gain the most because their whole mechanism is closing the exits,
 * and every partner who joins closes one. Force gains less: allies lend basing,
 * overflight and intelligence, but the fight is still the actor's. A covert
 * act gains nothing, because a secret shared with a coalition is not one, and
 * aid and diplomacy carry no coalition reading on the act screen.
 */
export declare const BACKING_ODDS_LIFT: Readonly<Record<InstrumentId, number>>;
/**
 * Share of an act's standing cost a full coalition absorbs. A move other
 * governments stand behind reads abroad as enforcement rather than as one
 * capital's will, and that difference is what standing measures.
 */
export declare const BACKING_STANDING_RELIEF = 0.35;
export type CoalitionBacking = {
    readonly backers: number;
    /** 0 to 1: weighted backers over `BACKING_SATURATION`. */
    readonly strength: number;
    /** Multiplier already applied to the projection's `successChance`. */
    readonly oddsMultiplier: number;
    /** Share of the standing cost already taken off the projection's `cost`. */
    readonly standingRelief: number;
};
/**
 * What the actor's backers do to this act, or nothing where backing does not
 * apply.
 *
 * The President's own acts only, for the reason the cabinet's sway is theirs
 * only: the coalition is read off trust in one government, and pricing every
 * capital's moves this way would retune the whole world's balance to settle one
 * screen's question.
 */
export declare function coalitionBacking(campaign: Campaign, request: ResolutionRequest): CoalitionBacking | undefined;
/** The act's cost with the coalition's share of the standing taken off it. */
export declare function withBacking(cost: MetricCost, backing: CoalitionBacking | undefined): MetricCost;
