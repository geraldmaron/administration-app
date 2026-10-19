import { type Campaign } from "@admin/engine";
import type { ScenarioCondition } from "./scenario-conditions.js";
export type MatterGate = Extract<ScenarioCondition, {
    kind: "oversightMatter";
}>;
export type FrozenOversightMatter = {
    readonly id: string;
    readonly institution: string;
    readonly subject: string;
    readonly openedTurn: number;
    readonly stage: "opened" | "gathering" | "reported";
    readonly public: boolean;
    readonly source: string;
};
export declare function matterGate(conditions: readonly ScenarioCondition[]): MatterGate | undefined;
/** Freeze the actual inquiry rather than letting a later draw substitute another one. */
export declare function selectScenarioMatter(campaign: Campaign, gate: MatterGate, scenarioId: string): FrozenOversightMatter | undefined;
export declare function matterStillLive(campaign: Campaign, frozen: FrozenOversightMatter): boolean;
