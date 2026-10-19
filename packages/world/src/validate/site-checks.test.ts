import { describe, expect, it } from "vitest";
import type { FederalSite, StateCapitol } from "../schemas/site.js";
import { CABINET_DEPARTMENT_INSTITUTIONS, FEDERAL_SITES } from "../dataset/federal-sites.js";
import { STATE_CAPITOLS } from "../dataset/state-capitols.js";
import { checkSites, stateMiss, type SiteTables } from "./site-checks.js";

const SEEDED: SiteTables = { sites: FEDERAL_SITES, capitols: STATE_CAPITOLS, departments: CABINET_DEPARTMENT_INSTITUTIONS };

const withSite = (institution: string, change: Partial<FederalSite>): SiteTables => ({
  ...SEEDED,
  sites: FEDERAL_SITES.map((site) => (site.institution === institution ? { ...site, ...change } : site)),
});

const withCapitol = (state: string, change: Partial<StateCapitol>): SiteTables => ({
  ...SEEDED,
  capitols: STATE_CAPITOLS.map((capitol) => (capitol.state === state ? { ...capitol, ...change } : capitol)),
});

describe("checkSites", () => {
  it("passes the seeded tables", () => {
    expect(checkSites()).toEqual([]);
  });

  it("refuses a headquarters inside another state, however close", () => {
    const errors = checkSites(withSite("INST-DOD", { state: "DC" }));
    expect(errors.map((error) => error.message)).toEqual([expect.stringContaining("inside VA's outline, not DC's")]);
  });

  it("refuses a capitol far from its state", () => {
    const errors = checkSites(withCapitol("MT", { lat: 46.5858, lon: -102.0184 }));
    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe("seed.stateCapitols[26]");
  });

  it("holds every cabinet department to a point", () => {
    const errors = checkSites(withSite("INST-DHS", { location: "none", state: undefined, lat: undefined, lon: undefined, reason: "test" }));
    expect(errors.map((error) => error.kind)).toEqual(["dangling-reference"]);
    expect(errors[0]!.message).toContain("INST-DHS");
  });

  it("refuses a no-location row that carries a point, or no reason", () => {
    expect(checkSites(withSite("INST-STATES", { lat: 39, lon: -77 }))).toHaveLength(1);
    expect(checkSites(withSite("INST-STATES", { reason: " " }))).toHaveLength(1);
  });

  it("refuses a sourced point with no opened record", () => {
    expect(checkSites(withSite("INST-FBI", { hqSource: "" }))).toHaveLength(1);
  });

  it("refuses a missing or doubled capitol and a doubled institution", () => {
    const missing = checkSites({ ...SEEDED, capitols: STATE_CAPITOLS.filter((capitol) => capitol.state !== "WY") });
    expect(missing.map((error) => error.message)).toEqual(["no capitol for WY."]);
    const doubled = checkSites({ ...SEEDED, capitols: [...STATE_CAPITOLS, STATE_CAPITOLS[0]!], sites: [...FEDERAL_SITES, FEDERAL_SITES[0]!] });
    expect(doubled.map((error) => error.message)).toEqual([expect.stringContaining("listed twice"), "AL listed twice."]);
  });

  it("admits a point a short way into drawn water off its own state", () => {
    expect(stateMiss("MD", 38.9589, -76.4511, "a point in the bay off Annapolis")).toBeUndefined();
  });
});
