import { type Campaign } from "@admin/engine";
import { type ComparisonVerdict } from "@admin/world";
import type { EconomyHistoryRate } from "./history.js";
export type ComparisonWindow = {
    readonly id: string;
    readonly label: string;
    /** "YYYY-MM", the first and last month the window covers. */
    readonly first: string;
    readonly last: string;
};
/** Proposed analysis windows. Whether the reference pack covers one is checked per rate, never assumed. */
export declare const WINDOW_PRESETS: readonly ComparisonWindow[];
export type ComparisonPoint = {
    /** Months since the series began, at the end of the period it covers. */
    readonly month: number;
    readonly label: string;
    /** Percent, or undefined where the period carries no value. */
    readonly value: number | undefined;
    /** Why there is no value, when there is not. */
    readonly gap?: string;
};
export type ComparisonSeries = {
    readonly id: "reference" | "played";
    readonly label: string;
    readonly evidence: "observed" | "simulated";
    readonly points: readonly ComparisonPoint[];
};
export type WindowChoice = ComparisonWindow & {
    readonly available: boolean;
    readonly reason?: string;
};
export type ComparisonView = {
    readonly rate: EconomyHistoryRate;
    readonly windows: readonly WindowChoice[];
    readonly selected: WindowChoice;
    readonly verdict: ComparisonVerdict;
    /** What is lined up with what, in one sentence a player can check. */
    readonly basis: string;
    readonly series: readonly ComparisonSeries[];
    /** Set when the chosen window cannot be drawn; the series are then empty. */
    readonly unavailable?: string;
    /** What the reference stretch cannot tell you. */
    readonly caution: string;
};
export declare function comparisonView(campaign: Campaign, rate: EconomyHistoryRate, windowId: string): ComparisonView;
