import { describe, expect, it } from "vitest";
import { apply } from "@admin/engine";
import { STATE_DISASTER_ELIGIBILITY, stateById, worldCities, type City, type StateId } from "@admin/world";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { plantHolidayScenario } from "./__fixtures__/plant-holiday.js";
import { seededState, stateFit, stateWeight } from "./scenario-locus-draw.js";
import type { ScenarioDef } from "./scenario.js";

const campaign = sealedCampaign("locus-draw-tests");

function unplaced(id: string, extra: Partial<ScenarioDef> = {}, locus: Partial<ScenarioDef["locus"]> = {}): ScenarioDef {
  return {
    ...plantHolidayScenario,
    id,
    class: "culture",
    topics: ["culture"],
    conditions: [],
    ...extra,
    locus: { site: "coast", ground: "home", descriptor: "the dry dock gates where the morning shift reads the notice", ...locus },
  };
}

const ports = (city: City) => city.nation === "USA" && city.kind === "port";
const ids = Array.from({ length: 160 }, (_, index) => `draw-${index}`);
const draws = (make: (id: string) => ScenarioDef, fits = ports) => ids.map((id) => seededState(campaign, make(id), fits)!);
const meanShare = (states: readonly StateId[], axis: "defense" | "energy") =>
  states.reduce((sum, state) => sum + stateById.get(state)!.character.economy[axis], 0) / states.length;

describe("stateFit", () => {
  it("reads only fields the scenario declares: sector, industry topics, class and a disaster gate", () => {
    const fit = stateFit(
      unplaced("fit", { class: "disaster", topics: ["energy", "fiscal"], conditions: [{ kind: "conditionActive", condition: "cyclone" }] }, { sector: "aerospace" }),
    );
    expect(fit).toEqual({ axes: ["defense", "energy"], hazard: true, acute: ["cyclone"] });
  });

  it("says nothing for a scenario that declares nothing about its place, so population alone weighs it", () => {
    expect(stateFit(unplaced("silent"))).toEqual({ axes: [], hazard: false, acute: [] });
  });

  it("ignores a pandemic gate, which every state can carry", () => {
    expect(stateFit(unplaced("outbreak", { conditions: [{ kind: "conditionActive", condition: "pandemic" }] })).acute).toEqual([]);
  });
});

describe("stateWeight", () => {
  it("is the root of population times the state's share of the declared industry", () => {
    const texas = stateById.get("TX")!;
    const fit = stateFit(unplaced("energy", { topics: ["energy"] }));
    expect(stateWeight(texas, fit)).toBeCloseTo(Math.sqrt(texas.population) * texas.character.economy.energy, 6);
  });

  it("is nothing in a state the gated disaster cannot strike", () => {
    const fit = stateFit(unplaced("storm", { conditions: [{ kind: "conditionActive", condition: "cyclone" }] }));
    expect(stateWeight(stateById.get("WA")!, fit)).toBe(0);
    expect(stateWeight(stateById.get("FL")!, fit)).toBeGreaterThan(0);
  });
});

describe("seededState", () => {
  it("discounts a repeatedly used state while preserving the existing scenario's pin", () => {
    const def = unplaced("remember-this-state");
    const original = seededState(campaign, def, ports)!;
    const used = apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary: "Earlier local matters." },
      effects: Array.from({ length: 20 }, (_, index) => ({ kind: "case" as const, actor: "world" as const, raise: {
        id: `earlier:${index}`, kind: "authored-scenario" as const, title: "Earlier matter", subject: { kind: "scenario" as const, id: `earlier-${index}` },
        clock: { kind: "none" as const }, defaultOutcome: { kind: "none" as const }, urgency: "soft" as const, responseRequirement: "president" as const, allowedDispositions: ["act" as const],
        story: { scenario: index === 0 ? def.id : `earlier-${index}`, subjects: [], place: { state: original } } } })) });
    expect(seededState(used, def, ports)).toBe(original);
    const before = ids.filter((id) => seededState(campaign, unplaced(id), ports) === original).length;
    const after = ids.filter((id) => seededState(used, unplaced(id), ports) === original).length;
    expect(before).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });

  it("is fixed for one scenario in one campaign", () => {
    const def = unplaced("stable");
    expect(seededState(campaign, def, ports)).toBe(seededState(campaign, def, ports));
  });

  it("keeps a disaster gated on a hurricane inside the states a hurricane can reach", () => {
    const landed = draws((id) => unplaced(id, { class: "disaster", conditions: [{ kind: "conditionActive", condition: "cyclone" }] }));
    for (const state of landed) expect(STATE_DISASTER_ELIGIBILITY.cyclone).toContain(state);
  });

  it("moves a scenario that declares a defense sector toward the states that build for defense", () => {
    const declared = draws((id) => unplaced(id, {}, { sector: "defense-industrial" }));
    const silent = draws((id) => unplaced(id));
    expect(meanShare(declared, "defense")).toBeGreaterThan(meanShare(silent, "defense") + 0.01);
  });

  it("weighs an undeclared scenario by population, not evenly", () => {
    const landed = draws((id) => unplaced(id));
    const counts = new Map<StateId, number>();
    for (const state of landed) counts.set(state, (counts.get(state) ?? 0) + 1);
    // California is the most populous state with a port and Rhode Island one of
    // the least: an even draw over the port states gives them the same count.
    expect(counts.get("CA") ?? 0).toBeGreaterThan(counts.get("RI") ?? 0);
  });

  it("drops a gate no candidate state can meet rather than placing the scenario nowhere", () => {
    const vermont = (city: City) => city.state === "VT";
    expect(worldCities.some(vermont)).toBe(true);
    const def = unplaced("vermont-hurricane", { conditions: [{ kind: "conditionActive", condition: "cyclone" }] });
    expect(seededState(campaign, def, vermont)).toBe("VT");
  });
});
