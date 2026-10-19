import type { Campaign, FeedItem, GameDate, MetricSet } from "@admin/engine";
import { type RecordRow } from "../record/record-entry";
import { type StateMove, type WeekDigest } from "./week-digest";
/** How many weeks the picker chart draws at once: a quarter, the span a trend is read over. */
export declare const DIGEST_WINDOW = 13;
export type DigestDirection = "up" | "down" | "flat";
export type WeekBar = {
    readonly week: number;
    readonly from: GameDate;
    /** Approval's move across the week; absent where the series no longer holds the week. */
    readonly delta?: number;
    /** The move against the largest in the window, -1..1. */
    readonly share: number;
    readonly current: boolean;
};
export type DigestKpi = {
    readonly key: keyof MetricSet;
    readonly label: string;
    readonly href: string;
    /** False where the series no longer holds this week's figures. */
    readonly known: boolean;
    readonly beforeText?: string;
    readonly afterText?: string;
    /** Where the reading closed in its own range, 0..1, and where it opened. */
    readonly afterFraction?: number;
    readonly beforeFraction?: number;
    readonly text: string;
    readonly direction: DigestDirection;
    /** The move in range fractions, against the largest of the five: -1..1. Every reading is better higher. */
    readonly share: number;
};
export type StateTile = StateMove & {
    readonly share: number;
};
export type ActGroup = {
    readonly domain: string;
    readonly label: string;
    readonly rows: readonly RecordRow[];
    /** Entries whose readings netted up, and netted down, so the group's head says whether it helped. */
    readonly helped: number;
    readonly hurt: number;
};
export type WireLine = {
    readonly index: number;
    readonly headline: string;
    readonly intelligence: boolean;
    /** The subject's screen, where the item names one. */
    readonly href?: string;
    readonly subject?: string;
};
export type WireGroup = {
    readonly kind: FeedItem["kind"];
    readonly label: string;
    readonly lines: readonly WireLine[];
};
export type DigestView = {
    readonly digest: WeekDigest;
    readonly latest: boolean;
    readonly bars: readonly WeekBar[];
    readonly olderWeek?: number;
    readonly newerWeek?: number;
    readonly kpis: readonly DigestKpi[];
    /** Every state whose approval moved, for the tile map; empty where the week is older than the state series. */
    readonly tiles: readonly StateTile[];
    readonly acts: readonly ActGroup[];
    readonly world: readonly ActGroup[];
    readonly wire: readonly WireGroup[];
};
/** Where each reading is owned: approval in public opinion, the books in the budget, force in national security. */
export declare function kpiHref(key: keyof MetricSet): string;
/** Rows grouped by the domain they moved, in a fixed domain order, each group saying how many helped and how many cost. */
export declare function groupRows(rows: readonly RecordRow[]): readonly ActGroup[];
/** One closed week composed for the digest screen, or undefined for a week the term has not closed. */
export declare function digestView(campaign: Campaign, week: number): DigestView | undefined;
