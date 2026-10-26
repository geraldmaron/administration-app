import type { EffectPacket } from "./effect-types.js";
import type { MetricCost, RiskBranch } from "./resolution.js";
import type { Campaign, GameDate } from "./state.js";
/** Planning value: a drawdown sells this share of the reserve's opening fill, over `RELEASE_WEEKS`. */
export declare const RELEASE_DRAW = 0.45;
/** Planning value: how long a drawdown's barrels flow. */
export declare const RELEASE_WEEKS = 26;
/** Planning value: how long an emergency fuel waiver stands. */
export declare const WAIVER_WEEKS = 20;
/** Planning value: how far crude must stand above where buyers expect it before a supply interruption is severe enough to find. */
export declare const SEVERE_INTERRUPTION = 0.1;
export type LeverProjection = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly cost: MetricCost;
    readonly risks: readonly RiskBranch[];
    readonly until: GameDate;
};
export type LeverResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Whether the world crude market is in a supply interruption the law
 * recognizes for a full drawdown: a standing shock, or crude well above its
 * norm. 42 U.S.C. §6241(d)(1) also allows a full drawdown to meet the
 * country's obligations under the International Energy Program; an IEA
 * collective action is called on a severe disruption, so the same finding
 * stands for it here, and the other members' barrels are not modeled, since
 * the IEA's own pages on its 2022 actions refused the request (403).
 */
export declare function severeInterruption(campaign: Campaign): boolean;
/** What a drawdown of the Strategic Petroleum Reserve would do, before it is ordered. */
export declare function projectReserveRelease(campaign: Campaign): LeverProjection;
/** Order a drawdown of the Strategic Petroleum Reserve. */
export declare function releaseStrategicReserve(campaign: Campaign): LeverResult;
/** The reserve's barrels at the opening: EIA weekly SPR crude stocks, week of 2026-10-16 (WCSSTUS1, opened 2026-10-25). */
export declare const SPR_OPENING_BARRELS = 282683000;
/**
 * 42 U.S.C. §6241(h), opened 2026-10-25 (law.cornell.edu): on a finding of a
 * domestic or international energy supply shortage of significant scope or
 * duration, short of the severe interruption a full drawdown needs, the
 * Secretary may draw down no more than 30,000,000 barrels for each such
 * shortage, for no more than 60 days, and never below 252,400,000 barrels.
 */
export declare const LIMITED_DRAWDOWN: {
    readonly barrels: 30000000;
    readonly days: 60;
    readonly floor: 252400000;
};
/** The share of world crude supply a limited drawdown adds while it flows: its barrels over its days, against world consumption. */
export declare const LIMITED_RELEASE_SHARE: number;
/** What a limited drawdown of the Strategic Petroleum Reserve would do, before it is ordered. */
export declare function projectLimitedRelease(campaign: Campaign): LeverProjection;
/** Order a limited drawdown: 30 million barrels over 60 days, no severe-interruption finding needed. */
export declare function releaseLimitedReserve(campaign: Campaign): LeverResult;
/** What an emergency fuel waiver would do, before it is issued. */
export declare function projectFuelWaiver(campaign: Campaign): LeverProjection;
/** Issue an emergency fuel waiver. */
export declare function issueFuelWaiver(campaign: Campaign): LeverResult;
