import { POLICY_DOMAIN_SPECS, compareDates, daysBetween, plankDeliverable, plankTerms, } from "@admin/engine";
import { plankById } from "@admin/world";
import { anchored } from "../navigation/places";
import { subjectHref } from "../shell/subject";
/**
 * The order's own page for a pledge to sign one, and the domain's brief for a
 * pledge on a program, which is where adopting or dropping it is done. Before
 * this the Record and the Desk both pointed back at the Record, so a promise
 * never led the player to the one screen that could keep it.
 */
export function pledgeDoor(plank) {
    const deliverable = plankDeliverable(plank);
    if (!deliverable)
        return undefined;
    if (deliverable.kind === "sign-order")
        return { href: anchored(subjectHref({ kind: "order", id: deliverable.order }), "order-status"), label: "Open the order" };
    return {
        href: anchored(subjectHref({ kind: "brief", id: deliverable.domain }), "policy-proposals"),
        label: `Open the ${POLICY_DOMAIN_SPECS[deliverable.domain].name.toLowerCase()} policy page`,
    };
}
// A pledge names a plank by id, and a save outlives the build that wrote it.
// The catalog only ever adds planks, so a pledge whose plank is gone is a
// broken build rather than an old save, and it says so instead of rendering a
// row with no title.
function plankOf(pledge) {
    const plank = plankById.get(pledge.plank);
    if (!plank)
        throw new Error(`pledge "${pledge.id}" names plank "${pledge.plank}", which the platform catalog does not have`);
    return plank;
}
function promiseRow(pledge) {
    const terms = plankTerms(pledge.plank);
    const door = pledgeDoor(pledge.plank);
    return {
        id: pledge.id,
        plank: pledge.plank,
        title: plankOf(pledge).title,
        status: pledge.status,
        madeDate: pledge.madeDate,
        dueDate: pledge.dueDate,
        ...(pledge.settledDate ? { settledDate: pledge.settledDate } : {}),
        firstHundredDays: pledge.firstHundredDays,
        ...(terms ? { keptWhen: terms.keptWhen, brokenWhen: terms.brokenWhen } : {}),
        ...(door ? { door } : {}),
    };
}
/**
 * Every pledge the administration has made, as the Record shows them: soonest
 * due first, and in the order they were made where two share a date, so the
 * first-hundred-days promises lead and the list reads as the term's calendar.
 */
export function selectPromises(campaign) {
    return (campaign.pledges ?? [])
        .map((pledge, order) => ({ pledge, order }))
        .sort((a, b) => compareDates(a.pledge.dueDate, b.pledge.dueDate) || a.order - b.order)
        .map(({ pledge }) => promiseRow(pledge));
}
/** Two weeks: how long before a due date an open pledge starts to need the President. */
export const PLEDGE_WARNING_DAYS = 14;
/**
 * Open pledges falling due within `withinDays` of the campaign's date, nearest
 * first. One already past its date and not yet settled is the most urgent of
 * all, so it is included rather than dropped.
 */
export function selectDuePledges(campaign, withinDays = PLEDGE_WARNING_DAYS) {
    return (campaign.pledges ?? [])
        .filter((pledge) => pledge.status === "open" && daysBetween(campaign.calendar, pledge.dueDate) <= withinDays)
        .sort((a, b) => compareDates(a.dueDate, b.dueDate));
}
