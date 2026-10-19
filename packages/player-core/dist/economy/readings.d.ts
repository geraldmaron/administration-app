import { type Campaign, type CyclePhase } from "@admin/engine";
import type { Stance } from "../reading";
export type EconomyTileKey = "inflation" | "unemployment" | "growth";
/** Which way a figure moved since the oath, and whether that is good news. */
export type EconomyChange = {
    readonly text: string;
    readonly better: boolean;
    readonly up: boolean;
};
/**
 * The live economy as the Desk's snapshot row shows it, beside the five
 * metrics: prices, jobs and growth are what a public judges an administration
 * by, and a Desk that shows only budget authority reads as if they were not.
 */
export type EconomyTile = {
    readonly key: EconomyTileKey;
    readonly caption: string;
    readonly figure: string;
    readonly stance: Stance;
    readonly stanceWord: string;
    /** Oldest first, this week last: where the term began, then now. */
    readonly series: readonly number[];
    readonly href: string;
    /** The move since the oath, when there has been one worth a tenth of a point. */
    readonly change?: EconomyChange;
};
/**
 * Prices, jobs and growth as they stand this week, each read against the
 * economy the term began on. There is no stored economic history yet, so the
 * sparkline is honest about what it knows: where the term started and now.
 */
export declare function economyTiles(campaign: Campaign): readonly EconomyTile[];
export declare function isEconomyTileKey(id: string): id is EconomyTileKey;
/** One term the rate adds to or takes off the public's sense of being better off. */
export type EconomyApprovalTerm = {
    readonly label: string;
    /** Signed, in points of the prosperity judgment. */
    readonly points: number;
    readonly detail: string;
};
/** A rate opened up: where it is, where it started, where it rests, and what it does to approval. */
export type EconomyReading = {
    readonly tile: EconomyTile;
    readonly startFigure: string;
    /** The published figure this economy rests on, when a source publishes one. */
    readonly rest?: {
        readonly figure: string;
        readonly percent: number;
        readonly source: string;
        readonly year: number;
    };
    readonly cycle: CyclePhase;
    readonly approval: readonly EconomyApprovalTerm[];
};
export declare function economyReading(campaign: Campaign, key: EconomyTileKey): EconomyReading | undefined;
export * from "./markets";
export * from "./market-releases";
export * from "./market-levers";
export * from "./lever-comparison";
export * from "./state-economy";
