import { type Campaign, type OutletFormat, type OutletStance } from "@admin/engine";
import type { Stance } from "../reading.js";
export declare const FORMAT_LABEL: Readonly<Record<OutletFormat, string>>;
export declare const STANCE_WORD: Readonly<Record<OutletStance, string>>;
export declare const STANCE_TONE: Readonly<Record<OutletStance, Stance>>;
/** "about one American adult in four", from a weekly reach. */
export declare function reachWords(reach: number): string;
export declare function credibilityWords(credibility: number): string;
export type DeskReason = {
    readonly reason: string;
    /** Toward the administration, or away from it. */
    readonly direction: "toward" | "away";
    readonly strength: "strongly" | "somewhat" | "slightly";
};
export type DeskProfile = {
    readonly id: string;
    readonly name: string;
    readonly format: string;
    readonly region?: string;
    readonly beat: string;
    readonly reach: string;
    /** The share of American adults the desk reaches each week, 0..1: the figure the reach sentence is said from. */
    readonly reachShare: number;
    /** Its reach as a share of the widest desk on the roster, 0..1, the scale the landscape draws on. */
    readonly reachOfWidest: number;
    readonly credibility: string;
    readonly stance: OutletStance;
    readonly stanceWord: string;
    readonly tone: Stance;
    /** Where the record is taking it next. */
    readonly heading: "warming" | "cooling" | "settled";
    /** Why it sits where it does, strongest first. */
    readonly reasons: readonly DeskReason[];
    /** How many smaller reasons were left off the list. */
    readonly folded: number;
    /** The groups most over-represented among its readers. */
    readonly readers: readonly string[];
};
/** Every desk's profile, hostile end first, the order the engine draws the spectrum in. */
export declare function deskProfiles(campaign: Campaign): readonly DeskProfile[];
export declare function deskProfile(campaign: Campaign, id: string): DeskProfile | undefined;
export type DeskFiling = {
    readonly index: number;
    readonly headline: string;
};
/**
 * The stories this masthead actually carried, newest first, read back off the
 * same pick the composer uses, so a headline listed under a desk opens under
 * the same desk on the dispatch page.
 */
export declare function deskFilings(campaign: Campaign, outletId: string, limit?: number): readonly DeskFiling[];
export type EngagementRow = {
    readonly id: string;
    readonly when: string;
    readonly play: string;
    readonly desk?: string;
    readonly wentWell: boolean;
    readonly summary: string;
};
/** Every time the administration went in front of the press, newest first. */
export declare function pressHistory(campaign: Campaign): readonly EngagementRow[];
/**
 * How long it has been since anyone at the White House took a question, which
 * is half of what the corps is reading: past six weeks, the silence is the story.
 */
export declare function silenceWords(campaign: Campaign): string;
export type CoverageTrend = {
    /** Running tally of the last outings, oldest first: +1 for one that went well, -1 for one that did not. */
    readonly values: readonly number[];
    readonly tone: Stance;
    readonly summary: string;
};
/**
 * Which way coverage has been running, read off the administration's own
 * record of engagements. No history of the corps's standing is kept, and this
 * does not invent one. Undefined before the second outing: one point is a
 * fact, not a trend.
 */
export declare function pressCoverageTrend(campaign: Campaign, limit?: number): CoverageTrend | undefined;
