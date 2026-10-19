import type { RoleId } from "@admin/world";
import type { Campaign } from "./state.js";
/**
 * A department's request for this week.
 *
 * Derived from the campaign. The same state yields the same proposal, and a
 * week in which no cabinet institution has crossed a trigger yields none.
 */
export type DepartmentProposal = {
    readonly role: RoleId;
    readonly reason: "vacancy" | "delivery";
    /** The campaign turn, which is the week the proposal belongs to. */
    readonly week: number;
};
export type DepartmentTrigger = {
    readonly role: RoleId;
    readonly reason: DepartmentProposal["reason"];
    readonly vacantDays: number;
    readonly quality: number;
    readonly staffScale: number;
};
/**
 * The department the desk hears from this week, if any.
 *
 * A proposal exists when a cabinet institution's chair is vacant, or when its
 * implementation quality has fallen below the line that already means the
 * body will not carry an instruction. The desk receives one, chosen by a
 * fixed order on the current state, so the same state always yields the same
 * proposal.
 */
export declare function proposeThisWeek(campaign: Campaign): DepartmentProposal | null;
/** Every cabinet department that has crossed a trigger this week, in catalog order. */
export declare function triggered(campaign: Campaign): readonly DepartmentTrigger[];
