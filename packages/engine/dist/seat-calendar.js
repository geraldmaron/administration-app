import { INSTITUTION_CATALOG } from "./institutions.js";
import { SEAT_TERM_START_DAYS } from "./institution-catalog.js";
import { campaignDay } from "./nomination.js";
/**
 * Every staggered seat on a fixed-term board, in the order its term next
 * opens. A seat whose term has not yet run out at all under this catalog's
 * stagger — every seat, on the day a campaign is founded — still has a real
 * `opensDay`: what founding does not do is empty the chair, because the
 * incumbent the branch seats at founding (`career-incumbents.ts`) is already
 * partway through the very term this reads the end of.
 */
export function selectSeatCalendar(campaign) {
    const day = campaignDay(campaign);
    const openings = [];
    for (const institution of INSTITUTION_CATALOG) {
        for (const office of institution.offices) {
            const starts = SEAT_TERM_START_DAYS[office.id];
            if (!starts || office.termYears === undefined)
                continue;
            const termDays = office.termYears * 365;
            starts.forEach((start, seatIndex) => {
                const cyclesElapsed = Math.floor((day - start) / termDays);
                openings.push({
                    office: office.id,
                    institution: institution.id,
                    seatIndex,
                    termYears: office.termYears,
                    opensDay: start + (cyclesElapsed + 1) * termDays,
                });
            });
        }
    }
    return openings.sort((a, b) => a.opensDay - b.opensDay);
}
/** Only the seats due to open within the given number of days, soonest first. */
export function selectUpcomingSeats(campaign, withinDays) {
    const day = campaignDay(campaign);
    return selectSeatCalendar(campaign).filter((seat) => seat.opensDay - day <= withinDays);
}
