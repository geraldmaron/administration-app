import type { LeaderConstraint } from "../schemas/leader-constraint.js";
import { type RoyalHouse } from "./name-forms.js";
/** The chairs a nation's charter seats, the lead chair first. */
export declare function nationCabinetRoles(nation: string): readonly string[];
/**
 * The chair a nation's charter seats first: the one a US President deals with
 * as the counterpart, and the one the leader table's row describes.
 */
export declare function nationLeadRole(nation: string): string | undefined;
/**
 * What the lead chair's holder is held to, and nothing for any other chair.
 *
 * The table describes one person per government, so a minister or an
 * opposition leader reads no row: their chairs are drawn from the cabinet's
 * priors instead (`nationGenderPriorFor`).
 */
export declare function leaderConstraintFor(nation: string, role: string): LeaderConstraint | undefined;
/**
 * What a nation calls the chair its charter seats first: "Federal Chancellor"
 * where the generic charter would say "Prime Minister". Undefined for any
 * other chair and for a nation the leader table has no row for, so a caller
 * falls back to the charter's own title.
 */
export declare function nationRoleTitle(nation: string, role: string): string | undefined;
/**
 * The reigning house of the monarch or heir who holds a nation's lead chair;
 * undefined for every other chair and every nation not ruled by one.
 */
export declare function royalHouseFor(nation: string, role: string): RoyalHouse | undefined;
