import type { NationId } from "@admin/world";
import { type ProxyProfile } from "./balance-proxies.js";
import { type ActionProjection, type ResolutionRequest } from "./resolution.js";
import { type Campaign } from "./state.js";
export declare function candidateTargetsForBalance(campaign: Campaign): readonly NationId[];
export type BalanceOption = {
    readonly request: ResolutionRequest;
    readonly projection: ActionProjection;
};
export declare function optionsThisTurn(campaign: Campaign): readonly BalanceOption[];
export declare function affordable(campaign: Campaign, option: BalanceOption): boolean;
export declare function isFreeWin(campaign: Campaign, option: BalanceOption): boolean;
/**
 * How each player picks, out of what they can pay for.
 *
 * One function over the dials rather than one arm per proxy: a population of
 * thirteen written as a switch is thirteen places for a rule to drift, and the
 * question the population exists to answer — does *this* dial move the outcome
 * — can only be asked if the dials are the only thing that differs.
 *
 * The bracket proxies' comparators are reproduced exactly. `heaviest` sorts on
 * rung then price and reads no odds at all, which is what makes `reckless`
 * reckless; `surest` sorts on odds then reaches for the gentlest rung that
 * carries them.
 */
export declare function chooseOption(campaign: Campaign, profile: ProxyProfile, options: readonly BalanceOption[], step: number, horizon: number): BalanceOption | undefined;
