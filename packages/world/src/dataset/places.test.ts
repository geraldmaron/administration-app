import { describe, expect, it } from "vitest";
import { STATE_IDS, type CityId, type NationId } from "../schemas/index.js";
import { worldCities } from "./cities.js";
import { worldSettlements } from "./settlements.js";
import { worldNations } from "./nations.js";
import { cityPlace, largestCityIn, placeAt, statePlace } from "./places.js";
import { stateCapitol } from "./state-capitols.js";

const usa = "USA" as NationId;
const capital = worldNations.find((nation) => nation.id === usa)!.geo;

describe("placeAt", () => {
  it("pins a sourced locality on its own coordinates and refuses a contradictory target", () => {
    const point = worldSettlements.find((entry) => entry.commercialPort)!;
    expect(placeAt({ nation: usa, settlement: point.id })).toMatchObject({ level: "settlement", state: "NJ", name: "Newark, New Jersey", lat: point.lat, lon: point.lon });
    expect(placeAt({ nation: usa, state: "MI", settlement: point.id })).toBeUndefined();
    expect(placeAt({ nation: "FRA" as NationId, settlement: point.id })).toBeUndefined();
  });

  it("pins a named city on that city and names its state", () => {
    const place = placeAt({ nation: usa, state: "OH", city: "CITY-USA-pittsburgh" as CityId })!;
    expect(place).toMatchObject({ level: "city", city: "CITY-USA-pittsburgh", state: "PA", name: "Pittsburgh, Pennsylvania" });
  });

  it("pins a state at its largest city", () => {
    const place = placeAt({ nation: usa, state: "TX" })!;
    const largest = worldCities.filter((city) => city.state === "TX").sort((a, b) => b.population - a.population)[0]!;
    expect(place).toMatchObject({ level: "state", state: "TX", city: largest.id, lat: largest.lat, lon: largest.lon });
  });

  it("gives one state one point, whichever way it is asked", () => {
    const fromState = placeAt({ nation: usa, state: "CA" })!;
    expect(statePlace("CA")).toEqual(fromState);
    expect(placeAt({ nation: usa, state: "CA", city: "CITY-USA-nowhere" as CityId })).toEqual(fromState);
  });

  it("pins a state the gazetteer has no city in at its capitol, never at the national capital", () => {
    for (const state of ["DE", "MT", "WY"] as const) {
      const capitol = stateCapitol(state)!;
      expect(largestCityIn(state)).toBeUndefined();
      const place = placeAt({ nation: usa, state })!;
      expect(place).toMatchObject({ nation: usa, level: "state", state, lat: capitol.lat, lon: capitol.lon });
      expect(place.city).toBeUndefined();
      expect(statePlace(state)).toEqual(place);
    }
    expect(placeAt({ nation: usa, state: "MT" })?.name).toBe("Helena, Montana");
  });

  it("gives every state and DC a state-level point", () => {
    for (const state of STATE_IDS) expect(statePlace(state)?.level, state).toBe("state");
  });

  it("falls to the nation when nothing finer is named", () => {
    expect(placeAt({ nation: usa })).toMatchObject({ level: "nation", name: "United States", lat: capital.lat, lon: capital.lon });
  });

  it("answers nothing for a nation the dataset does not know", () => {
    expect(placeAt({ nation: "XXX" as NationId })).toBeUndefined();
  });

  it("names a city outside any state by its own name", () => {
    const foreign = worldCities.find((city) => !city.state)!;
    expect(cityPlace(foreign.id)?.name).toBe(foreign.name);
  });

  it("filters the largest city by kind when asked", () => {
    const port = largestCityIn("TX", (city) => city.kind === "port")!;
    expect(port.kind).toBe("port");
    expect(port.state).toBe("TX");
  });
});
