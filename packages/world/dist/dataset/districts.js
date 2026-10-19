import { District } from "../schemas/district.js";
import { DISTRICT_FIGURES } from "./district-figures.js";
// One row per US House seat, assembled the same way `worldStates` is: the
// mass (population, owned at the state level) and the political texture (lean,
// incumbentParty) live in their own table so a redistricting-cycle refresh is
// a diff of that file rather than 436 edits threaded through this one.
export const worldDistricts = DISTRICT_FIGURES.map((row) => District.parse({
    id: row.id,
    state: row.state,
    number: row.number,
    population: row.population,
    lean: row.lean,
    incumbentParty: row.incumbentParty,
}));
export const districtById = new Map(worldDistricts.map((district) => [district.id, district]));
export function districtsOfState(state) {
    return worldDistricts.filter((district) => district.state === state);
}
import { DISTRICT_PLACES } from "./district-places.generated.js";
export { DISTRICT_PLACES };
/**
 * The place a seat is known by, in the words a reader expects: "Allentown"
 * for a seat with a town of its own, "Chicago area" for a suburb, "near
 * Faribault" where the nearest named place lies outside it.
 */
export function districtPlaceName(id) {
    const place = DISTRICT_PLACES[id];
    if (!place)
        return undefined;
    if (place.how === "area")
        return `${place.name} area`;
    return place.how === "near" ? `near ${place.name}` : place.name;
}
