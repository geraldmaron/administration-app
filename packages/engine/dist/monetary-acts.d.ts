import type { EffectPacket } from "./effect-types.js";
import type { MetricCost, RiskBranch } from "./resolution.js";
import type { Campaign, GameDate } from "./state.js";
export type FedLeanDirection = "ease" | "tighten";
/** Starting value: the standing a President spends leaning on an independent central bank in public. */
export declare const FED_LEAN_STANDING_COST = 0.02;
export type FedLeanProjection = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly cost: MetricCost;
    readonly risks: readonly RiskBranch[];
    /** The signed tilt the lean adds at the next meeting. */
    readonly bound: number;
    readonly meeting: GameDate;
};
export type FedLeanResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** What leaning on the Fed would cost and do, before it is done. */
export declare function projectFedLean(campaign: Campaign, direction: FedLeanDirection): FedLeanProjection;
/** Lean on the Fed ahead of its next meeting. Commits through the ordinary act path, priced by `projectFedLean`. */
export declare function leanOnTheFed(campaign: Campaign, direction: FedLeanDirection): FedLeanResult;
