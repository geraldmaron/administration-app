import { genericCharters } from "./charters.js";
import { NATION_LEADER_CONSTRAINTS } from "./nation-leaders.generated.js";
import { worldNations } from "./nations.js";
import { usaCharter } from "./usa.js";
import { ROYAL_HOUSES } from "./name-forms.js";
const ROLES_BY_CHARTER = new Map([usaCharter, ...genericCharters].map((charter) => [charter.id, charter.cabinetRoles]));
const ROLES_BY_NATION = new Map(worldNations.map((nation) => [nation.id, ROLES_BY_CHARTER.get(nation.identity.government) ?? []]));
/** The chairs a nation's charter seats, the lead chair first. */
export function nationCabinetRoles(nation) {
    return ROLES_BY_NATION.get(nation) ?? [];
}
/**
 * The chair a nation's charter seats first: the one a US President deals with
 * as the counterpart, and the one the leader table's row describes.
 */
export function nationLeadRole(nation) {
    return nationCabinetRoles(nation)[0];
}
/**
 * What the lead chair's holder is held to, and nothing for any other chair.
 *
 * The table describes one person per government, so a minister or an
 * opposition leader reads no row: their chairs are drawn from the cabinet's
 * priors instead (`nationGenderPriorFor`).
 */
export function leaderConstraintFor(nation, role) {
    if (nationLeadRole(nation) !== role)
        return undefined;
    return NATION_LEADER_CONSTRAINTS[nation];
}
/**
 * What a nation calls the chair its charter seats first: "Federal Chancellor"
 * where the generic charter would say "Prime Minister". Undefined for any
 * other chair and for a nation the leader table has no row for, so a caller
 * falls back to the charter's own title.
 */
export function nationRoleTitle(nation, role) {
    return leaderConstraintFor(nation, role)?.title;
}
/**
 * The reigning house of the monarch or heir who holds a nation's lead chair;
 * undefined for every other chair and every nation not ruled by one.
 */
export function royalHouseFor(nation, role) {
    return nationLeadRole(nation) === role ? ROYAL_HOUSES[nation] : undefined;
}
