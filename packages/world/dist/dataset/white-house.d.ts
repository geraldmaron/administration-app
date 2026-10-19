import type { PersonId } from "../schemas/ids.js";
/**
 * The offices around the President that are not cabinet chairs.
 *
 * None of them is in `Charter.cabinetRoles`. The Vice President is elected on
 * the ticket rather than appointed, and the three staff posts are the
 * President's own hires with no Senate vote; seating any of them as a cabinet
 * chair would put them through the break rolls, confirmations and department
 * ownership that a secretary faces and they do not.
 */
export declare const VICE_PRESIDENT_ROLE_ID = "role-vice-president";
export declare const WHITE_HOUSE_STAFF_ROLE_IDS: readonly ["role-chief-of-staff", "role-national-security-adviser", "role-press-secretary"];
export type WhiteHouseStaffRoleId = (typeof WHITE_HOUSE_STAFF_ROLE_IDS)[number];
export type WhiteHouseRoleId = typeof VICE_PRESIDENT_ROLE_ID | WhiteHouseStaffRoleId;
export declare const WHITE_HOUSE_ROLE_TITLES: Readonly<Record<WhiteHouseRoleId, string>>;
/** Who holds each staff post. A post nobody was picked for is absent, not null. */
export type WhiteHouseStaff = Readonly<Partial<Record<WhiteHouseStaffRoleId, PersonId>>>;
