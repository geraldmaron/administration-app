import { describe, expect, it } from "vitest";
import { COHORT_AXES, STATE_DEMOGRAPHICS } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { createSave, loadSave } from "./save.js";
import { nationalCohortShares } from "./demos.js";
import type { Campaign } from "./state.js";

const NEW_AXES = ["race", "sex", "nativity", "disability", "veteran"] as const;

/** A save written before the demographic axes: each state carries only the five authored ones. */
function olderSave(): Campaign {
  const campaign = buildCampaign();
  const states = Object.fromEntries(
    Object.entries(campaign.states).map(([id, runtime]) => {
      const cohorts = Object.fromEntries(Object.entries(runtime.base.character.cohorts).filter(([axis]) => !(NEW_AXES as readonly string[]).includes(axis)));
      return [id, { ...runtime, base: { ...runtime.base, character: { ...runtime.base.character, cohorts } } }];
    }),
  );
  return { ...campaign, states: states as unknown as Campaign["states"] };
}

describe("opening an older save without the demographic axes", () => {
  it("fills the five new axes from the authored table and leaves the five it had exactly as they were", () => {
    const before = olderSave();
    const loaded = loadSave(createSave(before));
    for (const [id, runtime] of Object.entries(loaded.states)) {
      const cohorts = runtime.base.character.cohorts as unknown as Record<string, unknown>;
      for (const axis of NEW_AXES) expect(cohorts[axis], `${id} ${axis}`).toEqual((STATE_DEMOGRAPHICS as Record<string, Record<string, unknown>>)[id]![axis]);
      for (const axis of COHORT_AXES.filter((a) => !(NEW_AXES as readonly string[]).includes(a))) {
        expect(cohorts[axis]).toEqual((before.states[id as keyof typeof before.states]!.base.character.cohorts as unknown as Record<string, unknown>)[axis]);
      }
    }
  });

  it("then reads national shares on every axis, and loading again changes nothing", () => {
    const loaded = loadSave(createSave(olderSave()));
    const shares = nationalCohortShares(loaded);
    expect(shares["foreign-born"]).toBeGreaterThan(0.05);
    expect(shares["sex-female"] + shares["sex-male"]).toBeCloseTo(1, 3);
    expect(loadSave(createSave(loaded))).toEqual(loaded);
  });

  it("leaves a state that already carries the axes, sampled or not, untouched", () => {
    const current = buildCampaign();
    expect(loadSave(createSave(current)).states).toEqual(current.states);
  });
});
