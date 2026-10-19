import { type RoleId } from "@admin/world";
import type { InstrumentId } from "./instruments.js";
import type { PolicyDomain } from "./policy.js";
import type { Campaign } from "./state.js";
export type BudgetAccountId = InstrumentId | "domestic";
export type DepartmentOwnership = {
    readonly role: RoleId;
    readonly instruments: readonly InstrumentId[];
    readonly policyDomains: readonly PolicyDomain[];
    readonly scenarioClasses: readonly string[];
    readonly budgetAccounts: readonly BudgetAccountId[];
};
/** One department's part of an account several departments spend. */
export type DepartmentShare = {
    readonly role: RoleId;
    readonly share: number;
};
/** The department that wields an instrument, or undefined where the charter has no table. */
export declare function instrumentDepartment(charter: string, instrument: InstrumentId): RoleId | undefined;
/** The department that delivers a program domain, or undefined where the charter has no table. */
export declare function policyDomainDepartment(charter: string, domain: PolicyDomain): RoleId | undefined;
/**
 * The departments with standing in a class of matter, owner first, or undefined
 * where the charter has no table. A tabled charter answers an unknown class with
 * nobody rather than a guess.
 */
export declare function scenarioClassDepartments(charter: string, scenarioClass: string | undefined): readonly RoleId[] | undefined;
/** Who a spoken answer on a matter of no known class goes to, or undefined where the charter has no table. */
export declare function unclassedDepartment(charter: string, atHome: boolean): RoleId | undefined;
/** The department that carries out an executive order, or undefined where the charter has no table or no row for it. */
export declare function orderDepartment(charter: string, orderId: string): RoleId | undefined;
/** The chair that reviews a proposed order for form and legality, or undefined where the charter has no table. */
export declare function orderReviewer(charter: string): RoleId | undefined;
/**
 * The departments that spend an account, each with the share it spends, or
 * undefined where the charter has no table. An instrument's account is its
 * department's alone; the domestic line is split by appropriation.
 */
export declare function accountDepartments(charter: string, account: BudgetAccountId): readonly DepartmentShare[] | undefined;
/** The department a chair runs, or nothing where the chair owns no instrument, program or account. */
export declare function ownershipOf(campaign: Campaign, role: RoleId): DepartmentOwnership | undefined;
