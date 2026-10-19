import { type Campaign, type CourtStage } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
export type OrderCaseGate = Extract<ScenarioDef["conditions"][number], {
    kind: "pendingOrderCase";
}>;
export declare function orderCaseGate(conditions: readonly ScenarioDef["conditions"][number][]): OrderCaseGate | undefined;
/** The pending judicial proceeding and signed order this decision can actually withdraw. */
export type FrozenOrderCase = {
    readonly proceedingId: string;
    readonly recordId: string;
    readonly orderId: string;
    readonly filedTurn: number;
    readonly stage: CourtStage;
    readonly orderName: string;
    readonly question: string;
    readonly posture: "pending-challenge" | "adverse-lower";
    readonly ruleState?: "unimplemented" | "operative";
};
export declare function selectScenarioOrderCase(campaign: Campaign, scenarioId: string, gate?: OrderCaseGate): FrozenOrderCase | undefined;
export declare function orderCaseStillLive(campaign: Campaign, frozen: FrozenOrderCase): boolean;
