import { describe, it, expect } from "vitest";
import { composeNation, type NationDraft, type NationFigures } from "./compose-nation.js";
import { JUDGED_READINGS, NATION_FIGURES } from "./nation-figures.generated.js";
import { ROSTER_DRAFTS, usNation, worldNations } from "./nations.js";

const getPath = (object: unknown, dotted: string): unknown =>
  dotted.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], object);

function figuresOf(id: string): NationFigures {
  const figures = NATION_FIGURES[id];
  if (!figures) throw new Error(`no baked row for ${id}`);
  return figures;
}

/** The least a record can author: identity, place, temperament, and no figures of its own. */
function thinDraft(id: string): NationDraft {
  return {
    id,
    playable: false,
    fidelity: "thin",
    identity: { name: id, adjective: id, capital: id, government: "charter-parliamentary-republic", languages: ["English"], currency: "USD" },
    geo: { region: "region-oceania", lat: 0, lon: 0, neighbors: [], coastline: true, chokepoints: [], disasterExposure: {} },
    traits: {
      aggression: 0.3, opportunism: 0.3, legalism: 0.6, isolationism: 0.4, riskTolerance: 0.3, vengefulness: 0.2, reliability: 0.6, transparency: 0.5,
      agendas: [{ id: "development", description: "Grow the economy and the services the state can provide", weight: 0.5 }],
    },
    doctrine: { posture: "defensive", redLines: [], alignmentPull: [] },
  } as NationDraft;
}

describe("composeNation", () => {
  const figureIds = Object.keys(NATION_FIGURES);
  const firstId = figureIds[0] ?? "";

  it("returns an authored record unchanged whatever figures it is composed with", () => {
    const composed = composeNation(usNation, figuresOf(firstId));
    expect(composed).toEqual(usNation);
  });

  it("composes every baked row into a record that parses, with a sector mix that sums to one", () => {
    for (const id of figureIds) {
      const nation = composeNation(thinDraft(id), figuresOf(id));
      const mix = nation.sectors.reduce((sum, entry) => sum + entry.mix, 0);
      expect(Math.abs(mix - 1), id).toBeLessThan(0.002);
      expect(nation.stats).toEqual(figuresOf(id).stats);
    }
  });

  it("lets a record state one figure over the baked one and keeps every other", () => {
    const draft = { ...thinDraft(firstId), stats: { demography: { population: 1_234_567 } } } as NationDraft;
    const nation = composeNation(draft, figuresOf(firstId));
    expect(nation.stats.demography.population).toBe(1_234_567);
    expect(nation.stats.demography.birthRate).toBe(figuresOf(firstId).stats.demography.birthRate);
    expect(nation.stats.economy).toEqual(figuresOf(firstId).stats.economy);
  });

  it("refuses a record with neither baked figures nor figures of its own", () => {
    expect(() => composeNation(thinDraft("ZZZ"), undefined)).toThrow(/no baked figures for "ZZZ"/);
  });
});

describe("nation-figures.generated", () => {
  it("bakes a row for every drafted record and none for a record that states its own figures", () => {
    const drafted = new Set(ROSTER_DRAFTS.map((draft) => draft.id as string));
    const statedInFull = worldNations.map((nation) => nation.id as string).filter((id) => !drafted.has(id));
    expect(Object.keys(NATION_FIGURES).filter((id) => statedInFull.includes(id))).toEqual([]);
    expect([...drafted].filter((id) => !NATION_FIGURES[id])).toEqual([]);
    expect(statedInFull).toHaveLength(61);
  });

  it("names only stat paths that exist, in every row's provenance and in the judged list", () => {
    const sample = figuresOf(Object.keys(NATION_FIGURES)[0] ?? "");
    for (const dotted of JUDGED_READINGS) expect(getPath(sample.stats, dotted), dotted).toBeTypeOf("number");
    for (const [id, figures] of Object.entries(NATION_FIGURES)) {
      const { priors, clamped, older, vintage } = figures.provenance;
      for (const dotted of [...priors, ...clamped, ...Object.keys(older)]) expect(getPath(figures.stats, dotted), `${id} ${dotted}`).toBeDefined();
      for (const year of Object.values(older)) expect(year, id).toBeLessThan(vintage);
    }
  });

  it("keeps a country with no standing military at zero force", () => {
    const monaco = figuresOf("MCO").stats.military;
    expect([monaco.budget, monaco.activeHeadcount, monaco.readiness, monaco.branchStrength.land]).toEqual([0, 0, 0, 0]);
  });
});
