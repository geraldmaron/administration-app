/**
 * Each caucus's own reading of a bill, small enough to nudge a count.
 *
 * Absent on an act with no domestic signature, and then the floor count is
 * the one it was: one support figure for the whole chamber.
 */
import type { UsMajorParty } from "./state-legislature.js";
import type { DomesticSignature } from "./domestic-signature.js";
import { type Campaign } from "./state.js";
export type CaucusReadings = {
    readonly administration: number;
    readonly opposition: number;
};
export declare function readingsFor(signature: DomesticSignature, anchor: UsMajorParty): CaucusReadings;
/**
 * The room's support as each caucus actually reads it: the chamber's own figure,
 * plus that caucus's reading of the act, plus what the sponsor is worth inside
 * it. One clamp, at the end, so a caucus cannot be carried past certainty by one
 * term and then pulled back under it by the next.
 *
 * With neither term this is the figure it was — one support figure for the whole
 * chamber — which is what a count on an act nobody's platform has anything to
 * say about honestly is.
 */
export declare function splitSupport(support: number, readings?: CaucusReadings, sponsor?: CaucusReadings): {
    readonly own: number;
    readonly opposition: number;
};
/**
 * The signature of the measure the chambers are actually working.
 *
 * One measure, and the oldest live one: a caucus reads the bill in front of it,
 * and a room with three bills moving is a room whose leadership is being lobbied
 * about the one that is furthest along. An act with no signature — a stopgap, a
 * ceiling — says nothing about the country, and then there is nothing for a
 * platform to agree with.
 */
export declare function liveSignature(campaign: Campaign): DomesticSignature | undefined;
