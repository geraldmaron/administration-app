import { FIRST_HUNDRED_DAYS, addDays, campaignClock, campaignFoundingDate, compareDates, milestonesBetween, selectTermClock, } from "@admin/engine";
import { formatDate } from "../format/figures";
/** Every fixed date this term's own walk is built out of, oldest first. */
function waypointsOf(campaign) {
    const clock = campaignClock({
        currentDate: campaign.calendar,
        foundingDate: campaignFoundingDate(campaign),
        termNumber: selectTermClock(campaign).term,
    });
    const milestones = milestonesBetween(clock.termStartDate, clock.termEndDate);
    const midterm = milestones.find((milestone) => milestone.kind === "midterm-election");
    const reelection = milestones.find((milestone) => milestone.kind === "presidential-election");
    return [
        { key: "oath", label: `Term ${clock.termNumber} begins`, date: clock.termStartDate },
        { key: "hundred", label: "First hundred days", date: addDays(clock.termStartDate, FIRST_HUNDRED_DAYS) },
        ...(midterm ? [{ key: "midterm", label: "Midterm elections", date: midterm.date }] : []),
        ...(reelection ? [{ key: "reelection", label: "Re-election", date: reelection.date }] : []),
        { key: "next-oath", label: `Term ${clock.termNumber + 1} begins`, date: clock.termEndDate },
    ];
}
/**
 * This term's walk, marked at whichever station the campaign's own calendar
 * has most recently reached.
 *
 * Read off `campaignClock`/`milestonesBetween` rather than stored, so a rail
 * drawn today and one drawn after a week's Continue never disagree about
 * where the term stands — there is nothing here to fall out of date.
 */
export function termJourney(campaign) {
    const waypoints = waypointsOf(campaign);
    const reached = waypoints.filter((waypoint) => compareDates(waypoint.date, campaign.calendar) <= 0);
    const current = reached.length > 0 ? reached[reached.length - 1].key : waypoints[0].key;
    return waypoints.map((waypoint) => ({
        key: waypoint.key,
        label: waypoint.label,
        meta: formatDate(waypoint.date),
        active: waypoint.key === current,
    }));
}
