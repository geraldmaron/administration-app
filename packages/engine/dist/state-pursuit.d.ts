import type { AgendaTheme, NationId } from "@admin/world";
import type { CausalId } from "./causality.js";
export type PursuitStatus = "active" | "achieved" | "abandoned";
export type PursuitBeat = {
    readonly turn: number;
    readonly description: string;
};
export type Pursuit = {
    readonly id: string;
    readonly actor: NationId;
    readonly target: NationId;
    readonly aim: AgendaTheme;
    readonly openedTurn: number;
    readonly commitment: number;
    readonly progress: number;
    readonly rungReached: number;
    readonly overt: boolean;
    readonly lastActedTurn: number;
    readonly status: PursuitStatus;
    readonly beats: readonly PursuitBeat[];
    readonly closedTurn?: number;
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
