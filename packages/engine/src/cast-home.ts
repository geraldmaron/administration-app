import { worldCities, worldStates, type City, type StateId } from "@admin/world";
import { birthplaceLabel } from "./people.js";

// Where an American is from, as a state rather than a sentence.
//
// A birthplace is stored the way a person says it ("Dayton, Ohio"), which is
// right for a dossier and useless for anything that has to ask which state that
// is: a running mate balanced against the President's home region, a governor
// who knew them back home. This reads the state back out of the same labels the
// cast was given, so nothing new is stored on a person to answer it.

const US_CITIES: readonly City[] = worldCities.filter((city) => city.state !== undefined);

const STATE_BY_NAME: ReadonlyMap<string, StateId> = new Map(worldStates.map((state) => [state.name, state.id]));

const CITY_BY_LABEL: ReadonlyMap<string, City> = new Map(US_CITIES.map((city) => [birthplaceLabel(city), city]));

const REGION_BY_STATE: ReadonlyMap<string, string> = new Map(worldStates.map((state) => [state.id as string, state.region]));

/**
 * The places in one state a person can be from: the dataset's own cities there,
 * or the state itself where the dataset names none (Delaware, Montana and
 * Wyoming), since a President from Wyoming is still from Wyoming.
 */
export function birthplacesInState(state: StateId): readonly string[] {
  const cities = US_CITIES.filter((city) => city.state === state).map(birthplaceLabel);
  if (cities.length > 0) return [...new Set(cities)];
  const named = worldStates.find((entry) => entry.id === state)?.name;
  return named ? [named] : [];
}

/** The dataset city a birthplace label names, if it names one. */
export function cityOfBirthplace(label: string | undefined): City | undefined {
  return label === undefined ? undefined : CITY_BY_LABEL.get(label);
}

/** The state a birthplace label names, if it names one. */
export function stateOfBirthplace(label: string | undefined): StateId | undefined {
  if (label === undefined) return undefined;
  const city = CITY_BY_LABEL.get(label);
  if (city?.state !== undefined) return city.state;
  return STATE_BY_NAME.get(label) ?? STATE_BY_NAME.get(label.split(", ").at(-1) ?? "");
}

/** The census region a state sits in. */
export function stateRegion(state: StateId | undefined): string | undefined {
  return state === undefined ? undefined : REGION_BY_STATE.get(state as string);
}
