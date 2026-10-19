/**
 * The offices around the President that are not cabinet chairs.
 *
 * None of them is in `Charter.cabinetRoles`. The Vice President is elected on
 * the ticket rather than appointed, and the three staff posts are the
 * President's own hires with no Senate vote; seating any of them as a cabinet
 * chair would put them through the break rolls, confirmations and department
 * ownership that a secretary faces and they do not.
 */
export const VICE_PRESIDENT_ROLE_ID = "role-vice-president";
export const WHITE_HOUSE_STAFF_ROLE_IDS = [
    "role-chief-of-staff",
    "role-national-security-adviser",
    "role-press-secretary",
];
export const WHITE_HOUSE_ROLE_TITLES = {
    "role-vice-president": "Vice President",
    "role-chief-of-staff": "White House Chief of Staff",
    "role-national-security-adviser": "National Security Adviser",
    "role-press-secretary": "White House Press Secretary",
};
