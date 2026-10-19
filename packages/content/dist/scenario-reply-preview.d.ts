import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type CastScenario } from "./scenario-cast.js";
import type { ScenarioDef } from "./scenario.js";
export type PreviewBoard = {
    readonly index: number;
    readonly seed: string;
    readonly counterpart: NationId;
    readonly counterpartName: string;
};
export type PreviewChange = {
    readonly key: string;
    readonly before: number;
    readonly after: number;
};
export type PreviewMeasure = {
    readonly id: string;
    readonly kind: string;
    readonly sector: string;
    readonly target: string;
    readonly rate: number;
    readonly origin: string;
    readonly statute?: string;
};
export type ReplyPreview = {
    readonly replyId: string;
    readonly tone: string;
    readonly text: string;
    readonly available: boolean;
    /** The engine's own words when it refuses the reply on this board. */
    readonly refusal?: string;
    /** What the decision screen quotes before the choice. */
    readonly quoted: Readonly<Record<string, number>>;
    readonly metrics: readonly PreviewChange[];
    readonly opinion: readonly PreviewChange[];
    readonly relationship: readonly PreviewChange[];
    readonly customs?: PreviewChange;
    readonly imposed: readonly PreviewMeasure[];
    readonly lifted: readonly PreviewMeasure[];
    readonly flagsSet: readonly string[];
    readonly effects: readonly {
        readonly kind: string;
        readonly detail: string;
    }[];
    readonly beats: readonly string[];
};
export type ScenarioPreview = {
    readonly boards: readonly PreviewBoard[];
    readonly board?: PreviewBoard;
    readonly subject?: string;
    readonly opening: readonly string[];
    readonly replies: readonly ReplyPreview[];
};
/** Every board in the audit's own spread where this scenario is live, with the counterpart it binds there. */
export declare function previewBoardsFor(def: ScenarioDef): readonly {
    readonly campaign: Campaign;
    readonly cast: CastScenario;
}[];
/**
 * Run every reply of a scenario on one live board. `boardIndex` picks among
 * the live boards and `counterpart` recasts on that board when the scenario
 * is live against it there; neither ever binds the player's own country.
 */
export declare function previewScenario(def: ScenarioDef, boardIndex?: number, counterpart?: NationId): ScenarioPreview;
