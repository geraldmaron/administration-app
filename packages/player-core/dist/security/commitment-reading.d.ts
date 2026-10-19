import { type Campaign, type CommitmentStatus, type EffectPacket } from "@admin/engine";
import type { ForceAssetId } from "@admin/world";
import { type ChoiceTable } from "../policy/choice-table.js";
export type SecurityCommitmentRow = {
    readonly id: string;
    readonly what: string;
    readonly kind: string;
    readonly status: CommitmentStatus;
    readonly statusWord: string;
    /** What it spends a week where it is paid in money; absent where it is paid in forces or has no price of its own. */
    readonly weekly?: string;
    readonly forces?: string;
    /** The force the commitment holds, so a screen can draw it with its glyph and unit. */
    readonly asset?: {
        readonly unitType: ForceAssetId;
        readonly count: number;
    };
    readonly review: string;
    readonly rationale: string;
    /** Wound-down commitments cannot be reopened. */
    readonly final: boolean;
};
export type CommitmentsReading = {
    readonly rows: readonly SecurityCommitmentRow[];
    /** The week's total of the money-paid commitments, as the engine charges it. */
    readonly weeklyBill: string;
};
/** The administration's commitments, those still standing first. */
export declare function commitmentsReading(campaign: Campaign): CommitmentsReading;
/** Resuming, suspending or winding down one commitment, each read as its change from today. */
export declare function commitmentChoices(campaign: Campaign, id: string): ChoiceTable | undefined;
export declare function commitmentOrder(campaign: Campaign, id: string, status: CommitmentStatus, reason: string): EffectPacket;
