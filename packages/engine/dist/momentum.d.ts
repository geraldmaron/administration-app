import type { Campaign } from "./state.js";
/** How fast the memory of past weeks fades: each older week counts this much less. */
export declare const MOMENTUM_DECAY = 0.85;
/** How much of the trend reaches the count. Planning value. */
export declare const MOMENTUM_LEVERAGE = 0.5;
/** The most the trend can move the share, either way. Two points. */
export declare const MOMENTUM_CAP = 0.02;
/** How far recent weeks have swung the count, in share of the vote. Zero with no history. */
export declare function momentumShift(campaign: Campaign): number;
