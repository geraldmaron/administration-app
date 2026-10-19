import { type BillText, type Campaign, type GameDate } from "@admin/engine";
import type { ScenarioCondition } from "./scenario-conditions.js";
export type BillGate = Extract<ScenarioCondition, {
    kind: "liveBill";
}>;
export type FrozenBill = {
    readonly id: string;
    readonly act: string;
    readonly title: string;
    readonly introducedTurn: number;
    readonly stage: "markup" | "conference";
    readonly text?: Campaign["bills"][string]["text"];
    /** Exclusive response deadline, before autonomous conferees select a text. */
    readonly conferenceDeadline?: GameDate;
};
export declare function billGate(conditions: readonly ScenarioCondition[]): BillGate | undefined;
export declare function selectScenarioBill(campaign: Campaign, gate: BillGate, scenarioId: string): FrozenBill | undefined;
export declare function billStillLive(campaign: Campaign, frozen: FrozenBill): boolean;
export declare function billProvision(frozen: FrozenBill, responseText?: BillText | "both"): string;
export declare function billChamberProvision(frozen: FrozenBill, chamber: "house" | "senate"): string;
