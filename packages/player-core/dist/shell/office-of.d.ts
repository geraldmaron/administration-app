import { type InstitutionId } from "@admin/engine";
import type { RoleId } from "@admin/world";
/** The element id of the office page's section where the chair's pending acts are answered. */
export declare const OFFICE_ACTIONS_ANCHOR = "office-actions";
/** The office a body is led from: its first, chair office. */
export declare function officeOfInstitution(institution: InstitutionId): string | undefined;
/** The office a cabinet or White House role sits in. Takes the plain string the seat rosters carry; an unknown role has none. */
export declare function officeOfRole(role: RoleId | string): string | undefined;
/** The office page for a role, opened on its pending acts; Washington where the role has no office. */
export declare function roleActionsHref(role: RoleId | string): string;
/** The office page for a role; Washington where the role has no office. */
export declare function roleOfficeHref(role: RoleId | string): string;
/** The office page for a body, opened on its pending acts; Washington where it has no office. */
export declare function institutionActionsHref(institution: InstitutionId): string;
