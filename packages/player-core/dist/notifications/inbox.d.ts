import { type Campaign, type GameDate } from "@admin/engine";
import type { CalendarUrgency, EntityRef } from "../calendar/types";
import type { AttentionPolicySettings } from "../desk/attention";
/**
 * The notification center: what is waiting at the desk, what the world did
 * that the President should know, and what is coming up on the calendar.
 *
 * Derived on read. Read state is the caller's (`seen`), kept in preferences by
 * the app, so opening the inbox never writes to the campaign. A desk row is
 * never read: it is listed only while it is still owed, and opening it does
 * not answer it, so it counts until it leaves the desk.
 */
export type InboxSource = "desk" | "news" | "calendar";
export type InboxItem = {
    /** Stable across reads of the same campaign, so seen state keyed on it persists. */
    readonly id: string;
    readonly source: InboxSource;
    readonly title: string;
    readonly summary: string;
    readonly urgency: CalendarUrgency;
    readonly date: GameDate;
    readonly href?: string;
    /** Seen, for news and calendar rows; always false for a desk row, which counts until it is answered. */
    readonly read: boolean;
    /** Whether it waits on the President's answer, as against telling them something. */
    readonly actionable: boolean;
    readonly entityRefs: readonly EntityRef[];
};
export type Inbox = {
    readonly items: readonly InboxItem[];
    readonly unread: number;
    /** Unread items at each urgency. */
    readonly byUrgency: Readonly<Record<CalendarUrgency, number>>;
};
export type InboxSettings = {
    /** The player's desk settings, so the inbox and the desk agree on what is owed. */
    readonly attention?: AttentionPolicySettings;
    /** How many days ahead the calendar reaches into the inbox. */
    readonly calendarDays?: number;
    /** How many weeks of the wire are read for stories worth a notification. */
    readonly feedWeeks?: number;
    /** At most this many stories. */
    readonly feedLimit?: number;
};
export declare const INBOX_DEFAULTS: {
    readonly calendarDays: 7;
    readonly feedWeeks: 1;
    readonly feedLimit: 5;
};
/** Everything the notification center holds, worst first, with read state applied from `seen`. */
export declare function buildInbox(campaign: Campaign, seen: ReadonlySet<string>, settings?: InboxSettings): Inbox;
/** The seen set with `ids` added. A new set: the caller's is never touched. */
export declare function markSeen(seen: ReadonlySet<string>, ids: Iterable<string>): ReadonlySet<string>;
/**
 * The seen set kept to ids the inbox still holds, so the stored preference
 * does not grow for the length of a presidency.
 */
export declare function pruneSeen(seen: ReadonlySet<string>, inbox: Inbox): ReadonlySet<string>;
