import type { PersonId, RoleId } from "@admin/world";
import { type Campaign, type PersonRuntime } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
export { timesOverruled } from "./counsel-stance.js";
/**
 * What one call is worth.
 *
 * Overruling costs more than heeding pays, and deliberately: a chair notices
 * being ignored more than being agreed with, and a president who takes every
 * piece of advice they are given should not be able to farm a cabinet up to
 * total loyalty by never deciding anything themselves. Sized so a run of four
 * overrulings — the case worth showing a player — moves loyalty by a visible
 * eight points rather than by a rounding error.
 */
export declare const OVERRULED_COST = -0.02;
export declare const HEEDED_GAIN = 0.008;
/**
 * The signed move a single week's calls are worth to one chair.
 *
 * Read off the ledger's own counsel stamps rather than through the commitment
 * reader: a position reply carries no instrument and is still a decision the
 * room argued about, and it is the overwhelming majority of what a player
 * actually answers. Scoring only committed action would have made this rule
 * fire on roughly one reply in ten.
 */
export declare function loyaltyShiftFor(campaign: Campaign, role: RoleId, turn: number): number;
/**
 * The turn phase: what the week's decisions did to the room's regard for the
 * president.
 *
 * A minister who is not seated has no counsel to be overruled on, and the
 * player's own chair cannot resent itself.
 */
export declare const cabinetLoyaltyPhase: TurnPhase;
/** How far politics alone can take a Secretary's loyalty below where it stood when they were seated. */
export declare const POLITICAL_FLOOR = 0.1;
/** The week's political drift in one Secretary's loyalty, never below the floor it is bounded by. */
export declare function politicalShiftFor(campaign: Campaign, holder: PersonRuntime): number;
/** Nobody seated in a chair forgets everything they knew. */
export declare const COMPETENCE_DECAY_FLOOR = 0.3;
/** The week's fall in a Secretary's competence, zero unless their department is underwater. */
export declare function competenceDecayFor(campaign: Campaign, role: RoleId, holder: PersonRuntime): number;
/**
 * How far a seat's holder has moved from where they started, in points.
 *
 * Composed rather than stored, and absent where there is nothing to say: a
 * minister seated this week has no trend, and drawing one would be inventing a
 * history for someone who has none.
 */
export type LoyaltyTrend = {
    readonly person: PersonId;
    readonly now: number;
    readonly atAppointment: number;
    /** Signed, in whole points of loyalty — what a dossier prints. */
    readonly movedPoints: number;
};
export declare function selectLoyaltyTrend(campaign: Campaign, person: PersonId): LoyaltyTrend | undefined;
