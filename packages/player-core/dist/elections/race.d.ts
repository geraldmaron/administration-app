import { type Campaign } from "@admin/engine";
import type { PersonId } from "@admin/world";
import { type SeasonStage } from "./finale-copy";
export type RaceOpponent = {
    readonly id: PersonId;
    readonly name: string;
    readonly party: "Democrat" | "Republican";
    /** Where they sit now, in the words a paper would use: "Governor of Ohio". */
    readonly office: string;
    readonly introduction: string;
};
export type BandPoint = {
    /** Days from the oath. */
    readonly at: number;
    readonly label: string;
    readonly low: number;
    readonly high: number;
};
export type RaceReading = {
    readonly opponent?: RaceOpponent;
    readonly stage: SeasonStage;
    readonly share: number;
    readonly low: number;
    readonly high: number;
    /** How much of the matchup is known, 0..1. */
    readonly known: number;
    readonly bandWord: string;
    readonly caption: string;
    readonly electoralVotes?: number;
    readonly electoralMajority: number;
    readonly wouldHold: boolean;
    readonly contestDate: string;
    /** Days from the oath to today and to Election Day, the chart's two marks. */
    readonly todayAt: number;
    readonly contestAt: number;
    /** The band from today to the night, at monthly steps and on the night itself. */
    readonly cone: readonly BandPoint[];
};
/** The race as it stands this week. Undefined once the President has no contest left to run. */
export declare function raceReading(campaign: Campaign): RaceReading | undefined;
/** The opponent as the contest named them, for a night or an ending that is already decided. */
export declare function decidedOpponent(campaign: Campaign): RaceOpponent | undefined;
