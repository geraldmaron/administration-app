import { daysBetween } from "@admin/engine";
import { plankById } from "@admin/world";
import { formatDate } from "../format/figures";
import { pledgeDoor, selectDuePledges } from "../record/promises";
import { PLACES, anchored, place } from "../navigation/places";
import { dayCount } from "../summons/clock-math";
// A promise from the platform coming due. It stops the week a fortnight out,
// which is the warning window the Record's own selector uses, because a
// president who is told on the day that a pledge has fallen due has only been
// told that it was broken. Further out it sits in the week ahead beside the
// calendar's dates, so a first-hundred-days promise is on the Desk from the
// first morning rather than only a fortnight before it lapses.
/** Inside a week the promise is past saving by ordinary means, and the row says so. */
const LAST_WEEK_DAYS = 7;
/** How far ahead an open promise earns a line in the week ahead: a first-hundred-days promise from the oath, with room to spare. */
export const PLEDGE_AHEAD_DAYS = 120;
function plankTitle(pledge) {
    return plankById.get(pledge.plank)?.title ?? String(pledge.plank);
}
// Both rows open where the promise is kept, not the Record that only files it.
function door(pledge) {
    return { href: pledgeDoor(pledge.plank)?.href ?? anchored(place.recordView("promises"), "promises"), icon: PLACES.policy.icon };
}
export function pledgeItem(campaign, pledge) {
    const days = Math.max(0, daysBetween(campaign.calendar, pledge.dueDate));
    const plank = plankTitle(pledge);
    return {
        id: `pledge:${pledge.id}`,
        source: "pledge",
        urgency: "soft",
        subject: `pledge:${pledge.id}`,
        title: `A promise comes due: ${plank}`,
        reason: days === 0
            ? `Your promise on ${plank} is due today. People will judge it kept or broken.`
            : `Your promise on ${plank} is due ${formatDate(pledge.dueDate)}. That day, people will judge if you kept it.`,
        ...door(pledge),
        stance: days <= LAST_WEEK_DAYS ? "adverse" : "caution",
        figure: dayCount(days),
        dueDate: pledge.dueDate,
    };
}
/** An open promise further out than its warning window, as a line in the week ahead. It never stops the week. */
export function pledgeAheadItem(campaign, pledge) {
    const plank = plankTitle(pledge);
    return {
        id: `pledge:${pledge.id}`,
        source: "pledge",
        urgency: "ambient",
        subject: `pledge:${pledge.id}`,
        title: `A promise is coming up: ${plank}`,
        reason: `Your promise on ${plank} is due ${formatDate(pledge.dueDate)}.`,
        ...door(pledge),
        stance: "neutral",
        figure: dayCount(Math.max(0, daysBetween(campaign.calendar, pledge.dueDate))),
        dueDate: pledge.dueDate,
    };
}
/**
 * Every open pledge inside its warning window, as a row the Desk stops for,
 * and every one due inside the next four months beyond it, as a line in the
 * week ahead. It reads the Record's own selector, so the Desk and the Promises
 * list agree on which pledges are close.
 */
export function pledgeItems(campaign) {
    const due = selectDuePledges(campaign);
    const warned = new Set(due.map((pledge) => pledge.id));
    const ahead = selectDuePledges(campaign, PLEDGE_AHEAD_DAYS).filter((pledge) => !warned.has(pledge.id));
    return [...due.map((pledge) => pledgeItem(campaign, pledge)), ...ahead.map((pledge) => pledgeAheadItem(campaign, pledge))];
}
