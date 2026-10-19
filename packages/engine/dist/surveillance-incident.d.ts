import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
/** An agency act, not a refused presidential tasking. The IG later exposes this log to its target. */
export type SurveillanceIncident = {
    readonly id: string;
    readonly actor: "IC-NSA";
    readonly target: "known-us-person-in-united-states";
    readonly acquired: "private-domestic-message-content";
    readonly location: "united-states";
    readonly intentional: true;
    readonly consent: false;
    readonly fisaOrder: false;
    readonly statutoryException: false;
    readonly interceptTurn: number;
    readonly interceptDay: number;
    readonly auditLog: string;
    readonly exposedTurn?: number;
    readonly status: "recorded" | "exposed" | "damages-ordered" | "complied";
    readonly damages?: number;
    readonly compliedTurn?: number;
};
/** Produce a particular unauthorized collection act; a failed player tasking never enters this path. */
export declare function surveillancePackets(state: Campaign, day: number): readonly EffectPacket[];
/** Deletion is an agency compliance response after damages, not relief ordered by §1810. */
export declare function surveillanceCompliancePackets(state: Campaign): readonly EffectPacket[];
