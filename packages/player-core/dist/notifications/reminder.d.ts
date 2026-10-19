import type { Inbox } from "./inbox";
/**
 * What a local device reminder may say.
 *
 * Real time buys no world time: the world moves only when the President
 * presses Continue. So a reminder speaks only of what is already waiting, never
 * of anything having happened since the app was closed, and it is silent when
 * nothing unread waits on an answer.
 */
export type ReminderPlan = {
    /** Whether a reminder is worth sending at all. */
    readonly send: boolean;
    /** The badge count: unread items that wait on the President. */
    readonly badge: number;
    readonly title: string;
    readonly body: string;
};
export declare function reminderPlan(inbox: Inbox): ReminderPlan;
