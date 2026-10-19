import { type Campaign, type NationRuntime } from "@admin/engine";
import { type StateId } from "@admin/world";
import type { EconomyHistoryRate } from "../economy/history.js";
import type { Better, CoursePoint, FormatKind, CompareSubjectKind } from "./types.js";
export type CompareMetricId = "approval" | "treasury" | "stability" | "militaryReadiness" | "standing" | "growth" | "inflation" | "unemployment" | "debtToGdp" | "militaryStrength" | "regimeStability" | "softPower" | "tradeReliance";
/** Where a subject's history subjects come from: the engine's authored landmarks or the published U.S. record. */
export type HistorySource = "approval-landmarks" | "treasury-scale" | EconomyHistoryRate;
export type CompareMetric = {
    readonly id: CompareMetricId;
    readonly label: string;
    /** The unit in words, for a caption or an axis. */
    readonly unit: string;
    readonly format: FormatKind;
    readonly better: Better;
    /** A fixed scale where the reading has one. */
    readonly domain?: readonly [number, number];
    readonly subjects: readonly CompareSubjectKind[];
    /**
     * `published`: a figure the government prints, readable for any government.
     * `assessed`: a judgment of a government's inner workings, readable only
     * where the President's services read that government.
     */
    readonly visibility: "published" | "assessed";
    /** The President's own figure this week. */
    readonly self: (campaign: Campaign) => number | undefined;
    /** The President's recorded course, oldest first, this week last. Absent where nothing keeps one. */
    readonly course?: (campaign: Campaign) => readonly CoursePoint[];
    /** Another government's figure this week, off its live stats. */
    readonly nation?: (runtime: NationRuntime) => number;
    readonly state?: (campaign: Campaign, id: StateId) => number | undefined;
    readonly stateCourse?: (campaign: Campaign, id: StateId) => readonly CoursePoint[];
    readonly history?: HistorySource;
};
export declare const COMPARE_METRICS: Readonly<Record<CompareMetricId, CompareMetric>>;
export declare const COMPARE_METRIC_IDS: readonly CompareMetricId[];
export declare function compareMetric(id: string): CompareMetric | undefined;
