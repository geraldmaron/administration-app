import type { NationId, TreatyId } from "@admin/world";
import type { ChamberVote } from "./state-legislature.js";
export type TreatyKind = "alliance" | "trade" | "arms-control" | "executive-agreement";
export type TreatyStatus = "signed" | "ratified" | "in-force-by-signature" | "rejected" | "withdrawn";
export type TreatyRecord = {
    readonly id: string;
    /** The instrument as the relationship graph names it once it is in force. */
    readonly treaty: TreatyId;
    readonly title: string;
    readonly kind: TreatyKind;
    readonly counterpart: NationId;
    readonly signedTurn: number;
    readonly status: TreatyStatus;
    /** The Senate's count, once it has taken one. Absent for an instrument that never goes up. */
    readonly vote?: ChamberVote;
    readonly resolvedTurn?: number;
};
