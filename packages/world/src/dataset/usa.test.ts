import { describe, it, expect } from "vitest";
import { validateDataset } from "../validate/dataset-validator.js";
import {
  CRADLE_POTOMAC,
  INDONESIA_ID,
  US_ID,
  cradleById,
  usNation,
  usaCharter,
  usaPlaces,
  worldDataset,
} from "./index.js";
import type { RoleId } from "../schemas/ids.js";

describe("United States dataset", () => {
  it("passes the dataset validator with no exemptions", () => {
    expect(validateDataset(worldDataset)).toEqual([]);
  });

  it("holds every recognized government, with the United States the only playable one", () => {
    // The 193 UN members, plus Taiwan, Kosovo and Palestine: the governments
    // that hold territory and that a US President deals with.
    expect(worldDataset.nations).toHaveLength(196);
    const playable = worldDataset.nations.filter((n) => n.playable);
    expect(playable.map((n) => n.id)).toEqual([US_ID]);
  });

  it("governs the US under the constitutional charter, with impeachment as removal", () => {
    expect(usNation.identity.government).toBe(usaCharter.id);
    expect(usaCharter.removalMechanism).toBe("impeachment");
    expect(usaCharter.cabinetRoles.length).toBeGreaterThan(0);
  });

  it("carries a judiciary institution and an Attorney General", () => {
    expect(usaCharter.institutions.some((institution) => institution.kind === "judiciary")).toBe(true);
    // Not "the last seat" any more. The table is the full cabinet in
    // succession order, so Justice sits at its own rank rather than at the end
    // of a list that happened to stop there.
    expect(usaCharter.cabinetRoles).toContain("role-attorney-general");
    expect(usaCharter.roleTitles?.["role-attorney-general" as RoleId]).toBe("Attorney General");
    expect(usaCharter.institutions.find((institution) => institution.kind === "judiciary")?.name).toMatch(/Judiciary|Supreme Court/);
  });

  it("titles every cabinet seat in American terms", () => {
    for (const role of usaCharter.cabinetRoles) {
      expect(usaCharter.roleTitles?.[role], `${role} title`).toBeTruthy();
    }
  });




  it("pins the homeland cradle to the US record's own geography", () => {
    const cradle = cradleById.get(CRADLE_POTOMAC as string)!;
    expect(cradle.geo).toEqual({ lat: usNation.geo.lat, lon: usNation.geo.lon });
    expect(worldDataset.cradles).toHaveLength(1);
  });

  it("names the capital exactly once, at zero offset from the nation's own anchor", () => {
    const capitals = usaPlaces.filter((p) => p.kind === "capital");
    expect(capitals).toHaveLength(1);
    expect(capitals[0]).toMatchObject({ name: usNation.identity.capital, dLat: 0, dLon: 0 });
  });

  it("gives every place a unique name", () => {
    const names = usaPlaces.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps Pittsburgh in the city table as an industrial metro", () => {
    const pittsburgh = worldDataset.cities.find((city) => city.id === "CITY-USA-pittsburgh");
    expect(pittsburgh).toMatchObject({ name: "Pittsburgh", kind: "industrial", nation: US_ID });
  });

  it("seats Indonesia in the world, holding its real memberships", () => {
    const indonesia = worldDataset.nations.find((n) => n.id === INDONESIA_ID);
    expect(indonesia).toBeDefined();
    expect(indonesia!.playable).toBe(false);
    expect(indonesia!.memberships).toContain("ORG-ASEAN");
    expect(indonesia!.memberships).toContain("ORG-BRICS");
  });

  it("defines a currency for the display toggle", () => {
    expect(usNation.identity.currency).toHaveLength(3);
  });

  it("keeps gdpPerCapita consistent with gdp and population", () => {
    const { gdp, gdpPerCapita } = usNation.stats.economy;
    const { population } = usNation.stats.demography;
    const impliedPerCapita = (gdp * 1_000_000) / population;
    expect(Math.abs(impliedPerCapita - gdpPerCapita) / gdpPerCapita).toBeLessThan(0.05);
  });
});
