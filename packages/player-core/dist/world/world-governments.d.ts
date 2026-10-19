import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { Stance } from "../reading";
import { type WorldRegionId } from "./world-regions";
export type TrendDirection = "warming" | "cooling" | "steady";
export type GovernmentTrend = {
    readonly direction: TrendDirection;
    readonly word: string;
    /** Their trust week by week, oldest first, for the line beside the word. */
    readonly values: readonly number[];
    /** The move over the last four closed weeks, in trust units (−2 to 2). */
    readonly change: number;
};
export type AlignmentKey = "aligned" | "leaning-aligned" | "neutral" | "leaning-opposed" | "opposed";
export declare const ALIGNMENT_WORDS: Readonly<Record<AlignmentKey, string>>;
/** Opposed first, aligned last, so a sorted column runs the way the word reads. */
export declare const ALIGNMENT_RANK: Readonly<Record<AlignmentKey, number>>;
export type WorldGovernment = {
    readonly nation: NationId;
    readonly name: string;
    readonly capital: string;
    readonly adjective: string;
    readonly href: string;
    readonly region: WorldRegionId | undefined;
    readonly regionName: string;
    /** Their view of the United States, as a band; "unread" where the services have no read. */
    readonly stance: Stance | "unread" | undefined;
    readonly standingWord: string;
    /** Their trust placed on the axis, 0..1; absent while unread. */
    readonly trust: number | undefined;
    /** What the United States thinks of them. */
    readonly ours: {
        readonly word: string;
        readonly stance: Stance;
    } | undefined;
    readonly trend: GovernmentTrend | undefined;
    readonly alignment: AlignmentKey;
    /** A binding alliance treaty with the United States. */
    readonly allied: boolean;
    /** Treaties and agreements in force between the two. */
    readonly treaties: number;
    readonly tradeShare: number;
    readonly tradeText: string;
    /** US personnel hosted. */
    readonly forces: number;
    readonly forcesText: string;
    readonly atWar: boolean;
};
/** A month of closed weeks that moves their trust by less than this reads as steady. */
export declare const TREND_FLAT = 0.01;
export declare function presenceWord(personnel: number, most: number): string;
/** Their current trust where the services read it. The band the standing carries is the word; this places it on the axis. */
export declare function theirTrust(campaign: Campaign, nation: NationId): number | undefined;
/** Every other government with every fact the World table and map read, ranked for nothing: callers sort. */
export declare function worldGovernments(campaign: Campaign): readonly WorldGovernment[];
