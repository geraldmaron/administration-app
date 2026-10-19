const REMINDER_TITLE = "The Administration";
function matters(count) {
    return count === 1 ? "One item is waiting for you." : `${count} items are waiting for you.`;
}
function holding(count, total) {
    if (count === 0)
        return "";
    if (count === total)
        return count === 1 ? " You'll need to answer it before the next week can start." : " You'll need to answer each one before the next week can start.";
    return ` You'll need to answer ${count} of them before the next week can start.`;
}
export function reminderPlan(inbox) {
    const waiting = inbox.items.filter((item) => item.actionable && !item.read);
    const hard = waiting.filter((item) => item.urgency === "hard").length;
    if (waiting.length === 0)
        return { send: false, badge: 0, title: REMINDER_TITLE, body: "Nothing is waiting for you." };
    return { send: true, badge: waiting.length, title: REMINDER_TITLE, body: `${matters(waiting.length)}${holding(hard, waiting.length)}` };
}
