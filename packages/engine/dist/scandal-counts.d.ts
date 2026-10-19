import type { Campaign } from "./state.js";
/**
 * Stories broken since a turn, counted by what opened them and, for the
 * President's own acts, by the charge: the measurement that says whether a
 * presidency can be in trouble without choosing to be.
 */
export declare function selectScandalOriginCounts(campaign: Campaign, sinceTurn: number): Readonly<Record<string, number>>;
