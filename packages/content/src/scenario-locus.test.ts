import { describe, expect, it } from "vitest";
import { selectNation } from "@admin/engine";
import { chokepoints, stateById, stateCapitol, worldCities, worldSettlements, type CityId, type NationId } from "@admin/world";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { resolveLocus } from "./scenario-locus.js";
import { ScenarioDef, type ScenarioLocus } from "./scenario.js";

const campaign = sealedCampaign("locus-tests");

function defWith(locus: ScenarioLocus, id = "locus-under-test"): ScenarioDef {
  return {
    id,
    class: "tragedy",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "A locus under test",
    cast: { pick: "none" },
    conditions: [],
    weight: 1,
    locus,
    opening: [
      {
        speaker: { kind: "narrator" },
        text: "Sixty characters of narration so the schema floor is satisfied here.",
      },
    ],
    replies: [
      {
        id: "a",
        tone: "firm",
        text: "Forty characters of a reply somebody says.",
        commitment: { kind: "position", cost: { standing: -0.01 }, remembered: "Fifty characters of what the record will remember.", rejoinder: { speaker: { kind: "cabinet" as const, roleHint: "defense" as const }, text: "The first person it reached was not the one anybody in this room had in mind, and she has been on the telephone since seven." } },
      },
      {
        id: "b",
        tone: "evasive",
        text: "Another forty characters of a second reply.",
        commitment: { kind: "position", cost: { stability: -0.01 }, remembered: "Fifty more characters of what the record remembers.", rejoinder: { speaker: { kind: "cabinet" as const, roleHint: "interior" as const }, text: "A neighboring council has already written to ask what the terms of it actually were, and it enclosed a copy of its own minutes." } },
      },
    ],
  };
}

const home = campaign.founding.nation;
const homeNation = selectNation(campaign, home)!.base;

describe("resolveLocus", () => {
  it("refuses a scenario that declares no locus at all, so the map always has a pin", () => {
    const placeless: Record<string, unknown> = { ...defWith({ site: "city", ground: "counterpart", descriptor: "a district school on an ordinary street" }) };
    delete placeless.locus;
    const parsed = ScenarioDef.safeParse(placeless);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path.join(".") === "locus")).toBe(true);
  });

  it("is a pure function of (seed, scenario, turn): the same pin twice", () => {
    const def = defWith({ site: "city", ground: "counterpart", descriptor: "a district school on an ordinary street" });
    expect(resolveLocus(campaign, def, home)).toEqual(resolveLocus(campaign, def, home));
  });

  it("puts a capital locus exactly on the capital, named as the capital", () => {
    const def = defWith({ site: "capital", ground: "counterpart", descriptor: "the square outside the government quarter" });
    const resolved = resolveLocus(campaign, def, home)!;
    expect(resolved.lat).toBe(homeNation.geo.lat);
    expect(resolved.lon).toBe(homeNation.geo.lon);
    expect(resolved.placeName).toBe(homeNation.identity.capital);
    expect(resolved.precision).toBe("exact");
  });

  it("resolves a chokepoint locus to a real named strait the nation actually holds", () => {
    const holder = Object.values(campaign.nations)
      .map((runtime) => runtime.base)
      .find((nation) => nation.geo.chokepoints.length > 0);
    expect(holder, "the shipped dataset has no nation holding a chokepoint").toBeDefined();
    const def = defWith({ site: "chokepoint", ground: "counterpart", descriptor: "the anchorage where the carriers wait" });
    const resolved = resolveLocus(campaign, def, holder!.id as NationId)!;
    const owned = new Set(holder!.geo.chokepoints.map((id) => id as string));
    expect(chokepoints.some((cp) => owned.has(cp.id as string) && cp.name === resolved.placeName)).toBe(true);
    expect(resolved.precision).toBe("exact");
  });

  // Falling back to the world's nearest strait would dateline a chokepoint
  // scenario on real water the cast nation does not hold, well off the
  // territory the map draws.
  it("does not borrow a foreign strait for a nation that holds none", () => {
    // The player's own country holds a chokepoint, so this is staged on a cast
    // nation without one — the dataset always has plenty.
    const straitless = Object.values(campaign.nations)
      .map((runtime) => runtime.base)
      .find((nation) => nation.geo.chokepoints.length === 0);
    expect(straitless, "the shipped dataset has no nation without a strait").toBeDefined();
    const def = defWith({ site: "chokepoint", ground: "counterpart", descriptor: "the anchorage where the carriers wait" });
    const resolved = resolveLocus(campaign, def, straitless!.id as NationId)!;
    expect(chokepoints.some((cp) => cp.name === resolved.placeName)).toBe(false);
    expect(resolved.placeName).toContain(straitless!.identity.name);
  });

  it("keeps an area pin near a nation it does not map by state rather than exact on it", () => {
    const abroad = selectNation(campaign, "IDN" as NationId)!.base;
    const def = defWith({ site: "interior", ground: "counterpart", descriptor: "the mining towns of the deep country" });
    const resolved = resolveLocus(campaign, def, abroad.id as NationId)!;
    expect(resolved.precision).toBe("area");
    expect(resolved.state).toBeUndefined();
    expect(Math.abs(resolved.lat - abroad.geo.lat)).toBeLessThan(2);
    expect(Math.abs(resolved.lon - abroad.geo.lon)).toBeLessThan(2);
    expect(resolved.lat === abroad.geo.lat && resolved.lon === abroad.geo.lon).toBe(false);
  });

  it("names the real neighbor across a border locus", () => {
    const withNeighbors = Object.values(campaign.nations)
      .map((runtime) => runtime.base)
      .find((nation) => nation.id !== home && nation.geo.neighbors.length > 0);
    expect(withNeighbors, "the shipped dataset has no nation with land borders").toBeDefined();
    const def = defWith({ site: "border", ground: "counterpart", descriptor: "the road crossing where the queue formed" });
    const resolved = resolveLocus(campaign, def, withNeighbors!.id as NationId)!;
    expect(resolved.placeName).toContain(withNeighbors!.identity.name);
    expect(resolved.placeName).toContain("frontier");
  });

  it("degrades a border locus on a nation with no land neighbors instead of failing", () => {
    const island = Object.values(campaign.nations)
      .map((runtime) => runtime.base)
      .find((nation) => nation.geo.neighbors.length === 0);
    if (!island) return;
    const def = defWith({ site: "border", ground: "counterpart", descriptor: "the road crossing where the queue formed" });
    const resolved = resolveLocus(campaign, def, island.id as NationId)!;
    expect(resolved.placeName).not.toContain("frontier");
  });

  it("pins home ground on the player's own nation whatever the counterpart", () => {
    const abroad = Object.keys(campaign.nations).find((id) => id !== String(home)) as NationId;
    const def = defWith({ site: "capital", ground: "home", descriptor: "a guest house near the foreign ministry" });
    expect(resolveLocus(campaign, def, abroad)!.nation).toBe(home);
  });

  // The rendered defect, reproduced. A shipped hostage week cast onto the
  // tensest nation authored `ground: "home"` beside a descriptor about a
  // detention block "held under occupation", and the resolver did exactly what
  // it was told: the pin landed on the player's own capital, so a week-one
  // player was told a foreign army held a district of Washington, D.C. The
  // resolver is correct here and the authored ground is the defect, which is
  // why the answer is the `locus-ground-mismatch` audit rule rather than a
  // change to this function.
  it("reproduces the shipped hostage week that datelined the player's own capital", () => {
    const abroad = Object.keys(campaign.nations).find((id) => id !== String(home)) as NationId;
    const def = defWith({ site: "capital", ground: "home", descriptor: "the detention block at the capital's edge, held under occupation" });
    const resolved = resolveLocus(campaign, def, abroad)!;
    expect(resolved.nation).toBe(home);
    expect(resolved.placeName).toBe("Washington, D.C.");
  });

  // The default is the half that was never wrong: an unset ground on a cast
  // scenario resolves against the counterpart's own geography.
  it("pins a named city to its exact coordinates and names the state", () => {
    const runtime = campaign.cities["CITY-USA-pittsburgh" as CityId];
    expect(runtime, "Pittsburgh is in the opening city table").toBeDefined();
    const def = defWith({
      site: "interior", ground: "counterpart",
      city: "CITY-USA-pittsburgh" as CityId,
      state: "PA",
      sector: "steel-heavy",
      descriptor: "a stamping plant with two thousand on the line",
    });
    const resolved = resolveLocus(campaign, def, home)!;
    expect(resolved.precision).toBe("exact");
    expect(resolved.lat).toBe(runtime!.base.lat);
    expect(resolved.lon).toBe(runtime!.base.lon);
    expect(resolved.placeName).toBe("Pittsburgh, Pennsylvania");
    expect(resolved.city).toBe("CITY-USA-pittsburgh");
  });
});

describe("resolveLocus on home ground", () => {
  const usCities = worldCities.filter((city) => city.nation === home);
  const cityAt = (lat: number, lon: number) => usCities.find((city) => city.lat === lat && city.lon === lon);
  const ids = Array.from({ length: 24 }, (_, index) => `home-site-${index}`);
  const homeDef = (site: ScenarioLocus["site"], id: string, extra: Partial<ScenarioLocus> = {}) =>
    defWith({ site, ground: "home", descriptor: "the depot yard where the morning shift reads the notice", ...extra }, id);

  it("places the same scenario in the same state on every turn of one campaign", () => {
    const def = homeDef("interior", "home-site-stable");
    const first = resolveLocus(campaign, def, home)!;
    expect(resolveLocus({ ...campaign, turn: campaign.turn + 9 }, def, home)).toEqual(first);
    expect(resolveLocus(campaign, def, home)).toEqual(first);
  });

  it("draws the state from the seed and the scenario, not one state for everything", () => {
    const states = new Set(ids.map((id) => resolveLocus(campaign, homeDef("city", id), home)!.state));
    expect(states.size).toBeGreaterThan(5);
    const other = sealedCampaign("locus-tests-other-seed");
    const moved = ids.some(
      (id) => resolveLocus(other, homeDef("city", id), home)!.state !== resolveLocus(campaign, homeDef("city", id), home)!.state,
    );
    expect(moved).toBe(true);
  });

  it.each([
    ["city", ["border", "financial", "industrial", "interior", "port"]],
    ["coast", ["port"]],
    ["interior", ["industrial", "interior"]],
    ["border", ["border"]],
  ] as const)("lands a %s site on a real city of its kind inside the state it names", (site, kinds) => {
    for (const id of ids) {
      const resolved = resolveLocus(campaign, homeDef(site, id), home)!;
      const city = cityAt(resolved.lat, resolved.lon);
      expect(resolved.state, id).toBeDefined();
      expect(resolved.state).not.toBe("DC");
      if (resolved.settlement) {
        const port = worldSettlements.find((place) => place.id === resolved.settlement)!;
        expect(site === "border" ? port.roadBorderCrossing : port.commercialPort).toBe(true);
        expect(port.state).toBe(resolved.state);
        expect([resolved.lat, resolved.lon]).toEqual([port.lat, port.lon]);
        expect(resolved.placeName).toBe(`${port.name}, ${stateById.get(port.state)!.name}`);
        continue;
      }
      expect(city?.state, `${id} drew ${resolved.placeName}`).toBe(resolved.state);
      expect(kinds as readonly string[]).toContain(city!.kind);
      expect(resolved.placeName).toBe(`${city!.name}, ${stateById.get(city!.state!)!.name}`);
      expect(resolved.precision).toBe("area");
    }
  });

  it("places an authored state inside that state", () => {
    const resolved = resolveLocus(campaign, homeDef("interior", "home-site-ohio", { state: "OH" }), home)!;
    expect(resolved.state).toBe("OH");
    expect(cityAt(resolved.lat, resolved.lon)?.state).toBe("OH");
  });

  // Delaware, Montana and Wyoming have no dataset city, so an authored state
  // there stands at its capitol rather than around the national capital.
  it("places an authored state the dataset has no city in at its capitol", () => {
    for (const state of ["DE", "MT", "WY"] as const) {
      const resolved = resolveLocus(campaign, homeDef("interior", `home-site-${state}`, { state }), home)!;
      const capitol = stateCapitol(state)!;
      expect(resolved.state).toBe(state);
      expect([resolved.lat, resolved.lon]).toEqual([capitol.lat, capitol.lon]);
      expect(resolved.placeName).toBe(`${capitol.city}, ${stateById.get(state)!.name}`);
      expect(resolved.precision).toBe("area");
    }
  });

  it("keeps a capital site in Washington, exactly", () => {
    for (const id of ids) {
      const resolved = resolveLocus(campaign, homeDef("capital", id), home)!;
      expect(resolved.lat).toBe(homeNation.geo.lat);
      expect(resolved.lon).toBe(homeNation.geo.lon);
      expect(resolved.placeName).toBe("Washington, D.C.");
      expect(resolved.precision).toBe("exact");
      expect(resolved.state).toBeUndefined();
    }
  });

  it("keeps an authored DC city in Washington", () => {
    const resolved = resolveLocus(campaign, homeDef("city", "home-site-dc", { city: "CITY-USA-washington-dc" as CityId }), home)!;
    expect(resolved.state).toBe("DC");
    expect(resolved.precision).toBe("exact");
  });

  // The only strait the dataset gives the United States is the Panama Canal,
  // which is not its ground: a home fuel-price week was datelined in Panama.
  it("takes a home chokepoint at one of the country's own ports, never on a strait", () => {
    for (const id of ids) {
      const resolved = resolveLocus(campaign, homeDef("chokepoint", id), home)!;
      const city = cityAt(resolved.lat, resolved.lon);
      expect(chokepoints.some((cp) => cp.name === resolved.placeName), `${id} drew ${resolved.placeName}`).toBe(false);
      expect(resolved.state).toBeDefined();
      if (resolved.settlement) {
        const port = worldSettlements.find((place) => place.id === resolved.settlement)!;
        expect(port.commercialPort).toBe(true);
        expect(port.state).toBe(resolved.state);
        expect([resolved.lat, resolved.lon]).toEqual([port.lat, port.lon]);
      } else {
        expect(city?.kind).toBe("port");
        expect(resolved.city).toBe(city?.id);
      }
    }
  });

  it("names the dataset city it stood the event in", () => {
    for (const id of ids) {
      const resolved = resolveLocus(campaign, homeDef("interior", id), home)!;
      expect(resolved.city, id).toBe(cityAt(resolved.lat, resolved.lon)?.id);
    }
  });
});

describe("resolveLocus abroad", () => {
  const foreignCities = worldCities.filter((city) => city.state === undefined && city.nation !== home);
  const withPort = foreignCities.find((city) => city.kind === "port")!.nation;
  const capitalOnly = Object.values(campaign.nations)
    .map((runtime) => runtime.base)
    .find((nation) => nation.id !== home && nation.geo.coastline && !foreignCities.some((city) => city.nation === nation.id && city.kind !== "capital"))!;

  it("stands a coastal event in one of the nation's own ports where the gazetteer lists one", () => {
    const def = defWith({ site: "coast", ground: "counterpart", descriptor: "the harbor wall where the trawlers tie up" });
    const resolved = resolveLocus(campaign, def, withPort as NationId)!;
    const city = worldCities.find((candidate) => candidate.id === resolved.city);
    expect(city?.nation).toBe(withPort);
    expect(city?.kind).toBe("port");
    expect([resolved.lat, resolved.lon]).toEqual([city!.lat, city!.lon]);
  });

  it("keeps a nation with only its capital listed at a nation-level area, never in the capital", () => {
    expect(capitalOnly, "the shipped dataset has no coastal nation with only its capital listed").toBeDefined();
    for (const site of ["coast", "interior", "city"] as const) {
      const def = defWith({ site, ground: "counterpart", descriptor: "the harbor wall where the trawlers tie up" });
      const resolved = resolveLocus(campaign, def, capitalOnly.id as NationId)!;
      expect(resolved.city).toBeUndefined();
      expect(resolved.precision).toBe("area");
      expect(resolved.placeName).not.toBe(capitalOnly.identity.capital);
      expect(resolved.placeName).toContain(capitalOnly.identity.name);
      expect(resolved.lat === capitalOnly.geo.lat && resolved.lon === capitalOnly.geo.lon).toBe(false);
    }
  });
});
