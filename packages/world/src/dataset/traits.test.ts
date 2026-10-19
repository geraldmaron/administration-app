import { describe, it, expect } from "vitest";
import { TRAIT_KEYS } from "../schemas/traits.js";
import { worldDataset } from "./index.js";
import { nationTraitProfiles, traitProfileByNation } from "./traits.js";

describe("world.traits-and-jitter profiles", () => {
  it("gives every nation in the dataset a profile", () => {
    for (const nation of worldDataset.nations) {
      expect(traitProfileByNation.has(nation.id), `${nation.identity.name} has a trait profile`).toBe(true);
    }
    expect(nationTraitProfiles).toHaveLength(worldDataset.nations.length);
  });

  it("offers at least three candidate agendas per nation, with unique ids", () => {
    for (const profile of nationTraitProfiles) {
      expect(profile.candidateAgendas.length, `${profile.nation} candidate agendas`).toBeGreaterThanOrEqual(3);
      const ids = new Set(profile.candidateAgendas.map((a) => a.id));
      expect(ids.size).toBe(profile.candidateAgendas.length);
      expect(profile.candidateAgendas.length).toBeGreaterThan(profile.agendaCount);
    }
  });

  it("brackets each nation's authored trait midpoint inside its range", () => {
    for (const nation of worldDataset.nations) {
      const profile = traitProfileByNation.get(nation.id)!;
      for (const key of TRAIT_KEYS) {
        const { min, max } = profile.ranges[key];
        const midpoint = nation.traits[key];
        expect(min, `${nation.identity.name}.${key} lower bound`).toBeLessThanOrEqual(midpoint);
        expect(max, `${nation.identity.name}.${key} upper bound`).toBeGreaterThanOrEqual(midpoint);
      }
    }
  });

  it("keeps every window narrow enough that a nation stays recognizable", () => {
    for (const profile of nationTraitProfiles) {
      for (const key of TRAIT_KEYS) {
        const { min, max } = profile.ranges[key];
        expect(max - min, `${profile.nation}.${key} window width`).toBeLessThanOrEqual(0.45);
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeLessThanOrEqual(1);
      }
    }
  });

  it("varies window width by stability — collapsing states swing further than settled ones", () => {
    const widthOf = (id: string) => {
      const r = traitProfileByNation.get(id)!.ranges.aggression;
      return r.max - r.min;
    };
    // Compared as group maxima: an individual window can be narrowed by the
    // 0..1 clamp when its midpoint sits near an edge, so a single pairing
    // proves nothing.
    const widest = (bands: readonly string[]) =>
      Math.max(...worldDataset.nations.filter((n) => bands.includes(n.bands.stabilityBand)).map((n) => widthOf(n.id)));
    expect(widest(["volatile", "collapsing"])).toBeGreaterThan(widest(["stable"]));
  });
});
