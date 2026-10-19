import { type PlaceKey } from "../navigation/places";
import { type SubjectRef } from "./subject";
/**
 * Where a dated obligation on a term rail opens, decided once for every rail
 * that draws one.
 *
 * A pin on a term rail is a date with a durable thing behind it: an order a
 * bench has said it will rule on, the money the government is running on, the
 * country's own next election. Two rails building their own destinations
 * independently could send the same record to two different places; this is
 * the one table both read.
 *
 * `null` is a real answer: an inauguration or a fiscal year's own opening are
 * dated facts the office does not own and nothing can be opened to read.
 */
export type ObligationDoor = {
    readonly kind: "subject";
    readonly ref: SubjectRef;
    readonly name?: string;
} | {
    readonly kind: "place";
    readonly place: PlaceKey;
} | null;
/**
 * The appropriation lapsing.
 *
 * A place rather than a subject: the appropriation record carries no id of its
 * own, only the turns it runs between, and there is exactly one of it at a
 * time. A pin that opens on an order's ruling or a standing authorization's
 * country is the `{ kind: "subject", ref }` shape, added here rather than
 * duplicated per rail.
 */
export declare const APPROPRIATION_DOOR: ObligationDoor;
/** Where a door actually sends the player. */
export declare function obligationHref(door: ObligationDoor): string | undefined;
/** What a screen reader hears about a pin's door, composed from the destination rather than authored per rail. */
export declare function obligationHint(door: ObligationDoor): string | undefined;
