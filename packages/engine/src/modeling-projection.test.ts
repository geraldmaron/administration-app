import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { signOrder } from "./orders.js";
import {
  PROJECTION_ENSEMBLE_SIZE,
  projectAlternatives,
  projectRun,
  projectionSeed,
  type ProjectionAlternative,
} from "./modeling-projection.js";
import { createSave } from "./save.js";
import { campaignTurnPhases } from "./turn-phases.js";

const founded = foundedForBalance("projection-workbench");
const campaign = founded.campaign;
const advance = { phases: campaignTurnPhases(founded.charter, true) };
const basis = { kind: "truth" } as const;

const stand: ProjectionAlternative = { id: "stand", build: () => ({ ok: true, packets: [] }) };
const sign: ProjectionAlternative = {
  id: "sign",
  build: (state, streams) => {
    const result = signOrder(state, founded.charter, "order-border-controls", streams);
    return result.ok ? { ok: true, packets: [result.packet] } : { ok: false, reason: result.reason };
  },
};

describe("a projection", () => {
  it("leaves the live campaign byte-identical", () => {
    const before = JSON.stringify(createSave(campaign));
    projectAlternatives(campaign, [stand, sign], { weeks: 3, members: 2, advance, basis });
    expect(JSON.stringify(createSave(campaign))).toBe(before);
  });

  it("gives the same paths for the same inputs", () => {
    const first = projectAlternatives(campaign, [stand, sign], { weeks: 3, members: 2, advance, basis });
    const second = projectAlternatives(campaign, [stand, sign], { weeks: 3, members: 2, advance, basis });
    expect(second).toEqual(first);
  });

  it("runs between-day settlement on every day of a quiet projected week", () => {
    let settlements = 0;
    const run = projectRun(campaign, stand, {
      weeks: 2, member: 0, advance, basis,
      settle: (state) => { settlements += 1; return state; },
    });
    expect(run.readings).toHaveLength(3);
    // Once after the choice, then once after each of fourteen player-clock days.
    expect(settlements).toBe(15);
  });

  it("separates signing an order from standing pat where the engine says it should", () => {
    const [still, signed] = [stand, sign].map((alternative) => projectRun(campaign, alternative, { weeks: 2, member: 0, advance, basis }));
    expect(signed!.refused).toBeUndefined();
    expect(signed!.readings).toHaveLength(3);
    // The order's price lands the moment it is signed, before any day runs.
    expect(signed!.readings[0]).not.toEqual(still!.readings[0]);
    expect(signed!.readings.at(-1)).not.toEqual(still!.readings.at(-1));
  });

  it("runs every member on its own key, never the live seed, and the members disagree", () => {
    const seeds = Array.from({ length: PROJECTION_ENSEMBLE_SIZE }, (_, member) => projectionSeed(campaign.seed, member));
    expect(new Set(seeds).size).toBe(PROJECTION_ENSEMBLE_SIZE);
    expect(seeds).not.toContain(campaign.seed);
    const runs = projectAlternatives(campaign, [stand], { weeks: 4, members: 3, advance, basis });
    const finals = runs.map((run) => JSON.stringify(run.readings.at(-1)));
    expect(new Set(finals).size).toBeGreaterThan(1);
  });

  it("reports a refusal rather than projecting an act the engine would not commit", () => {
    const refused: ProjectionAlternative = { id: "nope", build: () => ({ ok: false, reason: "not available" }) };
    expect(projectRun(campaign, refused, { weeks: 2, member: 0, advance, basis })).toEqual({ alternative: "nope", member: 0, readings: [], refused: "not available" });
  });
});
