import type { City } from "../schemas/city.js";
import type { CityId, SettlementId, NationId, StateId } from "../schemas/index.js";
/**
 * How specific the point is. "city" is the named city; "state" is a state
 * pinned at its largest city, or at its capitol where the gazetteer has no
 * city in it, the one point a state has; "nation" is the nation's own point,
 * used when nothing finer is named.
 */
export type PlaceLevel = "city" | "settlement" | "state" | "nation";
export type Place = {
    readonly nation: NationId;
    readonly level: PlaceLevel;
    readonly lat: number;
    readonly lon: number;
    /** "Pittsburgh, Pennsylvania", a foreign city's own name, or the nation's name. */
    readonly name: string;
    /** Kept at every level, so a nation-level fallback still says which state it is about. */
    readonly state?: StateId;
    readonly city?: CityId;
    readonly settlement?: SettlementId;
};
export type PlaceTarget = {
    readonly nation: NationId;
    readonly state?: StateId;
    readonly city?: CityId;
    readonly settlement?: SettlementId;
};
/** Context points use their own coordinates rather than borrowing the state's metro. */
export declare function settlementPlace(id: string): Place | undefined;
/**
 * The state's largest dataset city, optionally among the cities that pass
 * `fits`. Sorted by population and then by id so the point is the same on
 * every machine. Three states carry no city in the dataset, so this can
 * legitimately answer nothing.
 */
export declare function largestCityIn(state: StateId, fits?: (city: City) => boolean): City | undefined;
/** A dataset city as a place, named with its state where it has one. */
export declare function cityPlace(cityId: string, level?: "city" | "state"): Place | undefined;
/**
 * A state as a place: its largest city, so one state never yields two points.
 * Delaware, Montana and Wyoming have no city in the gazetteer, so they stand
 * at their capitol rather than falling through to the national capital, which
 * put a Montana drought a short walk from the White House.
 */
export declare function statePlace(state: StateId): Place | undefined;
/**
 * City, then the state's largest city or its capitol, then the nation.
 * Undefined only for a nation the dataset does not know, which is a defect the
 * caller should see rather than a pin quietly dropped somewhere plausible.
 */
export declare function placeAt(target: PlaceTarget): Place | undefined;
