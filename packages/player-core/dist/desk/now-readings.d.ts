import { type Campaign, type MetricSet, type PressureTermKey } from "@admin/engine";
import { type MetricStance } from "../format/figures";
/** The Brief's readings, in the order the strip draws them. */
export declare const NOW_KEYS: readonly (keyof MetricSet)[];
export type NowReading = {
    readonly key: keyof MetricSet;
    readonly label: string;
    readonly value: number;
    /** Where it sits in its own range, 0..1: what the gauge draws. */
    readonly fraction: number;
    readonly figure: string;
    readonly stance: MetricStance;
    /** The move since the last closed week, or nothing while no week of this term has closed. */
    readonly week?: {
        readonly delta: number;
        readonly text: string;
        readonly direction: "up" | "down" | "flat";
    };
    /** Weekly values, oldest first, ending with now: the line a trend draws. */
    readonly trail: readonly number[];
    /** How many of the trail's first values came before this administration. */
    readonly inherited: number;
    readonly href: string;
};
/** The five readings now, each with its gauge position and its move since the last closed week of this term. */
export declare function nowReadings(campaign: Campaign): readonly NowReading[];
export declare const PRESSURE_TERM_WORDS: Readonly<Record<PressureTermKey, string>>;
export type RemovalStanding = {
    /** The arc's own figure, from the last weekly tick. */
    readonly pressure: number;
    readonly figure: string;
    readonly stance: "neutral" | "caution" | "adverse";
    /** The proceedings' lines on the same scale: the House vote, the trial, conviction. */
    readonly thresholds: readonly {
        readonly at: number;
        readonly label: string;
    }[];
    /** What the figure is made of right now, heaviest first; the live total they add up to is `liveTotal`. */
    readonly terms: readonly {
        readonly key: PressureTermKey;
        readonly label: string;
        readonly share: number;
    }[];
    readonly liveTotal: number;
    /** Calm: no proceeding has opened and the figure sits under the first line. */
    readonly calm: boolean;
    /** Only where the charter removes a President by impeachment: the two readings of the President's own party. */
    readonly ownParty?: OwnPartyStanding;
};
export type OwnPartyStanding = {
    /** How many of the President's own party's identifiers still approve, 0..1. */
    readonly approval: number;
    readonly figure: string;
    /** The members of the President's Senate caucus a grave charge would turn against them, and how many sit in it. */
    readonly senatorsLost: number;
    readonly senators: number;
    /** The inability watch: a design threshold, not a historical one, and how long the party has been under it. */
    readonly inability: {
        readonly line: number;
        readonly lineFigure: string;
        readonly below: boolean;
        readonly weeksBelow: number;
        readonly weeksNeeded: number;
        /** Turns until another declaration may be made, after one that failed. */
        readonly weeksUntilRetry?: number;
    };
};
/**
 * How close Congress is to moving against the President: the arc's figure
 * against the lines that open each proceeding, and the terms behind it read
 * live, so the breakdown adds up to the total it says it adds up to.
 */
export declare function removalStanding(campaign: Campaign): RemovalStanding;
