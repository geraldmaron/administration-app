import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ActConfig, type ActOption } from "./catalogue";
import type { OptionEffects, RelationshipKey } from "./option-effects";
import { type OptionPreview } from "./preview";
export type PrerequisiteReading = Extract<RelationshipKey, "ourTrust" | "theirTrust" | "tension">;
/** An open act that moves the reading toward its floor, with how far one of it goes. */
export type Builder = {
    readonly option: ActOption;
    /** One of it on each reading it moves, on that reading's own scale; drawn, never printed. */
    readonly steps: Partial<Record<PrerequisiteReading, number>>;
    /** Its largest step toward the gap, which orders the builders. */
    readonly step: number;
};
export type Requirement = {
    readonly reading: PrerequisiteReading;
    readonly label: string;
    /** Where it stands, -1..1; absent when the services have no read on their side. */
    readonly have?: number;
    readonly need: number;
    /** Both said as the band words every surface uses, never as figures. */
    readonly haveWord: string;
    readonly needWord: string;
    readonly met: boolean;
};
export type Prerequisite = {
    readonly requirements: readonly Requirement[];
    /** Whether any act the President can take moves it; a summit's call for tension is not something to build. */
    readonly buildable: boolean;
    /** The open acts that close the gap, the largest step first. */
    readonly builders: readonly Builder[];
    /** What it needs and what to do, in a sentence or two. */
    readonly line: string;
};
export type OptionReading = {
    readonly option: ActOption;
    readonly preview: OptionPreview;
    readonly effects?: OptionEffects;
};
/** The open act that moves one reading furthest, for the tick on that reading's meter. */
export declare function bestBuilderFor(prerequisite: Prerequisite, reading: PrerequisiteReading): Builder | undefined;
/** What a locked option is waiting on, or undefined when it is open or the gate that closed it is not a reading of the relationship. */
export declare function prerequisiteOf(campaign: Campaign, nation: NationId, entry: OptionReading, options: readonly OptionReading[], config?: ActConfig): Prerequisite | undefined;
