import type { CausalId } from "./causality.js";
import type { NationId, StateId } from "@admin/world";
import type { ConditionKind } from "./condition-kinds.js";
/**
 * Where a declaration reaches. A state-scoped declaration cannot authorize an
 * order against the rest of the country, which is the whole reason scope is
 * stored rather than implied.
 */
export type EmergencyScope = {
    readonly kind: "nation";
} | {
    readonly kind: "state";
    readonly state: StateId;
};
export type DeclaredEmergency = {
    readonly id: string;
    readonly scope: EmergencyScope;
    /** What it was declared over — the condition kind, for the record and the press. */
    readonly cause: ConditionKind | "armed-conflict";
    readonly declaredTurn: number;
    /**
     * When it was last renewed. A declaration lapses without renewal, which is
     * the mechanic: declaring is popular and cheap, and it is *keeping* one that
     * costs, so the interesting decision is when to give the power back.
     */
    readonly renewedTurn: number;
    readonly endedTurn?: number;
    readonly reason: string;
    /** A live war involving the United States that justified use of the armed forces at declaration. */
    readonly armedForcesConflictId?: string;
    /**
     * The ledger event this record first appeared on.
     *
     * Written once by the record writer, from the event being folded, and
     * inherited by every later write of the same id. It is what lets the week
     * this record changes point back at the week it began, across a phase
     * boundary that carries nothing else.
     */
    readonly causedBy?: CausalId;
};
/** A separately dated IEEPA finding; a domestic disaster declaration cannot supply it. */
export type ExternalThreatEmergency = {
    readonly id: string;
    readonly target: NationId;
    readonly pursuitId: string;
    readonly finding: "national-security" | "foreign-policy" | "economy";
    readonly declaredTurn: number;
    readonly expiresTurn: number;
    readonly endedTurn?: number;
    readonly causedBy?: CausalId;
};
