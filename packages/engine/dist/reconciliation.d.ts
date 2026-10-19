import { type LegislativeAct } from "./legislative-acts.js";
import type { EffectPacket } from "./effects.js";
import type { BudgetResolution, BudgetSubject, Campaign } from "./state.js";
export declare function reconciliationSubject(act: LegislativeAct): BudgetSubject | undefined;
/** A bill has the expedited route only after both chambers adopted its specific instruction. */
export declare function hasReconciliationInstruction(campaign: Campaign, act: LegislativeAct, billId: string): boolean;
/** The effective floor procedure, including old saves without a budget resolution. */
export declare function legislativeTrack(campaign: Campaign, act: LegislativeAct, billId?: string): "ordinary" | "reconciliation" | "privileged";
export type BudgetResolutionResult = {
    readonly ok: true;
    readonly record: BudgetResolution;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/** Ask the chambers to adopt a narrow budget instruction for a pending bill. */
export declare function requestBudgetResolution(campaign: Campaign, billId: string): BudgetResolutionResult;
