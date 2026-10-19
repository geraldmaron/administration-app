import { type Campaign, type CollectionFinding, type CollectionProduct } from "@admin/engine";
import { type NationId } from "@admin/world";
import type { ScenarioCondition } from "./scenario-conditions.js";
export type ReportGate = Extract<ScenarioCondition, {
    kind: "collectionReport";
}>;
/** The issued source, not a fresh reading of the world, travels with the case. */
export type FrozenCollectionReport = {
    readonly id: string;
    readonly tasking: CollectionProduct["tasking"];
    readonly question: string;
    readonly status: "findings" | "no-result";
    readonly target: string;
    readonly targetKind: "foreign-nation" | "domestic-state";
    readonly day: number;
    readonly date: CollectionProduct["date"];
    readonly element: CollectionProduct["element"];
    readonly discipline: CollectionProduct["discipline"];
    readonly summary: string;
    readonly confidence: "low" | "moderate" | "high";
    readonly exposed: boolean;
    readonly findings: readonly CollectionFinding[];
    readonly gaps: readonly string[];
    readonly topic?: CollectionFinding["topic"];
    readonly basis?: ReportGate["basis"];
    readonly condition?: ReportGate["condition"];
    readonly share?: {
        readonly id: string;
        readonly recipient: NationId;
        readonly day: number;
        readonly partial: boolean;
    };
};
export declare function reportGate(conditions: readonly ScenarioCondition[]): ReportGate | undefined;
export declare function selectScenarioReport(campaign: Campaign, gate: ReportGate, scenarioId: string): FrozenCollectionReport | undefined;
export declare function reportCounterpart(campaign: Campaign, report: FrozenCollectionReport, bind: "target" | "recipient" | "home"): NationId | undefined;
export declare function reportStillLive(campaign: Campaign, frozen: FrozenCollectionReport, requireActiveTasking?: boolean): boolean;
export declare function reportTokens(campaign: Campaign, report: FrozenCollectionReport): Record<string, string>;
