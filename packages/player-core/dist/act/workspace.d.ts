import { type Campaign, type RegimeAct } from "@admin/engine";
import type { ForceAssetId, NationId } from "@admin/world";
import { type TariffLawRow } from "./tariff-law";
import { type ActAssessment } from "./assessment";
import { type ActConfig, type ActFamily, type ActGoal, type ActGoalCopy, type ActOption } from "./catalogue";
import { type OptionPreview } from "./preview";
import { type OptionEffects } from "./option-effects";
import { type Prerequisite } from "./prerequisite";
export type OptionView = {
    readonly option: ActOption;
    readonly preview: OptionPreview;
    /** What it moves, where the engine can say before it is taken. */
    readonly effects?: OptionEffects;
    /** What a locked option is waiting on, and the open acts that build it. */
    readonly prerequisite?: Prerequisite;
    /** The staff's full reading of an open option, so a row can show its risks and reactions before it is picked. */
    readonly assessment?: ActAssessment;
};
/** An option the President set beside others, with its full reading against doing nothing for the detail row. */
export type ComparedView = OptionView & {
    readonly assessment: ActAssessment;
};
export type GoalView = ActGoalCopy & {
    readonly goal: ActGoal;
    readonly open: number;
};
export type FamilyView = {
    readonly family: ActFamily;
    readonly name: string;
    readonly options: readonly OptionView[];
};
/** One goal's options in the list, in their runs, with how many can be taken now. */
export type GoalSection = GoalView & {
    readonly families: readonly FamilyView[];
};
export type ForceTerms = {
    readonly min: number;
    readonly max: number;
    readonly count: number;
    /** What is sent, so a screen can draw its glyph and unit. */
    readonly unitType: ForceAssetId;
    /** The chosen package as a sentence carries it: "4 destroyers". */
    readonly countText: string;
    readonly preferredText: string;
    readonly availableText?: string;
    readonly closedReason?: string;
    readonly purpose: string;
    readonly sizing?: string;
};
export type SupportTerms = {
    readonly mode: "unilateral" | "seek";
    readonly partners: readonly {
        readonly nation: NationId;
        readonly name: string;
        readonly compact: string;
        readonly chosen: boolean;
    }[];
};
export declare const STRIKE_OBJECTIVES: readonly [{
    readonly value: "military-capacity";
    readonly label: "Military targets";
    readonly detail: "Hit their troops and the weapons they fight with.";
}, {
    readonly value: "logistics";
    readonly label: "Supply lines";
    readonly detail: "Hit the roads, depots, and supplies that keep their troops going. Civilians are at more risk.";
}, {
    readonly value: "infrastructure";
    readonly label: "Dual-use targets";
    readonly detail: "Power, ports and networks that support the military. Lawyers must find each one a military objective, and the civilian harm expected must not be excessive. Civilian outages and deaths are the main risk.";
}];
export type StrikeTerms = {
    readonly objective: (typeof STRIKE_OBJECTIVES)[number]["value"];
    readonly protection: "standard" | "additional-assessment";
};
export type TariffTerms = {
    readonly sectors: readonly {
        readonly sector: string;
        readonly name: string;
    }[];
    readonly sector: string;
    readonly rate: number;
    readonly standing: number;
    readonly room: number;
    /** The law this tariff rests on, and every law it could rest on with its standing. */
    readonly law: TariffLawRow;
    readonly laws: readonly TariffLawRow[];
};
/** The operations a covert regime action can run, with the lethal one listed only in an armed conflict with the target or against an imminent threat from it. */
export type RegimeTerms = {
    readonly act: RegimeAct;
    readonly options: readonly {
        readonly value: RegimeAct;
        readonly label: string;
        readonly detail: string;
    }[];
};
export type ActTerms = {
    readonly regime?: RegimeTerms;
    readonly force?: ForceTerms;
    readonly support?: SupportTerms;
    readonly strike?: StrikeTerms;
    readonly tariff?: TariffTerms;
};
export type UnderWayRow = {
    readonly kind: "operation" | "authorization" | "measure";
    readonly id: string;
    readonly title: string;
    readonly detail: string;
    /** Whether the President can end it from here. */
    readonly endable: boolean;
};
export type ActWorkspace = {
    readonly nation: NationId;
    readonly name: string;
    readonly goal: ActGoal | undefined;
    readonly goals: readonly GoalView[];
    readonly families: readonly FamilyView[];
    /** Every goal the list shows: the one filtered to, or all of them in order, each read for what its options move and need. */
    readonly sections: readonly GoalSection[];
    readonly chosen: OptionView | undefined;
    readonly terms: ActTerms;
    readonly assessment: ActAssessment | undefined;
    /** The options set side by side, in the order they were added; empty until two are picked. */
    readonly compared: readonly ComparedView[];
    /** The locked option a building act was opened for, so its receipt can lead back. */
    readonly then?: OptionView;
    readonly underway: readonly UnderWayRow[];
};
/** What the President already has moving against this government, and the measures in force on it. */
export declare function underWayAgainst(campaign: Campaign, nation: NationId): readonly UnderWayRow[];
/** The workspace for one government, or undefined for the President's own country and an id the board does not carry. */
export declare function actWorkspace(campaign: Campaign, nation: NationId, config?: ActConfig): ActWorkspace | undefined;
export { buildTariffPackage, readTariffPackage, type TariffGood, type TariffGoodReading, type TariffPackageBuild, type TariffPackageReading } from "./tariff-package";
