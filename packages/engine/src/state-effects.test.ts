import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { GOVERNOR_STANDING_STEP_CAP, GOVERNOR_TILT_CAP } from "./state-effects.js";
import { governorPhase } from "./governors.js";
import type { Campaign } from "./state.js";
import { STATE_IDS, type StateId } from "@admin/world";

const seated = (campaign: Campaign): StateId =>
  STATE_IDS.find((id) => id !== "DC" && campaign.states[id]?.governor !== undefined) as StateId;

const shift = (campaign: Campaign, state: StateId, governorShift: number): Campaign =>
  apply(campaign, {
    source: "conversation",
    actor: "player",
    turn: campaign.turn,
    narration: { summary: "An answer reaches a statehouse." },
    effects: [{ kind: "state", state, governorShift, reason: "The answer read well in the state." }],
  });

describe("a governor reading an answer", () => {
  const campaign = foundedForBalance("governor-shift").campaign;
  const state = seated(campaign);
  const before = campaign.states[state]!.governor!.disposition;

  it("moves the seated governor by the signed step", () => {
    const after = shift(campaign, state, 0.01).states[state]!.governor!;
    expect(after.disposition).toBeCloseTo(Math.min(1, before + 0.01), 3);
    expect(shift(campaign, state, -0.01).states[state]!.governor!.disposition).toBeCloseTo(Math.max(0, before - 0.01), 3);
  });

  it("caps one answer at the step cap in either direction", () => {
    expect(shift(campaign, state, 0.9).states[state]!.governor!.disposition).toBeCloseTo(Math.min(1, before + GOVERNOR_STANDING_STEP_CAP), 3);
    expect(shift(campaign, state, -0.9).states[state]!.governor!.disposition).toBeCloseTo(Math.max(0, before - GOVERNOR_STANDING_STEP_CAP), 3);
  });

  it("keeps the disposition inside 0..1 and the governor's other fields", () => {
    const pinned = { ...campaign, states: { ...campaign.states, [state]: { ...campaign.states[state]!, governor: { ...campaign.states[state]!.governor!, disposition: 0.99 } } } };
    const after = shift(pinned, state, 0.5).states[state]!.governor!;
    expect(after.disposition).toBe(1);
    expect(after.person).toBe(campaign.states[state]!.governor!.person);
  });

  it("does nothing for a state with no governor", () => {
    const bare = { ...campaign, states: { ...campaign.states, [state]: { ...campaign.states[state]!, governor: undefined } } };
    expect(shift(bare, state, 0.03).states[state]!.governor).toBeUndefined();
  });

  it("is remembered: the statehouse settles toward its delegation plus the tilt, and the tilt fades", () => {
    const settle = (from: Campaign, weeks: number): Campaign => {
      let working = from;
      for (let week = 0; week < weeks; week += 1) working = governorPhase(working).reduce((state, packet) => apply(state, packet), working);
      return working;
    };
    const quiet = settle(campaign, 12).states[state]!.governor!;
    const answered = settle(shift(campaign, state, 0.04), 12).states[state]!.governor!;
    expect(answered.disposition).toBeGreaterThan(quiet.disposition);
    expect(answered.answerTilt ?? 0).toBeGreaterThan(0);
    expect(answered.answerTilt ?? 0).toBeLessThan(0.04);
  });

  it("holds the remembered tilt inside its cap however many answers land", () => {
    const many = Array.from({ length: 10 }).reduce<Campaign>((working) => shift(working, state, 0.04), campaign);
    expect(many.states[state]!.governor!.answerTilt).toBeLessThanOrEqual(GOVERNOR_TILT_CAP);
  });
});
