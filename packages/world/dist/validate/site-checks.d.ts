import { type StateId } from "../schemas/state.js";
import type { FederalSite, StateCapitol } from "../schemas/site.js";
import type { ValidationError } from "./validation-error.js";
/**
 * How far off its state's drawn outline a sourced point may sit. The state
 * outlines are the Census Bureau's 1:500,000 cartographic boundaries,
 * simplified to 0.3 units of a plane where one unit is about six kilometers,
 * so a building on a harbor or a riverbank can fall a couple of kilometers
 * into the drawn water. Four kilometers admits that and still refuses a
 * transposed coordinate; a point that lands inside a different state is
 * refused whatever its distance. Every seeded point sits strictly inside its
 * own outline today, so the tolerance is headroom, not a hidden exception.
 */
export declare const SITE_TOLERANCE_KM = 4;
export type SiteTables = {
    readonly sites: readonly FederalSite[];
    readonly capitols: readonly StateCapitol[];
    readonly departments: readonly string[];
};
/**
 * A point inside its state, or in drawn water within the tolerance of its
 * outline; a message otherwise. A point inside another state's outline is
 * refused outright, so the tolerance never lets the Pentagon stand in DC.
 */
export declare function stateMiss(state: StateId, lat: number, lon: number, label: string): string | undefined;
/**
 * The siting rules: every federal site is a sourced point inside its state or
 * an explicit no-location with a reason, every cabinet department has a point,
 * and the 50 states and DC each have one capitol inside their own outline.
 */
export declare function checkSites(tables?: SiteTables): ValidationError[];
