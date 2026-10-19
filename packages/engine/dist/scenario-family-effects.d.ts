import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { FamilyDisposition, ScenarioFamilyId, ScenarioPlace } from "./scenario-families.js";
export type ScenarioFamilyEffect = {
    readonly kind: "scenarioFamily";
    /**
     * An opener was raised or answered: the family starts and its counterpart
     * and place are pinned. `unanswered` marks the raise; the later answer finds
     * the run, keeps its pinned place and makes the thread live.
     */
    readonly open?: {
        readonly family: ScenarioFamilyId;
        readonly counterpart: NationId;
        readonly scenario: string;
        readonly turn: number;
        /** The opener's rendered subject, kept so the Record can name the arc when it ends. */
        readonly title?: string;
        /** Where at home the opener happened, when it happened below the capital. */
        readonly place?: ScenarioPlace;
        readonly unanswered?: boolean;
    };
    /** A thread whose opener was never answered is dropped; nothing was dealt under it. */
    readonly expire?: {
        readonly family: ScenarioFamilyId;
    };
    /** A later member was dealt under a family already running. */
    readonly beat?: {
        readonly family: ScenarioFamilyId;
        readonly scenario: string;
        readonly turn: number;
    };
    /** The family is over. It deals nothing more, and the record of it stays. */
    readonly close?: {
        readonly family: ScenarioFamilyId;
        readonly turn: number;
        readonly disposition: FamilyDisposition;
    };
    /**
     * An answer set these authored flags, and this is where it happened. A
     * scenario gated on one of them is the story's next scene even when no family
     * ties the two together, so it comes back here. With no place, the answer
     * happened in Washington or abroad and any place an earlier answer left on
     * the same flags is dropped: the latest deed is the one the board stands on.
     */
    readonly callback?: {
        readonly flags: readonly string[];
        readonly place?: ScenarioPlace;
    };
};
export declare function applyScenarioFamily(state: Campaign, effect: ScenarioFamilyEffect): Campaign;
