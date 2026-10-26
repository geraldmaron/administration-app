import { describe, expect, it } from "vitest";
import { DisasterKind, STATE_IDS } from "../schemas/index.js";
import { worldCities } from "./cities.js";
import {
  CITY_TORNADOES_PER_YEAR,
  HAZARD_EXPOSURE_FLOOR,
  STATE_DISASTER_ELIGIBILITY,
  STATE_HAZARD_EXPOSURE,
  US_HAZARD_RATE_SERIES,
  US_SIGNIFICANT_HAZARDS_PER_YEAR,
} from "./state-hazards.js";

const STATES = new Set<string>(STATE_IDS);

describe("the national hazard record", () => {
  it("gives every disaster kind a sourced rate and names the series it came from", () => {
    for (const kind of DisasterKind.options) {
      expect(US_SIGNIFICANT_HAZARDS_PER_YEAR[kind], kind).toBeGreaterThan(0);
      expect(US_HAZARD_RATE_SERIES[kind], kind).toBeDefined();
    }
  });

  it("ranks severe storms first and hurricanes second, as NOAA's billion-dollar series does", () => {
    const ranked = Object.entries(US_SIGNIFICANT_HAZARDS_PER_YEAR).sort((a, b) => b[1] - a[1]).map(([kind]) => kind);
    expect(ranked.slice(0, 2)).toEqual(["tornado", "cyclone"]);
  });
});

describe("where hazards land inside the gate", () => {
  it("keys every row by a real state, with a non-negative rate and a floor for its kind", () => {
    for (const [kind, rows] of Object.entries(STATE_HAZARD_EXPOSURE)) {
      expect(HAZARD_EXPOSURE_FLOOR[kind as DisasterKind], kind).toBeGreaterThan(0);
      for (const [state, rate] of Object.entries(rows ?? {})) {
        expect(STATES.has(state), `${kind} ${state}`).toBe(true);
        expect(rate, `${kind} ${state}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("describes only kinds the eligibility gate also names", () => {
    for (const kind of Object.keys(STATE_HAZARD_EXPOSURE)) expect(STATE_DISASTER_ELIGIBILITY[kind as DisasterKind], kind).toBeDefined();
  });

  it("names only cities the dataset carries, and puts New York City far below Oklahoma City", () => {
    const ids = new Set(worldCities.map((city) => city.id as string));
    for (const id of Object.keys(CITY_TORNADOES_PER_YEAR)) expect(ids.has(id), id).toBe(true);
    const rate = (slug: string) => CITY_TORNADOES_PER_YEAR[`CITY-USA-${slug}` as keyof typeof CITY_TORNADOES_PER_YEAR] ?? 0;
    expect(rate("oklahoma-city")).toBeGreaterThan(5 * rate("new-york"));
  });
});
