import type { PersonId, RoleId } from "@admin/world";
import type { Campaign, FlagId } from "./state.js";
/** `cabinet-departing:<role>:<person>`, standing from the announcement until the Secretary has gone. */
export declare function departingFlag(role: RoleId, person: PersonId): FlagId;
/** Whether this person has announced they are leaving this chair and has not yet gone. */
export declare function isDeparting(campaign: Campaign, role: RoleId, person: PersonId): boolean;
/** Whether the chair's holder is serving out an announced departure, so a successor may be sent up while they sit. */
export declare function awaitsSuccessor(campaign: Campaign, role: RoleId | undefined): boolean;
export type AnnouncedDeparture = {
    readonly role: RoleId;
    readonly person: PersonId;
    /** The week the departure was announced. */
    readonly announcedTurn: number;
};
/**
 * Every departure announced and not yet made, oldest first. One pass over the
 * flags, reading each announcement's week off its marker; an announcement with
 * no marker is dated to the week it is read, so it is never read as overdue.
 */
export declare function announcedDepartures(campaign: Campaign): readonly AnnouncedDeparture[];
