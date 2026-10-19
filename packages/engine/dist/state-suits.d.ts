import type { StateId } from "@admin/world";
import type { AdministrationParty, Campaign, UsMajorParty, UsParty } from "./state.js";
export type StateOpposition = {
    readonly stateId: StateId;
    readonly title: string;
    readonly reason: string;
};
export type StateOppositionSeat = {
    readonly id: StateId;
    readonly name: string;
    readonly party: UsParty | undefined;
};
/**
 * The first opposition governor among these seats, if any.
 *
 * `caucusAnchor` is read only when the president is independent. A missing
 * anchor is not filled in.
 */
export declare function pickStateOpposition(seats: readonly StateOppositionSeat[], president: AdministrationParty, caucusAnchor?: UsMajorParty): StateOpposition | null;
/** A standing opposition signal, or null when no state qualifies. */
export declare function stateOppositionThisWeek(campaign: Campaign): StateOpposition | null;
