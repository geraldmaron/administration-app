import { type Campaign } from "@admin/engine";
import { type NationId } from "@admin/world";
export type PeerRule = "g7" | "neighbors" | "rivals" | "allies" | "power-tier";
export declare const PEER_RULES: readonly PeerRule[];
/** Enough to read as company, few enough for a matrix on a phone. */
export declare const PEER_SET_SIZE = 8;
export type PeerSet = {
    readonly rule: PeerRule;
    readonly label: string;
    /** How the set was chosen, one sentence. */
    readonly basis: string;
    /** Never includes the President's own government. */
    readonly nations: readonly NationId[];
    /** Why the set is empty, where it is. */
    readonly empty?: string;
};
/** A default comparison set for the President's government under one rule. */
export declare function peerSet(campaign: Campaign, rule: PeerRule): PeerSet;
