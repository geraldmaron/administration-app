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

const REMINDER_TITLE = "The Administration";

function matters(count: number): string {
  return count === 1 ? "One item is waiting for you." : `${count} items are waiting for you.`;
}

function holding(count: number, total: number): string {
  if (count === 0) return "";
  if (count === total) return count === 1 ? " You'll need to answer it before the next week can start." : " You'll need to answer each one before the next week can start.";
  return ` You'll need to answer ${count} of them before the next week can start.`;
}

export function reminderPlan(inbox: Inbox): ReminderPlan {
  const waiting = inbox.items.filter((item) => item.actionable && !item.read);
  const hard = waiting.filter((item) => item.urgency === "hard").length;
  if (waiting.length === 0) return { send: false, badge: 0, title: REMINDER_TITLE, body: "Nothing is waiting for you." };
  return { send: true, badge: waiting.length, title: REMINDER_TITLE, body: `${matters(waiting.length)}${holding(hard, waiting.length)}` };
}
