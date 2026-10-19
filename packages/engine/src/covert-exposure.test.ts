import { describe, expect, it } from "vitest";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { covertSuccessExposed } from "./covert-exposure.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { createSave, loadSave } from "./save.js";
import type { Campaign } from "./state.js";

const base = buildCampaign();
const actor = base.founding.nation;
const target = nationB.id;
const other = { turn: base.turn, actor: "world" as const, description: "Unrelated incident assessment." };
const matching = { turn: base.turn, actor: "player" as const, description: "A covert operation was committed.",
  commitment: { instrument: "covert" as const, rung: 5 as const, target, landed: true },
  causal: { origin: "decision" as const, entities: [actor, target], eventId: "covert-repeat-fixture", createdDate: base.calendar } };
const otherActor = { ...matching, actor: "world" as const,
  causal: { ...matching.causal, entities: [target, actor] } };
const otherRung = { ...matching, commitment: { ...matching.commitment, rung: 4 as const } };
const priorTurn = { ...matching, turn: base.turn - 1 };

describe("successful covert exposure stream", () => {
  it("does not reroll a higher-rung action when unrelated ledger records arrive", () => {
    for (let index = 0; index < 40; index += 1) {
      const campaign: Campaign = { ...base, seed: makeCampaignSeed(`covert-ledger-noise-${index}`) };
      const noisy: Campaign = { ...campaign, ledger: [...campaign.ledger, other, otherActor, otherRung, priorTurn] };
      expect(covertSuccessExposed(noisy, actor, target, 5)).toBe(covertSuccessExposed(campaign, actor, target, 5));
    }
  });

  it("gives a second matching operation a distinct deterministic occurrence, preserved by save and reload", () => {
    let observedDistinct = false;
    for (let index = 0; index < 200; index += 1) {
      const campaign: Campaign = { ...base, seed: makeCampaignSeed(`covert-repeat-${index}`) };
      const repeated: Campaign = { ...campaign, ledger: [...campaign.ledger, matching] };
      const first = covertSuccessExposed(campaign, actor, target, 5);
      const second = covertSuccessExposed(repeated, actor, target, 5);
      expect(covertSuccessExposed(loadSave(JSON.parse(JSON.stringify(createSave(repeated)))), actor, target, 5)).toBe(second);
      if (first !== second) observedDistinct = true;
    }
    expect(observedDistinct).toBe(true);
  });

  it("keeps the rung-one surveillance stream byte-for-byte compatible", () => {
    const expected = createRngStreams(base.seed).stream("foreign-surveillance-exposure", actor, target,
      base.turn, base.ledger.length).next() < (base.nations[target]?.stats.security.counterIntel ?? 0) * 0.25;
    expect(covertSuccessExposed(base, actor, target, 1)).toBe(expected);
  });
});
