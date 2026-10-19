import { describe, expect, it } from "vitest";
import type { Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { CYCLE_PHASE_ORDER, cycleReading } from "./cycle";

const base = openingCampaign();
const US = base.founding.nation;

describe("the business cycle as a position on a loop", () => {
  it("opens at rest, in expansion, zero weeks in", () => {
    const reading = cycleReading(base);
    expect(reading.phase).toBe("expansion");
    expect(reading.weeksInPhase).toBe(0);
  });

  it("names every phase the loop actually cycles through, in the order it moves", () => {
    expect(CYCLE_PHASE_ORDER).toEqual(["expansion", "peak", "contraction", "trough"]);
  });

  it("counts weeks in phase from when the phase was entered, not from the oath", () => {
    const enteredLate: Campaign = {
      ...base,
      turn: base.turn + 10,
      cycles: { ...base.cycles, [US]: { phase: "contraction", enteredTurn: base.turn + 4, amplitude: 0.02 } },
    };
    const reading = cycleReading(enteredLate);
    expect(reading.phase).toBe("contraction");
    expect(reading.weeksInPhase).toBe(6);
    expect(reading.word).toMatch(/contraction/);
  });
});
