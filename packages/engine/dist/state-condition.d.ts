import type { CausalId } from "./causality.js";
import type { CityId, NationId, SectorId, StateId } from "@admin/world";
import type { ConditionKind } from "./condition-kinds.js";
export type ConditionScope = "city" | "region" | "nation";
export type ConditionStatus = "active" | "resolved";
export type ConditionBeat = {
    readonly turn: number;
    readonly description: string;
};
export type NationCondition = {
    readonly id: string;
    readonly nation: NationId;
    readonly kind: ConditionKind;
    readonly scope: ConditionScope;
    readonly severity: number;
    readonly startedTurn: number;
    readonly status: ConditionStatus;
    readonly beats: readonly ConditionBeat[];
    readonly endedTurn?: number;
    readonly city?: CityId;
    readonly state?: StateId;
    readonly sector?: SectorId;
    /**
     * The ledger event this record first appeared on.
     *
     * Written once by the record writer, from the event being folded, and
     * inherited by every later write of the same id. It is what lets the week
     * this record changes point back at the week it began, across a phase
     * boundary that carries nothing else.
     */
    readonly causedBy?: CausalId;
    /**
     * How long this record is meant to last.
     *
     * A condition is a thing a country lives through for weeks, and the weekly
     * rule that opens, worsens and closes one is written for exactly that. An
     * incident is not: a tornado touches down, the damage is the damage, and
     * nothing about next week is a worsening of it. Marking the record rather
     * than adding a second kind of record keeps one reader, one store and one id
     * scheme for both.
     *
     * Absent is the standing case, which is every condition written before this
     * field existed.
     */
    readonly lifetime?: "incident";
    /**
     * The place inside the nation this record is keyed to, where two of the same
     * kind can be open at once.
     *
     * The id is `condition:<kind>:<nation>:<turn>`, which makes two simultaneous
     * records of one kind in one country collide unless they opened on different
     * weeks — fine for a famine, wrong for two tornadoes on one afternoon in two
     * states. Absent keeps the old id exactly, so no condition written before
     * this field is re-keyed.
     */
    readonly place?: string;
};
