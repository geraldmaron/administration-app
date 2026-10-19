import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { ScenarioCondition } from "./scenario-conditions.js";
export type FrozenTradeMeasure = {
    readonly id: string;
    readonly actor: NationId;
    readonly sector: string;
    readonly rate: number;
    readonly imposedTurn: number;
};
export type TradeMeasureGate = Extract<ScenarioCondition, {
    kind: "tradeMeasure";
}>;
export declare function tradeMeasureGate(conditions: readonly ScenarioCondition[]): TradeMeasureGate | undefined;
/** A landed, still-active answer by the foreign government, never an expectation. */
export declare function selectScenarioTradeMeasure(campaign: Campaign, gate: TradeMeasureGate, scenarioId: string): FrozenTradeMeasure | undefined;
export declare function tradeMeasureStillLive(campaign: Campaign, frozen: FrozenTradeMeasure): boolean;
export declare function tradeResponseAvailable(campaign: Campaign, frozen: FrozenTradeMeasure, gate: TradeMeasureGate): boolean;
export declare function tradeMeasureDisplayName(frozen: FrozenTradeMeasure): string;
