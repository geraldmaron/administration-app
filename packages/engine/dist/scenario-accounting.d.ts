import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effect-types.js";
/** USD millions. The source is a pricing claim, never a claim of fitted uncertainty. */
export type ScenarioEstimate = {
    readonly key: string;
    readonly source: string;
    readonly method: "arithmetic" | "band";
    readonly spread: number;
};
export type ScenarioAccounting = {
    readonly estimated: number;
    readonly booked: number;
    readonly variance: number;
    readonly source: string;
    readonly method: "arithmetic" | "band";
    readonly calibration: "planning";
};
/** Only tagged authored borrowing is uncertain; other obligations keep their existing contract. */
export declare function settleScenarioAccounting(campaign: Campaign, packet: EffectPacket): EffectPacket;
