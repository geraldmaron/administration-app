import type { Campaign } from "./state.js";
import type { EffectPacket } from "./effects.js";
import { type BudgetAccount, type BudgetAllocation, type BudgetOutlook } from "./budget.js";
export type BudgetDraftInput = Partial<Record<BudgetAccount, number>>;
export type BudgetDraftCandidate = {
    readonly allocation: BudgetAllocation;
    readonly outlook: BudgetOutlook;
    readonly changed: readonly BudgetAccount[];
};
export type BudgetDraftResult = {
    readonly ok: true;
    readonly candidate: BudgetDraftCandidate;
} | {
    readonly ok: false;
    readonly reason: string;
};
export declare function projectBudgetDraft(campaign: Campaign, draft: BudgetDraftInput): BudgetDraftResult;
export type BudgetResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Put an appropriation in effect. Nothing is paid here — a budget is passed,
 * not spent, and every week of it is then collected by `budgetPhase`.
 */
export declare function enactBudget(campaign: Campaign, candidate: BudgetDraftCandidate): BudgetResult;
