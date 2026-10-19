import type { EffectPacket } from "./effects.js";
import type { Campaign } from "./state.js";
import { type AnnouncedDeparture } from "./cabinet-departing.js";
/** The weeks a Secretary serves after announcing, when no successor has been sent up. */
export declare const TRANSITION_WEEKS = 6;
/** An announced departure, as the Desk reads it: who, from which chair, and when they go if nobody is sent up. */
export type DepartureTransition = AnnouncedDeparture & {
    /** The week the Secretary leaves unless a successor is before the Senate by then. */
    readonly leavesTurn: number;
    /** Whether a successor's nomination is before the Senate, which keeps the Secretary on until it ends. */
    readonly successorPending: boolean;
};
/** Every announced departure still being served out, oldest first. */
export declare function selectDepartureTransitions(campaign: Campaign): readonly DepartureTransition[];
/**
 * The week's endings: a handover where the chair is no longer theirs, and an
 * exit through `vacates` where the transition has run out with nobody before
 * the Senate. `turn` is the week the packets are written for.
 */
export declare function transitionPackets(state: Campaign, turn: number): readonly EffectPacket[];
