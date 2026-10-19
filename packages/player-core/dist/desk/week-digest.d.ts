import { type Campaign, type FeedItem, type GameDate, type MetricSet } from "@admin/engine";
import type { StateId } from "@admin/world";
import { type ReadingMove, type RecordRow } from "../record/record-entry";
export type StateMove = {
    readonly id: StateId;
    readonly name: string;
    readonly before: number;
    readonly after: number;
    readonly delta: number;
    readonly text: string;
    readonly href: string;
};
export type WeekTab = {
    readonly week: number;
    readonly from: GameDate;
    /** Approval's move across the week, for the stepper's bar; absent where the series no longer holds the week. */
    readonly approvalDelta?: number;
};
export type WeekDigest = WeekTab & {
    readonly to: GameDate;
    readonly moves: readonly ReadingMove[];
    readonly acts: readonly RecordRow[];
    readonly world: readonly RecordRow[];
    readonly wire: readonly FeedItem[];
    /** The states whose approval rose most and fell most, largest first; a state that did not move is in neither. */
    readonly risers: readonly StateMove[];
    readonly fallers: readonly StateMove[];
    /** True when the series no longer holds the week's figures, so only its record and wire can be shown. */
    readonly scrolledOut: boolean;
};
/** The metric row the week opened on, or undefined where the bounded series has dropped it or it is the predecessor's. */
export declare function openingRow(campaign: Campaign, week: number): MetricSet | undefined;
export declare function closingRow(campaign: Campaign, week: number): MetricSet | undefined;
export declare function stateMoves(campaign: Campaign, week: number): readonly StateMove[];
/** Every closed week the digest can open, newest first. The term's first week has none before it to close. */
export declare function digestWeeks(campaign: Campaign): readonly WeekTab[];
/** One closed week as the digest reads it, or undefined for a week the term has not closed. */
export declare function weekDigest(campaign: Campaign, week: number): WeekDigest | undefined;
