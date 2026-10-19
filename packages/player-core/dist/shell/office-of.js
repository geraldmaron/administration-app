import { institutionDef, institutionForRole } from "@admin/engine";
import { WHITE_HOUSE_OFFICE_ROLE } from "../government/executive-tree";
import { anchored, place } from "../navigation/places";
// A role id ("role-foreign-minister") is not an office id ("OFF-STATE-SEC"),
// and the office page only reads office ids: a door built from the role lands
// on "No such office". Every door that starts from a role or a body asks here.
/** The element id of the office page's section where the chair's pending acts are answered. */
export const OFFICE_ACTIONS_ANCHOR = "office-actions";
const WHITE_HOUSE_OFFICE_OF_ROLE = new Map(Object.entries(WHITE_HOUSE_OFFICE_ROLE).map(([office, role]) => [role, office]));
/** The office a body is led from: its first, chair office. */
export function officeOfInstitution(institution) {
    return institutionDef(institution)?.offices[0]?.id;
}
/** The office a cabinet or White House role sits in. Takes the plain string the seat rosters carry; an unknown role has none. */
export function officeOfRole(role) {
    const department = institutionForRole(role);
    return department ? officeOfInstitution(department.id) : WHITE_HOUSE_OFFICE_OF_ROLE.get(role);
}
/** The office page for a role, opened on its pending acts; Washington where the role has no office. */
export function roleActionsHref(role) {
    const office = officeOfRole(role);
    return office ? anchored(place.officeView(office, "actions"), OFFICE_ACTIONS_ANCHOR) : place.washington();
}
/** The office page for a role; Washington where the role has no office. */
export function roleOfficeHref(role) {
    const office = officeOfRole(role);
    return office ? place.office(office) : place.washington();
}
/** The office page for a body, opened on its pending acts; Washington where it has no office. */
export function institutionActionsHref(institution) {
    const office = officeOfInstitution(institution);
    return office ? anchored(place.officeView(office, "actions"), OFFICE_ACTIONS_ANCHOR) : place.washington();
}
