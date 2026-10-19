import { describe, expect, it } from "vitest";
import { COHORT_AXES, cohortsOfAxis, worldDataset } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { JITTER_SPREAD, jitterCohortMix, nationalDemographicFactors } from "./demographic-jitter.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { openingStates } from "./states.js";
import type { Campaign } from "./state.js";

const streamsFor = (seed: string) => createRngStreams(makeCampaignSeed(seed));

function nationalShare(campaign: Campaign, axis: "nativity" | "disability" | "race", cell: string): number {
  const states = Object.values(campaign.states);
  const total = states.reduce((s, st) => s + st.base.population, 0);
  return states.reduce((s, st) => s + st.base.population * (st.base.character.cohorts[axis] as Record<string, number>)[cell]!, 0) / total;
}

describe("sampling the opening demographics", () => {
  it("keeps every axis of every state a partition of one, with no negative share, for many seeds", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const states = openingStates(streamsFor(seed));
      for (const state of Object.values(states)) {
        for (const axis of COHORT_AXES) {
          const cells = Object.values(state.base.character.cohorts[axis] as Record<string, number>);
          expect(cells.reduce((a, b) => a + b, 0), `${seed} ${state.base.id} ${axis}`).toBeCloseTo(1, 3);
          expect(Math.min(...cells)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("is a pure function of the seed: the same seed twice gives the same country", () => {
    expect(openingStates(streamsFor("same"))).toEqual(openingStates(streamsFor("same")));
  });

  it("gives different seeds different countries, state by state and nationally", () => {
    const one = openingStates(streamsFor("one"));
    const two = openingStates(streamsFor("two"));
    const differing = Object.keys(one).filter((id) => JSON.stringify(one[id as keyof typeof one].base.character.cohorts) !== JSON.stringify(two[id as keyof typeof two].base.character.cohorts));
    expect(differing.length).toBe(51);
    expect(nationalDemographicFactors(streamsFor("one"))["foreign-born"]).not.toBe(nationalDemographicFactors(streamsFor("two"))["foreign-born"]);
  });

  it("leaves the authored country alone when no streams are given", () => {
    const plain = openingStates();
    for (const state of worldDataset.states) expect(plain[state.id as keyof typeof plain].base.character.cohorts).toEqual(state.character.cohorts);
  });

  it("changes shares and nothing else: population, lean and the sector mix are the authored ones", () => {
    const sampled = openingStates(streamsFor("only-shares"));
    for (const state of worldDataset.states) {
      const runtime = sampled[state.id as keyof typeof sampled];
      expect(runtime.base.population).toBe(state.population);
      expect(runtime.lean).toBe(state.lean);
      expect(runtime.base.character.economy).toEqual(state.character.economy);
    }
  });

  it("varies the national figures believably across seeds: wide enough to differ, narrow enough to stay the same country", () => {
    const foreign: number[] = [];
    const black: number[] = [];
    const female: number[] = [];
    for (let i = 0; i < 24; i += 1) {
      const { campaign } = foundedForBalance(`demographics-${i}`);
      foreign.push(nationalShare(campaign, "nativity", "foreign-born"));
      black.push(nationalShare(campaign, "race", "race-black"));
      const states = Object.values(campaign.states);
      const total = states.reduce((s, st) => s + st.base.population, 0);
      female.push(states.reduce((s, st) => s + st.base.population * (st.base.character.cohorts.sex as Record<string, number>)["sex-female"]!, 0) / total);
    }
    const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
    expect(spread(foreign)).toBeGreaterThan(0.004);
    expect(Math.min(...foreign)).toBeGreaterThan(0.1);
    expect(Math.max(...foreign)).toBeLessThan(0.19);
    expect(spread(black)).toBeGreaterThan(0.002);
    expect(spread(female)).toBeLessThan(0.01);
    expect(Math.min(...female)).toBeGreaterThan(0.495);
  });

  it("states a spread for every axis, and none is zero", () => {
    for (const axis of COHORT_AXES) {
      expect(JITTER_SPREAD[axis].national).toBeGreaterThan(0);
      expect(JITTER_SPREAD[axis].state).toBeGreaterThan(0);
      expect(cohortsOfAxis(axis).length).toBeGreaterThan(1);
    }
  });

  it("does not move when a state mix is sampled by itself twice from the same stream key", () => {
    const streams = streamsFor("twice");
    const national = nationalDemographicFactors(streams);
    const mix = worldDataset.states[0]!.character.cohorts;
    expect(jitterCohortMix(mix, national, streams.stream("k"))).toEqual(jitterCohortMix(mix, national, streams.stream("k")));
  });
});
