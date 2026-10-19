import type { EffectPacket } from "./effect-types.js";
import { type Campaign } from "./state.js";
/**
 * How much of the gap to its usual reach the country's standing abroad closes
 * in a week: about a third of a year to close half. Slower than order's
 * settling, because a capital's view of a government is a record of dealings
 * rather than the weather, and a good year of diplomacy should outlast a
 * season. Design judgment, labeled.
 */
export declare const STANDING_REVERSION = 0.02;
/**
 * Standing settling back toward the reach the country's weight usually buys.
 *
 * Every writer of standing pushed it one way or the other and none pulled it
 * back, so a term's accumulated slights and favors summed without limit and a
 * reading could sit at a bound for years. This pulls it back toward the
 * founding's expectation for a power of this weight, the same resting point
 * the opening position measures it against. Filed in the background: it is the
 * world's memory fading, not something the President did.
 */
export declare function standingSettling(state: Campaign): EffectPacket | undefined;
