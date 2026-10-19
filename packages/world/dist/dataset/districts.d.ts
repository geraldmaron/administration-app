import { District } from "../schemas/district.js";
export declare const worldDistricts: readonly District[];
export declare const districtById: ReadonlyMap<string, District>;
export declare function districtsOfState(state: string): readonly District[];
import { DISTRICT_PLACES } from "./district-places.generated.js";
export { DISTRICT_PLACES };
/**
 * The place a seat is known by, in the words a reader expects: "Allentown"
 * for a seat with a town of its own, "Chicago area" for a suburb, "near
 * Faribault" where the nearest named place lies outside it.
 */
export declare function districtPlaceName(id: string): string | undefined;
