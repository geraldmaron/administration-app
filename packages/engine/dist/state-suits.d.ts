import type { StateId } from "@admin/world";
import type { StateStandingBasis } from "./order-exposure.js";
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
/**
 * How each state fills the office that sues. Forty-three states and the
 * District elect it; five governors appoint it, Maine's legislature elects it
 * and Tennessee's supreme court appoints it. Secondary source: Wikipedia,
 * "State attorney general" (citing NAAG), opened 2026-10-25.
 */
export type AttorneyGeneralSelection = "elected" | "governor" | "legislature" | "state-court";
export declare function attorneyGeneralSelection(state: StateId): AttorneyGeneralSelection;
/**
 * The chance the state's attorney general belongs to the party opposite the
 * President's. A governor's appointee follows the governor; an elected officer
 * follows the state's own lean, because attorneys general are elected
 * separately and often differ from the governor. Expected, not drawn, so the
 * projection a President reads stays seed-independent.
 */
export declare function opposingAttorneyGeneral(campaign: Campaign, state: StateId): number;
/** What a court lets a state claim: its own money in full, its residents' harm much less. */
export declare const STATE_STANDING_WEIGHT: Readonly<Record<StateStandingBasis, number>>;
/** Below this a state is not a plausible named plaintiff. */
export declare const STATE_PLAINTIFF_FLOOR = 0.1;
export type StatePlaintiff = {
    readonly stateId: StateId;
    readonly name: string;
    readonly weight: number;
};
export declare function statePartyName(state: StateId, name: string): string;
/**
 * The states that would sue, strongest first: injury the state can claim,
 * times the chance its attorney general opposes the administration, times how
 * loud the act is. Injuries are relative, 0..1 per state.
 */
export declare function statePlaintiffs(campaign: Campaign, injuries: Readonly<Partial<Record<StateId, number>>>, basis: StateStandingBasis, loudness: number): readonly StatePlaintiff[];
