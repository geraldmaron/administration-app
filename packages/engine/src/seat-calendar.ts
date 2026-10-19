import type { Campaign } from "./state.js";
import { INSTITUTION_CATALOG, type InstitutionId, type OfficeId } from "./institutions.js";
import { SEAT_TERM_START_DAYS } from "./institution-catalog.js";
import { campaignDay } from "./nomination.js";

// --- The seat calendar: when a fixed-term board's next chair opens ----------
//
// A confirmed appointment is not the end of the story on a multi-member board
// the way it is on a department: a Fed governor's fourteen years and an FTC
// commissioner's seven both run out on their own schedule, staggered from the
// day the body was founded rather than in a single bloc, and the President's
// whole lever over the seat is knowing when that day falls. Every reading
// here is derived from the catalog's own stagger table
// (`institution-catalog.ts`'s `SEAT_TERM_START_DAYS`) and the calendar, never
// stored, for the same reason the rest of this file's clocks are not: two
// reads of the same day always agree.

export type SeatOpening = {
  readonly office: OfficeId;
  readonly institution: InstitutionId;
  /** Which of the board's staggered seats this is, 0-indexed. */
  readonly seatIndex: number;
  readonly termYears: number;
  /** The campaign day this seat's current term runs out and a fresh nomination is due. */
  readonly opensDay: number;
};

/**
 * Every staggered seat on a fixed-term board, in the order its term next
 * opens. A seat whose term has not yet run out at all under this catalog's
 * stagger — every seat, on the day a campaign is founded — still has a real
 * `opensDay`: what founding does not do is empty the chair, because the
 * incumbent the branch seats at founding (`career-incumbents.ts`) is already
 * partway through the very term this reads the end of.
 */
export function selectSeatCalendar(campaign: Campaign): readonly SeatOpening[] {
  const day = campaignDay(campaign);
  const openings: SeatOpening[] = [];
  for (const institution of INSTITUTION_CATALOG) {
    for (const office of institution.offices) {
      const starts = SEAT_TERM_START_DAYS[office.id];
      if (!starts || office.termYears === undefined) continue;
      const termDays = office.termYears * 365;
      starts.forEach((start, seatIndex) => {
        const cyclesElapsed = Math.floor((day - start) / termDays);
        openings.push({
          office: office.id,
          institution: institution.id,
          seatIndex,
          termYears: office.termYears!,
          opensDay: start + (cyclesElapsed + 1) * termDays,
        });
      });
    }
  }
  return openings.sort((a, b) => a.opensDay - b.opensDay);
}

/** Only the seats due to open within the given number of days, soonest first. */
export function selectUpcomingSeats(campaign: Campaign, withinDays: number): readonly SeatOpening[] {
  const day = campaignDay(campaign);
  return selectSeatCalendar(campaign).filter((seat) => seat.opensDay - day <= withinDays);
}
