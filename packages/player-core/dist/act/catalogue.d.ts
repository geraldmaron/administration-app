import { type RegimeAct, type EngagementKind, type InstrumentId, type IssuedInstrumentAct, type RungLevel, type TariffStatute, type TreatyKind } from "@admin/engine";
export declare const ACT_GOALS: readonly ["ties", "trade", "pressure", "covert", "force"];
export type ActGoal = (typeof ACT_GOALS)[number];
export type ActOptionRef = {
    readonly kind: "engagement";
    readonly engagement: EngagementKind;
} | {
    readonly kind: "treaty";
    readonly treaty: TreatyKind;
} | {
    readonly kind: "instrument";
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly regimeAct?: RegimeAct;
} | {
    readonly kind: "tariff";
} | {
    readonly kind: "authorization";
};
/** The run of options a goal's list is broken into, so fourteen ways to build ties read as three kinds of act. */
export type ActFamily = "meet" | "sign" | "assist" | "tariff" | "diplomatic" | "justice" | "economic" | "covert" | "military" | "congress";
export type ActOption = {
    /** Stable and URL-safe: the engine's rung id, or the kind of act and its own kind. */
    readonly id: string;
    readonly goal: ActGoal;
    readonly family: ActFamily;
    readonly name: string;
    readonly ref: ActOptionRef;
};
export type ActGoalCopy = {
    readonly name: string;
    readonly question: string;
    readonly line: string;
};
export declare const ACT_GOAL_COPY: Readonly<Record<ActGoal, ActGoalCopy>>;
export declare const ACT_FAMILY_NAMES: Readonly<Record<ActFamily, string>>;
/** Which goal an instrument rung serves. */
export declare function goalOfRung(instrument: InstrumentId, rung: RungLevel): ActGoal;
/** Every option, in the order a goal lists them. */
export declare const ACT_OPTIONS: readonly ActOption[];
export declare function isActGoal(value: string | undefined): value is ActGoal;
export declare function optionsForGoal(goal: ActGoal): readonly ActOption[];
export declare function actOption(id: string | undefined): ActOption | undefined;
/** A goal's options in their runs, each run named once. */
export declare function familiesOfGoal(goal: ActGoal): readonly {
    readonly family: ActFamily;
    readonly name: string;
    readonly options: readonly ActOption[];
}[];
/** The settings an instrument option is read under: a capture or an indictment fixes the regime act, whatever the address names. */
export declare function configUnder(ref: ActOptionRef, config: ActConfig): ActConfig;
/** The option an instrument rung is, for the addresses that still name the instrument. */
export declare function optionForRung(instrument: InstrumentId, rung: RungLevel): ActOption | undefined;
export type ActConfig = {
    readonly goal?: ActGoal;
    readonly option?: string;
    /** How many units a military rung sends. */
    readonly count?: number;
    /** The goods a tariff lands on, and its rate in whole percent. */
    readonly sector?: string;
    readonly rate?: number;
    /** Several goods in one tariff order, each at its own added rate; when set, the order covers these and `sector`/`rate` name the first. */
    readonly goods?: readonly {
        readonly sector: string;
        readonly rate: number;
    }[];
    /** The trade law a tariff is imposed under. */
    readonly statute?: TariffStatute;
    readonly support?: "unilateral" | "seek";
    readonly partners?: readonly string[];
    readonly strikeObjective?: "military-capacity" | "logistics" | "infrastructure";
    readonly civilianProtection?: "standard" | "additional-assessment";
    /** Which operation a covert regime action runs. */
    readonly regimeAct?: RegimeAct;
    /** A standing thing to end instead of a new act: an operation to call off or a measure to lift. */
    readonly manage?: string;
    /** The options set side by side. */
    readonly compare?: readonly string[];
    /** The locked option this act was opened to build toward, which its receipt leads back to. */
    readonly then?: string;
};
/** The act workspace for one government, opened on a goal and an option where one is given. */
export declare function actHref(nation: string, config?: ActConfig): string;
/** Reopen the authorized operation without replacing its selected terms with defaults. */
export declare function issuedInstrumentHref(act: IssuedInstrumentAct): string;
