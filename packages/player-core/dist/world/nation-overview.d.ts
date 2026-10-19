import { type Campaign, type StateCall } from "@admin/engine";
import { type StateId } from "@admin/world";
import { type ConditionReading } from "./board-state";
/** The four lenses the Nation screen offers, the default first. */
export declare const NATION_LENSES: readonly ["approval", "call", "lean", "population"];
export type NationLensId = (typeof NATION_LENSES)[number];
export declare const NATION_LENS_NAMES: Readonly<Record<NationLensId, string>>;
export declare function isNationLens(value: unknown): value is NationLensId;
export type StateRow = {
    readonly id: StateId;
    readonly name: string;
    readonly approval: number;
    readonly call: StateCall;
    /** The call in a few words: "For you, 54%", "Split, 2 of 4". */
    readonly callText: string;
    readonly lean: number;
    readonly leanText: string;
    readonly population: number;
    readonly populationText: string;
    readonly electoralVotes: number;
    /** Live conditions inside the state. */
    readonly conditions: number;
    readonly href: string;
};
export type ApprovalBand = {
    readonly key: string;
    readonly label: string;
    readonly states: number;
    readonly electoralVotes: number;
};
export type EmergencyRow = {
    readonly id: string;
    readonly title: string;
    /** Where it reaches: a state's name, or "the whole country". */
    readonly reach: string;
    readonly weeksLeft: number;
    readonly href?: string;
};
export type NationOverview = {
    readonly approval: number;
    readonly electoral: {
        readonly forYou: number;
        readonly against: number;
        readonly total: number;
        readonly needed: number;
    };
    /** The states by approval band, lowest band first, counted in states and in electoral votes. */
    readonly bands: readonly ApprovalBand[];
    /** The middle state's approval: half the states approve more, half less. */
    readonly median: number;
    readonly rows: readonly StateRow[];
    readonly conditions: readonly ConditionReading[];
    readonly emergencies: readonly EmergencyRow[];
};
/** Lean in points, the way a reader says it: D+12, R+4, Even. Negative lean is Democratic. */
export declare function leanWords(lean: number): string;
/** A headcount, rounded the way a reader says it: 5.9 million, 734 thousand. */
export declare function peopleWords(people: number): string;
/** Gross state product, which the dataset keeps in USD millions like every other money figure. */
export declare function outputWords(usdMillions: number): string;
export declare function callWords(call: StateCall): string;
/** One row per state the campaign carries, in `STATE_IDS` order. */
export declare function stateRows(campaign: Campaign): readonly StateRow[];
/** The value a lens ranks a row by, highest first, and the words it is read in. */
export declare function stateLensValue(row: StateRow, lens: NationLensId): {
    readonly rank: number;
    readonly text: string;
};
/** The rows ranked by a lens, highest first, ties by name: the accessible table beside the map. */
export declare function rankStates(rows: readonly StateRow[], lens: NationLensId): readonly StateRow[];
/** The country as the Nation screen reads it this week. */
export declare function nationOverview(campaign: Campaign): NationOverview;
