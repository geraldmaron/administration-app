import type { Campaign } from "./state.js";
import { type InstitutionId, type OfficeId } from "./institutions.js";
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
export declare function selectSeatCalendar(campaign: Campaign): readonly SeatOpening[];
/** Only the seats due to open within the given number of days, soonest first. */
export declare function selectUpcomingSeats(campaign: Campaign, withinDays: number): readonly SeatOpening[];
