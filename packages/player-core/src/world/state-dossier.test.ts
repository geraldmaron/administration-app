import { describe, expect, it } from "vitest";
import { GOVERNOR_ASSENT_FLOOR, type Campaign } from "@admin/engine";
import { STATE_CAPITOLS, districtsOfState } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { governorDispositionWord, stateDossier, stateMetros } from "./state-dossier";

const base = openingCampaign();

function withColorado(patch: Partial<Campaign["states"]["CO"] & object>): Campaign {
  return { ...base, states: { ...base.states, CO: { ...base.states.CO!, ...patch } } };
}

describe("stateDossier", () => {
  it("reads nothing for a state the campaign does not carry", () => {
    const { CO: _dropped, ...rest } = base.states;
    expect(stateDossier({ ...base, states: rest } as Campaign, "CO")).toBeUndefined();
  });

  it("names the state's capitol, districts and electoral votes from the dataset", () => {
    const dossier = stateDossier(base, "CO")!;
    expect(dossier.name).toBe("Colorado");
    expect(dossier.capitol?.city).toBe(STATE_CAPITOLS.find((row) => row.state === "CO")!.city);
    expect(dossier.districts.map((district) => district.id)).toEqual(districtsOfState("CO").map((district) => district.id));
    expect(dossier.house.seats).toBe(dossier.districts.length);
    expect(dossier.house.democrat + dossier.house.republican + dossier.house.unheld).toBe(dossier.house.seats);
    expect(dossier.electoralVotes).toBe(base.states.CO!.base.electoralVotes);
  });

  it("orders the economy's axes largest share first, and they sum to the whole", () => {
    const { industry } = stateDossier(base, "CO")!;
    for (let i = 1; i < industry.length; i += 1) expect(industry[i - 1]!.share).toBeGreaterThanOrEqual(industry[i]!.share);
    expect(industry.reduce((sum, axis) => sum + axis.share, 0)).toBeCloseTo(1, 2);
  });

  it("says whether the governor will assent, on the engine's own line", () => {
    const governor = base.states.CO!.governor!;
    const warm = stateDossier(withColorado({ governor: { ...governor, disposition: GOVERNOR_ASSENT_FLOOR } }), "CO")!;
    const cold = stateDossier(withColorado({ governor: { ...governor, disposition: GOVERNOR_ASSENT_FLOOR - 0.01 } }), "CO")!;
    expect(warm.governor?.assents).toBe(true);
    expect(cold.governor?.assents).toBe(false);
    expect(warm.governor?.assentFloor).toBe(GOVERNOR_ASSENT_FLOOR);
  });

  it("carries the state's open requests and its memory with their reasons", () => {
    const claim = { signature: "relief:wildfire", openedTurn: base.turn, expiresTurn: base.turn + 4, weight: 0.5, reason: "Colorado asked for help with the fire." };
    const mark = { turn: base.turn, signature: "aid-withheld", weight: 0.3, valence: -1 as const, decayRate: 0.06, reason: "Colorado remembers aid withheld." };
    const dossier = stateDossier(withColorado({ claims: [claim], marks: [mark] }), "CO")!;
    expect(dossier.claims).toEqual([{ signature: "relief:wildfire", reason: claim.reason, weeksLeft: 4, weight: 0.5 }]);
    expect(dossier.marks).toEqual([{ signature: "aid-withheld", reason: mark.reason, forYou: false, weight: 0.3 }]);
  });
});

describe("stateDossier senate seats", () => {
  it("names each seat's senator and opens their dossier", () => {
    const seats = stateDossier(base, "CA")!.senate;
    expect(seats).toHaveLength(2);
    for (const seat of seats) {
      expect(seat.senator?.name).toBeTruthy();
      expect(seat.senator?.href).toMatch(/^\/washington\/person\//);
    }
  });
});

describe("governorDispositionWord", () => {
  it("puts the assent line between Guarded and Cooperative", () => {
    expect(governorDispositionWord(GOVERNOR_ASSENT_FLOOR)).toBe("Cooperative");
    expect(governorDispositionWord(GOVERNOR_ASSENT_FLOOR - 0.01)).toBe("Guarded");
    expect(governorDispositionWord(0.9)).toBe("Allied");
    expect(governorDispositionWord(0.1)).toBe("Opposed");
  });
});

describe("stateMetros", () => {
  it("lists the state's own metros, largest first", () => {
    const metros = stateMetros("TX");
    expect(metros.length).toBeGreaterThan(1);
    for (let i = 1; i < metros.length; i += 1) expect(metros[i - 1]!.population).toBeGreaterThanOrEqual(metros[i]!.population);
    expect(metros.every((metro) => metro.id.startsWith("CITY-USA-"))).toBe(true);
  });
});
