import type { NationId } from "@admin/world";
import { type InstrumentId, type RungLevel } from "./instruments.js";
import { type ActionCounsel, type Campaign } from "./state.js";
export type LedgerCommitment = {
    readonly turn: number;
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly target?: NationId;
    readonly landed?: boolean;
    readonly counsel?: ActionCounsel;
};
/**
 * Every instrument commitment this administration made that the record can
 * still be read for, oldest first.
 */
export declare function readPlayerCommitments(campaign: Campaign): readonly LedgerCommitment[];
