import { type AttentionUrgency, type Campaign, type GameDate } from "@admin/engine";
import type { MetricStance } from "../format/figures";
export type PendingItem = {
    readonly id: string;
    readonly title: string;
    /** What is happening and when it ends, in one plain sentence. */
    readonly line: string;
    /** Who the President is waiting on, where the row says. */
    readonly waitingOn?: string;
    /** Every page the wait belongs on (`nation:CN`, `person:…`, `treaty:…`, `sector:steel`). */
    readonly about: readonly string[];
    readonly href: string;
    readonly icon?: string;
    readonly stance: MetricStance;
    readonly urgency: AttentionUrgency;
    readonly dueDate: GameDate;
    readonly opened?: GameDate;
    /** Game days until it is due, from today's date. Zero or below means due now. */
    readonly daysLeft: number;
    /** How long the whole wait is, in days, where its start is known. */
    readonly windowDays?: number;
    /** How much of the wait is gone, 0 to 1, where the start or a statutory window is known. */
    readonly progress?: number;
    /** Whether its arrival or its deadline stops Continue. */
    readonly stops: boolean;
};
/** Everything the game is waiting on, soonest first. */
export declare function selectPending(campaign: Campaign): readonly PendingItem[];
/** What is pending on one subject's page: `pendingAbout(campaign, "nation:CN")`. */
export declare function pendingAbout(campaign: Campaign, key: string): readonly PendingItem[];
/** A row's door, by id, for a surface that only holds the id (a stop's matter). */
export declare function pendingHref(campaign: Campaign, id: string): string | undefined;
/** The countdown in words, for a screen reader and for the line under a ring. */
export declare function pendingSpoken(item: Pick<PendingItem, "daysLeft" | "windowDays">): string;
