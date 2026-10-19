import type { CityId, NationId, PersonId, RoleId } from "@admin/world";
import type { Campaign, FlagId, NationRuntime } from "./state.js";
import type { EffectPacket, RelationshipScalars } from "./effects.js";
import type { MetricDeltas } from "./effect-types.js";
/**
 * Enter god mode. Irreversible by construction: the packet can only set the
 * flag, and `apply()` carries it forward past everything after it.
 *
 * Omniscience and removal immunity are their own rules now rather than two more
 * meanings folded into the flag, so entering by hand sets both in the same
 * packet. Without that, entering here would mark the campaign and grant neither,
 * which is not what anyone who opened the editor asked for.
 */
export declare function enableGodMode(campaign: Campaign): EffectPacket;
/** Record that the timeline was rewound to, or branched from, a given turn. */
export declare function recordBranchPoint(campaign: Campaign, turn: number): EffectPacket;
type DeepPartialOf<T> = T extends object ? {
    [K in keyof T]?: DeepPartialOf<T[K]>;
} : T;
export type NationEdit = {
    readonly setStats?: DeepPartialOf<NationRuntime["stats"]>;
    readonly setTraits?: DeepPartialOf<NationRuntime["traits"]>;
};
/** Write a nation's live stats or traits directly. Absolute values, not movement. */
export declare function editNationStat(campaign: Campaign, nation: NationId, edit: NationEdit): EffectPacket;
export type CityEdit = {
    readonly employment?: number;
    readonly adminLean?: number;
    readonly taxHolidayTurns?: number;
};
/** Write a city's live employment, lean, or remaining tax holiday. Clamped by apply(). */
export declare function editCity(campaign: Campaign, city: CityId, deltas: CityEdit): EffectPacket;
/** Write one directed relationship's scalars directly. */
export declare function editRelationship(campaign: Campaign, from: NationId, to: NationId, set: Partial<RelationshipScalars>): EffectPacket;
/** Open a war between any two nations, using the same constructor a real one uses. */
export declare function spawnConflict(campaign: Campaign, aggressor: NationId, defender: NationId, cause: string): EffectPacket;
/**
 * End a war by decree, through the same terminal transition an agreed
 * settlement takes. God mode does not get its own way to stop a war: a conflict
 * that ended outside `settleByAgreement` would carry a status no consequence
 * rule knows how to read.
 */
export declare function settleConflict(campaign: Campaign, conflictId: string, summary: string): EffectPacket;
/** Move the player's metrics by hand. Signed deltas, clamped like any other. */
export declare function grantMetrics(campaign: Campaign, deltas: MetricDeltas): EffectPacket;
/** Set or clear one campaign flag — the gate most authored content reads. */
export declare function setGodFlag(campaign: Campaign, flag: FlagId, held: boolean): EffectPacket;
/** Seat, or empty, any chair in the cabinet without an appointment. */
export declare function seatByDecree(campaign: Campaign, role: RoleId, person?: PersonId): EffectPacket;
export {};
