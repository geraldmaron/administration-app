import type { Campaign } from "./state.js";
export declare const TREASURY_REFERENCE = 500000;
export declare function treasuryHealth(treasury: number): number;
/**
 * One entry in the record of what moved the headline.
 *
 * Named a move rather than a driver on purpose: `OpinionDriver` is already the
 * name of the six standing judgments a public holds, and these are packets in
 * the ledger, not judgments.
 */
export type ApprovalMove = {
    readonly turn: number;
    readonly description: string;
    readonly approvalDelta: number;
};
export declare function selectApprovalMoves(campaign: Campaign, sinceTurn?: number): readonly ApprovalMove[];
