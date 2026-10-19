import { describe, it, expect } from "vitest";
import { worldDataset } from "../dataset/index.js";
import { validateDataset } from "./dataset-validator.js";
import { validDataset } from "./__fixtures__/valid-dataset.js";

describe("validateDataset", () => {
  it("passes a well-formed dataset with no errors", () => {
    expect(validateDataset(validDataset)).toEqual([]);
  });

  it("catches a dangling reference (unknown neighbor nation id)", () => {
    const broken = structuredClone(validDataset);
    broken.nations[0]!.geo.neighbors = ["NOWHERE" as never];
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "dangling-reference" && e.message.includes("NOWHERE"))).toBe(true);
  });

  it("catches an out-of-range stat (unemployment > 1)", () => {
    const broken = structuredClone(validDataset);
    broken.nations[0]!.stats.economy.unemployment = 1.5;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "shape")).toBe(true);
  });

  it("catches a unit mismatch (gdpPerCapita inconsistent with gdp/population)", () => {
    const broken = structuredClone(validDataset);
    // Mistakenly entered in thousands rather than dollars.
    broken.nations[0]!.stats.economy.gdpPerCapita = 12.5;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "unit-mismatch")).toBe(true);
  });

  it("catches an order of battle that does not add up to the force it decomposes", () => {
    const broken = structuredClone(validDataset);
    // One service entered on the wrong scale — the failure the sum check exists
    // for, and one no per-field range can see.
    broken.nations[0]!.stats.military.orderOfBattle!.army.headcount = 550;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "unit-mismatch" && e.message.includes("branch headcounts sum"))).toBe(true);
  });

  it("catches a service with no people in it that still claims branch strength", () => {
    const broken = structuredClone(validDataset);
    const military = broken.nations[0]!.stats.military;
    // The navy is disbanded and nobody lowered naval strength with it.
    military.activeHeadcount -= military.orderOfBattle!.navy.headcount;
    military.orderOfBattle!.navy.headcount = 0;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "plausibility" && e.message.includes("branchStrength.naval"))).toBe(true);
  });

  it("requires the playable nation to carry the full decomposition, not headcounts alone", () => {
    const broken = structuredClone(validDataset);
    delete broken.nations[0]!.stats.military.orderOfBattle!.air.units;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "shape" && e.message.includes("named capabilities and units"))).toBe(true);
  });

  it("lets a nation nobody plays ship no order of battle at all", () => {
    const relaxed = structuredClone(validDataset);
    delete relaxed.nations[1]!.stats.military.orderOfBattle;
    expect(validateDataset(relaxed)).toEqual([]);
  });

  it("catches a military budget entered in the wrong unit", () => {
    const broken = structuredClone(validDataset);
    // Raw dollars against a GDP in millions — the shape six nations shipped in,
    // where every field passes its own range and only the ratio is absurd.
    broken.nations[0]!.stats.military.budget = broken.nations[0]!.stats.economy.gdp * 1e6;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "unit-mismatch")).toBe(true);
  });

  it("leaves a garrison state's real defense burden alone", () => {
    const heavy = structuredClone(validDataset);
    // A quarter of national output is what a war economy actually spends.
    heavy.nations[0]!.stats.military.budget = heavy.nations[0]!.stats.economy.gdp * 0.25;
    expect(validateDataset(heavy).some((e) => e.kind === "unit-mismatch")).toBe(false);
  });

  it("catches a dollar nation declaring a conversion rate that is not one", () => {
    const broken = structuredClone(validDataset);
    broken.nations[0]!.identity.currency = "USD";
    broken.nations[0]!.identity.currencyPerUsd = 4.2;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "currency-rate-mismatch")).toBe(true);
  });

  it("accepts a nation with no display rate at all — most of the board never needs one", () => {
    const relaxed = structuredClone(validDataset);
    delete relaxed.nations[0]!.identity.currencyPerUsd;
    expect(validateDataset(relaxed).some((e) => e.kind === "currency-rate-mismatch")).toBe(false);
  });



  it("catches a charter with no assembly, since content may name one unconditionally", () => {
    const broken = structuredClone(validDataset);
    delete broken.charters[0]!.institutions[0]!.kind;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.message.includes('kind "assembly"'))).toBe(true);
  });

  it("catches two institutions claiming one kind, which no token could resolve", () => {
    const broken = structuredClone(validDataset);
    broken.charters[0]!.institutions.push({ name: "Upper House", role: "Also legislates.", kind: "assembly" });
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.message.includes("two institutions claim kind"))).toBe(true);
  });

  it("catches a roleTitles entry for a chair the charter does not seat", () => {
    const broken = structuredClone(validDataset);
    (broken.charters[0]! as { roleTitles?: Record<string, string> }).roleTitles = {
      "role-grand-vizier": "Grand Vizier",
    };
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.message.includes("not one of this charter's cabinetRoles"))).toBe(true);
  });

  it("accepts roleTitles that only title seated chairs", () => {
    const withTitles = structuredClone(validDataset);
    const charter = withTitles.charters[0]! as { cabinetRoles: string[]; roleTitles?: Record<string, string> };
    charter.roleTitles = { [charter.cabinetRoles[0]!]: "Chancellor" };
    expect(validateDataset(withTitles)).toEqual([]);
  });

  it("catches a named-ticket charter with one major party rather than two or none", () => {
    const broken = structuredClone(validDataset);
    broken.charters[0]!.parties = [
      {
        id: "party-test-left" as never,
        name: "Left",
        shortName: "Left",
        kind: "major",
        beliefs: { economicLeftRight: -0.4, authLibertarian: 0, nationalistGlobalist: 0 },
        cohesion: 0.8,
      },
    ];
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "shape" && e.message.includes("two major parties or none"))).toBe(true);
  });


  it("catches an independent bloc authored as cohesive as a whipped caucus", () => {
    const broken = structuredClone(validDataset);
    broken.charters[0]!.parties = [
      {
        id: "party-test-left" as never,
        name: "Left",
        shortName: "Left",
        kind: "major",
        beliefs: { economicLeftRight: -0.4, authLibertarian: -0.2, nationalistGlobalist: -0.3 },
        cohesion: 0.8,
      },
      {
        id: "party-test-right" as never,
        name: "Right",
        shortName: "Right",
        kind: "major",
        beliefs: { economicLeftRight: 0.4, authLibertarian: 0.2, nationalistGlobalist: 0.3 },
        cohesion: 0.8,
      },
      {
        id: "party-test-none" as never,
        name: "Independent",
        shortName: "Independent",
        kind: "independent",
        beliefs: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
        cohesion: 0.9,
      },
    ];
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.message.includes("party-cohesion"))).toBe(true);
  });

  it("catches two major tickets that sit on the same belief point", () => {
    const broken = structuredClone(validDataset);
    broken.charters[0]!.parties = [
      {
        id: "party-test-left" as never,
        name: "Left",
        shortName: "Left",
        kind: "major",
        beliefs: { economicLeftRight: 0.1, authLibertarian: 0, nationalistGlobalist: 0 },
        cohesion: 0.8,
      },
      {
        id: "party-test-right" as never,
        name: "Right",
        shortName: "Right",
        kind: "major",
        beliefs: { economicLeftRight: 0.2, authLibertarian: 0, nationalistGlobalist: 0 },
        cohesion: 0.8,
      },
    ];
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "shape" && e.message.includes("party-beliefs-distinct"))).toBe(true);
  });

  it("catches an org history split by a blank line", () => {
    const broken = structuredClone(validDataset);
    broken.organizations[0]!.history = `${broken.organizations[0]!.history}\n\nA second paragraph would split the dossier lead.`;
    const errors = validateDataset(broken);
    expect(
      errors.some(
        (e) =>
          e.kind === "shape" &&
          e.path === "organizations.test-alliance.history" &&
          e.message === "org.history must be a single paragraph",
      ),
    ).toBe(true);
  });

  it("catches a sector mix that does not sum to 1", () => {
    const broken = structuredClone(validDataset);
    broken.nations[0]!.sectors[0]!.mix = 0.99;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "shape" && e.message.includes("sector mix sums to"))).toBe(true);
  });

  it("rejects an unknown SectorId on topExports", () => {
    const broken = structuredClone(validDataset);
    broken.nations[0]!.stats.trade.topExports = ["retail-wholesale"] as never;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "shape")).toBe(true);
  });

  it("catches electoral votes that do not sum to 538", () => {
    const broken = structuredClone(worldDataset);
    broken.states[0]!.electoralVotes += 1;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.path === "states" && e.message.includes("538"))).toBe(true);
  });

  it("catches a state economy that does not sum to 1", () => {
    const broken = structuredClone(worldDataset);
    broken.states[0]!.character!.economy.industrial = 0.99;
    const errors = validateDataset(broken);
    expect(
      errors.some((e) => e.kind === "shape" && e.path.includes(".character.economy") && e.message.includes("sum to")),
    ).toBe(true);
  });

  it("passes the shipped dataset's own vital rates, prices, debt and anchors", () => {
    expect(validateDataset(worldDataset)).toEqual([]);
  });

  it("catches a growth rate that its own three vital rates do not reproduce", () => {
    const broken = structuredClone(worldDataset);
    // A birth rate revised down and the net left behind — the exact edit the
    // identity exists to catch, and one no per-field range can see.
    broken.nations[0]!.stats.demography.birthRate -= 0.004;
    const errors = validateDataset(broken);
    expect(
      errors.some((e) => e.kind === "unit-mismatch" && e.path.endsWith("demography.growthRate")),
    ).toBe(true);
  });

  it("catches a cost-of-living index authored away from the snapshot", () => {
    const broken = structuredClone(worldDataset);
    broken.nations[0]!.stats.economy.costOfLiving = 1.08;
    const errors = validateDataset(broken);
    expect(
      errors.some((e) => e.kind === "unit-mismatch" && e.path.endsWith("economy.costOfLiving")),
    ).toBe(true);
  });

  it("catches a debt stock that no longer reproduces the ratio it was converted from", () => {
    const broken = structuredClone(worldDataset);
    // The classic conversion error: the stock entered against the wrong
    // denominator, which every per-field range accepts.
    broken.nations[0]!.stats.economy.debt *= 2;
    const errors = validateDataset(broken);
    expect(errors.some((e) => e.kind === "unit-mismatch" && e.path.endsWith("economy.debt"))).toBe(true);
  });

  it("catches state vital anchors that re-baseline the country", () => {
    const broken = structuredClone(worldDataset);
    // Every state a point above the nation is a claim that the nation's own
    // figure is wrong, which is what centering refuses.
    for (const state of broken.states) state.character.vitalAnchor.unemployment += 0.01;
    const errors = validateDataset(broken);
    expect(
      errors.some(
        (e) => e.kind === "plausibility" && e.path === "states.character.vitalAnchor.unemployment",
      ),
    ).toBe(true);
  });

  it("catches a state cohort axis that does not sum to 1", () => {
    const broken = structuredClone(worldDataset);
    broken.states[0]!.character!.cohorts!.age["age-under-35"] = 0.5;
    const errors = validateDataset(broken);
    expect(
      errors.some((e) => e.kind === "shape" && e.path.includes(".cohorts.age") && e.message.includes("sum to")),
    ).toBe(true);
  });
});

describe("what a nation's fidelity owes its authored layer", () => {
  const withFidelity = (fidelity: "full" | "standard" | "thin") => ({
    ...validDataset,
    nations: validDataset.nations.map((nation, index) => (index === 1 ? { ...nation, fidelity } : nation)),
  });

  it("lets a thin record take its archetype's agendas and state no red line", () => {
    expect(validateDataset(withFidelity("thin"))).toEqual([]);
  });

  it("asks a full record for two agendas of its own and a red line", () => {
    const messages = validateDataset(withFidelity("full")).map((error) => error.message);
    expect(messages.some((message) => /at least two agendas/.test(message))).toBe(true);
    expect(messages.some((message) => /must state a red line/.test(message))).toBe(true);
  });

  it("asks a standard record for a red line and not a second agenda", () => {
    const messages = validateDataset(withFidelity("standard")).map((error) => error.message);
    expect(messages.some((message) => /must state a red line/.test(message))).toBe(true);
    expect(messages.some((message) => /at least two agendas/.test(message))).toBe(false);
  });

  it("lets a thin record author no agenda at all, and asks a standard record for one", () => {
    const withoutAgendas = (fidelity: "standard" | "thin") => ({
      ...validDataset,
      nations: validDataset.nations.map((nation, index) =>
        index === 1 ? { ...nation, fidelity, traits: { ...nation.traits, agendas: [] } } : nation,
      ),
    });
    expect(validateDataset(withoutAgendas("thin"))).toEqual([]);
    const messages = validateDataset(withoutAgendas("standard")).map((error) => error.message);
    expect(messages.some((message) => /at least one agenda/.test(message))).toBe(true);
  });

  it("holds every shipped nation to its fidelity", () => {
    expect(validateDataset(worldDataset).filter((error) => /fidelity/.test(error.message))).toEqual([]);
  });
});
