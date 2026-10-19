import type { RoleId } from "@admin/world";
import { type ActionRecord, type Campaign } from "./state.js";
import { type BudgetAccount } from "./budget.js";
import type { EffectPacket } from "./effects.js";
export type PurchasingOpportunity = {
    readonly account: BudgetAccount;
    readonly annualShare: number;
    readonly departmentShare: number;
    readonly annualPurchasing: number;
    readonly reach: number;
};
/** The largest live purchasing line this chair controls; reserve transfers are not contracts. */
export declare function purchasingOpportunity(campaign: Campaign, role: RoleId): PurchasingOpportunity | undefined;
/** One opportunity per fiscal year, in its opening week, on the enacted allocation. */
export declare function graftYear(campaign: Campaign): number | undefined;
/** Hidden misconduct becomes player-readable only when the inspector's finding is public. */
export declare function graftDisclosed(campaign: Campaign, entry: ActionRecord): boolean;
export declare function cabinetGraftPackets(campaign: Campaign): readonly EffectPacket[];
