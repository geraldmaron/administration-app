import type { City } from "../schemas/city.js";
import type { CityId, SettlementId, NationId, StateId } from "../schemas/index.js";
import { worldCities } from "./cities.js";
import { worldSettlements } from "./settlements.js";
import { US_ID, worldNations } from "./nations.js";
import { stateCapitol } from "./state-capitols.js";
import { stateById } from "./states.js";

// The one answer to "where on the map is this?" for anything that names a
// city, a state or only a nation. Every pin the player sees for a running
// condition, a state's grievance, a pending claim, a declared emergency or a
// scenario bound to one of them goes through here, so two screens can never
// put the same thing in two places.
//
// It lives with the dataset rather than with any one consumer because both the
// content resolver and the player's selectors need it, and the dataset is the
// only package both of them already read.

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

const cityById: ReadonlyMap<string, City> = new Map(worldCities.map((city) => [city.id, city]));
const settlementById = new Map(worldSettlements.map((point) => [point.id as string, point]));

/** Context points use their own coordinates rather than borrowing the state's metro. */
export function settlementPlace(id: string): Place | undefined {
  const point = settlementById.get(id);
  if (!point) return undefined;
  return { nation: point.nation, state: point.state, settlement: point.id, level: "settlement", lat: point.lat, lon: point.lon,
    name: `${point.name}, ${stateById.get(point.state)?.name ?? point.state}` };
}

/**
 * The state's largest dataset city, optionally among the cities that pass
 * `fits`. Sorted by population and then by id so the point is the same on
 * every machine. Three states carry no city in the dataset, so this can
 * legitimately answer nothing.
 */
export function largestCityIn(state: StateId, fits: (city: City) => boolean = () => true): City | undefined {
  const inState = worldCities.filter((city) => city.state === state && fits(city));
  if (inState.length === 0) return undefined;
  return [...inState].sort((a, b) => b.population - a.population || String(a.id).localeCompare(String(b.id)))[0];
}

/** A dataset city as a place, named with its state where it has one. */
export function cityPlace(cityId: string, level: "city" | "state" = "city"): Place | undefined {
  const city = cityById.get(cityId);
  if (!city) return undefined;
  const stateName = city.state ? stateById.get(city.state)?.name : undefined;
  return {
    nation: city.nation,
    level,
    lat: city.lat,
    lon: city.lon,
    name: stateName ? `${city.name}, ${stateName}` : city.name,
    ...(city.state ? { state: city.state } : {}),
    city: city.id,
  };
}

/**
 * A state as a place: its largest city, so one state never yields two points.
 * Delaware, Montana and Wyoming have no city in the gazetteer, so they stand
 * at their capitol rather than falling through to the national capital, which
 * put a Montana drought a short walk from the White House.
 */
export function statePlace(state: StateId): Place | undefined {
  const seat = largestCityIn(state);
  if (seat) return cityPlace(seat.id, "state");
  const capitol = stateCapitol(state);
  const named = stateById.get(state);
  if (!capitol || !named) return undefined;
  return { nation: US_ID, level: "state", lat: capitol.lat, lon: capitol.lon, name: `${capitol.city}, ${named.name}`, state };
}

/**
 * City, then the state's largest city or its capitol, then the nation.
 * Undefined only for a nation the dataset does not know, which is a defect the
 * caller should see rather than a pin quietly dropped somewhere plausible.
 */
export function placeAt(target: PlaceTarget): Place | undefined {
  if (target.settlement) {
    const point = settlementPlace(target.settlement);
    return point?.nation === target.nation && (!target.state || point.state === target.state) ? point : undefined;
  }
  if (target.city) {
    const pinned = cityPlace(target.city);
    if (pinned) return pinned;
  }
  if (target.state) {
    const seat = statePlace(target.state);
    if (seat) return seat;
  }
  const nation = worldNations.find((candidate) => candidate.id === target.nation);
  if (!nation) return undefined;
  return {
    nation: nation.id,
    level: "nation",
    lat: nation.geo.lat,
    lon: nation.geo.lon,
    name: nation.identity.name,
    ...(target.state ? { state: target.state } : {}),
  };
}
