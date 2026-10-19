import { type WorldGovernment } from "./world-governments";
export declare const WORLD_READINGS: readonly ["standing", "trend", "alignment", "trade", "forces"];
export type WorldReadingId = (typeof WORLD_READINGS)[number];
export declare function isWorldReading(value: unknown): value is WorldReadingId;
export type ReadingTone = "favorable" | "lean-favorable" | "neutral" | "caution" | "adverse" | "unread" | "seq-1" | "seq-2" | "seq-3" | "seq-4" | "none";
export type ReadingCell = {
    readonly tone: ReadingTone;
    readonly word: string;
};
export type LegendStep = {
    readonly tone: ReadingTone;
    readonly word: string;
};
/** Where a partner's share of US goods trade changes tone: a half percent, two, five. */
export declare const TRADE_CUTS: readonly [0.005, 0.02, 0.05];
/** What one government shows under one reading. */
export declare function readingCell(government: WorldGovernment, reading: WorldReadingId): ReadingCell;
export declare const READING_LEGENDS: Readonly<Record<WorldReadingId, readonly LegendStep[]>>;
