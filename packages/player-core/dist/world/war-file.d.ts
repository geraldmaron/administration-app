import { type Base, type Campaign, type WarLossBand, type Conflict, type ConflictSide, type Effect, type JoinCounterfactual, type LikelyJoiner, type MunitionsReading } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ReasonLine } from "../reasons/reason-lines";
export type WarJoiner = {
    readonly nation: NationId;
    readonly side: ConflictSide;
    /** Empty where law 8's fog holds or no decision was stamped: the surface then prints "Joined" alone. */
    readonly reasons: readonly ReasonLine[];
};
export type WarFileReading = {
    readonly conflictId: string;
    readonly conflict: Conflict;
    readonly joiners: readonly WarJoiner[];
    readonly notableNonJoiners: readonly NationId[];
    /** Fogged: who the join projection expects on each side, without a draw. */
    readonly likelyJoiners: Readonly<Record<ConflictSide, readonly LikelyJoiner[]>>;
    readonly casualties: Readonly<Record<ConflictSide, WarLossBand | undefined>>;
    /** Declared arsenal, per belligerent still in the fight; undefined where fogged or never declared. */
    readonly arsenals: ReadonlyMap<NationId, number | undefined>;
    readonly munitions: MunitionsReading | undefined;
    readonly bases: readonly Base[];
    /** What signing a settlement would do, previewed before it is taken. */
    readonly settlement: readonly Effect[];
    readonly counterfactuals: (nation: NationId) => JoinCounterfactual | undefined;
};
/** One war's file. Undefined for a conflict not on the board. */
export declare function warFileReading(campaign: Campaign, conflictId: string): WarFileReading | undefined;
