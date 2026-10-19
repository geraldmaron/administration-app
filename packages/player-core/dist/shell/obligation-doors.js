import { PLACES } from "../navigation/places";
import { subjectHint, subjectHref } from "./subject";
/**
 * The appropriation lapsing.
 *
 * A place rather than a subject: the appropriation record carries no id of its
 * own, only the turns it runs between, and there is exactly one of it at a
 * time. A pin that opens on an order's ruling or a standing authorization's
 * country is the `{ kind: "subject", ref }` shape, added here rather than
 * duplicated per rail.
 */
export const APPROPRIATION_DOOR = { kind: "place", place: "budget" };
/** Where a door actually sends the player. */
export function obligationHref(door) {
    if (!door)
        return undefined;
    return door.kind === "place" ? PLACES[door.place].href : subjectHref(door.ref);
}
/** What a screen reader hears about a pin's door, composed from the destination rather than authored per rail. */
export function obligationHint(door) {
    if (!door)
        return undefined;
    return door.kind === "place" ? `Opens ${PLACES[door.place].reference}.` : subjectHint(door.ref, door.name);
}
