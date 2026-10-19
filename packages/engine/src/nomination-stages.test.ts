import { describe, expect, it } from "vitest";
import * as engine from "./index.js";
import {
  ACTIVE_STAGES,
  NOMINATION_LEGS,
  TERMINAL_STAGES,
  isTerminal,
  nominationLeg,
  resolveStage,
  selectActiveNominations,
  stageDuration,
  type NominationStage,
} from "./nomination-stages.js";
import { buildCampaign } from "./__fixtures__/campaign.js";

describe("the stage machine", () => {
  it("is the one the engine hands out, not a copy of it", () => {
    expect(engine.stageDuration).toBe(stageDuration);
    expect(engine.resolveStage).toBe(resolveStage);
    expect(engine.isTerminal).toBe(isTerminal);
    expect(engine.selectActiveNominations).toBe(selectActiveNominations);
  });

  it("puts every stage on exactly one side of moving and finished", () => {
    const stages: readonly NominationStage[] = [...ACTIVE_STAGES, ...TERMINAL_STAGES];
    expect(new Set(stages).size).toBe(stages.length);
    for (const stage of ACTIVE_STAGES) expect(isTerminal(stage)).toBe(false);
    for (const stage of TERMINAL_STAGES) expect(isTerminal(stage)).toBe(true);
  });

  it("walks a confirmed officer to the oath and nowhere after it", () => {
    const campaign = buildCampaign();
    const confirmed = {
      id: "OFF-LABOR-SEC:1",
      office: "OFF-LABOR-SEC",
      institution: "INST-LABOR",
      nominee: "PER-X" as never,
      stage: "confirmed" as const,
      stageEnteredDay: 1,
      openedDay: 1,
      controversies: [],
      history: [],
    };
    expect(resolveStage(campaign, confirmed).stage).toBe("sworn-in");
    expect(resolveStage(campaign, { ...confirmed, stage: "sworn-in" }).stage).toBe("sworn-in");
    expect(stageDuration(campaign, { ...confirmed, stage: "sworn-in" })).toBe(0);
  });
});

describe("the legs a nomination runs", () => {
  it("puts every moving stage on one leg, in the order the stages run", () => {
    const legs = ACTIVE_STAGES.map((stage) => nominationLeg(stage)!);
    expect(legs.every((leg) => NOMINATION_LEGS.includes(leg))).toBe(true);
    const order = legs.map((leg) => NOMINATION_LEGS.indexOf(leg));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(legs)).toEqual(new Set(NOMINATION_LEGS));
  });

  it("puts a nomination that ended without a seat on no leg at all", () => {
    for (const stage of ["rejected", "withdrawn", "returned"] as const) expect(nominationLeg(stage)).toBeUndefined();
    expect(nominationLeg("sworn-in")).toBe("seated");
  });
});
