import { describe, expect, it } from "vitest";
import {
  advanceCycle,
  CYCLE_AMPLITUDE_RANGE,
  CYCLE_EXIT_HAZARD,
  CYCLE_GROWTH_OFFSET,
  CYCLE_MIN_DWELL_WEEKS,
  cycleExitHazard,
  cycleOffset,
  cycleWord,
  drawnCycle,
  expectedDwellWeeks,
  isDrawn,
  NO_CYCLE,
  openingCycle,
  openingCycles,
  type CyclePhase,
  type CycleState,
} from "./business-cycle.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import type { NationId } from "@admin/world";

const PHASES = ["expansion", "peak", "contraction", "trough"] as const;
const stream = (seed: string, turn: number) => createRngStreams(makeCampaignSeed(seed)).stream("cycle", "USA" as NationId, turn);
const OPENING = { seed: makeCampaignSeed("cycle-open-test"), player: "USA" as NationId };

describe("cycleOffset", () => {
  it("is zero at zero amplitude under every phase, and exactly zero for NO_CYCLE", () => {
    for (const phase of PHASES) expect(cycleOffset({ phase, enteredTurn: 0, amplitude: 0 })).toBe(0);
    expect(cycleOffset(NO_CYCLE)).toBe(0);
  });

  it("scales linearly with amplitude", () => {
    const a1 = cycleOffset({ phase: "contraction", enteredTurn: 0, amplitude: 0.01 });
    const a2 = cycleOffset({ phase: "contraction", enteredTurn: 0, amplitude: 0.02 });
    expect(a2).toBeCloseTo(a1 * 2, 9);
  });

  it("pushes growth up in an expansion, down in a contraction, and not at all at the turns", () => {
    const at = (phase: CyclePhase) => cycleOffset({ phase, enteredTurn: 0, amplitude: 0.02 });
    expect(at("expansion")).toBeGreaterThan(0);
    expect(at("contraction")).toBeLessThan(0);
    expect(at("peak")).toBe(0);
    expect(at("trough")).toBe(0);
  });

  it("is mean zero over a whole cycle at the phases' expected dwells, so the cycle never grows the economy on its own", () => {
    const net = PHASES.reduce((sum, phase) => sum + CYCLE_GROWTH_OFFSET[phase] * expectedDwellWeeks(phase), 0);
    const expansion = CYCLE_GROWTH_OFFSET.expansion * expectedDwellWeeks("expansion");
    expect(Math.abs(net) / expansion).toBeLessThan(0.01);
  });

  it("expects the postwar record's spans: an expansion of about 279 weeks trough to peak, a contraction of about 45", () => {
    expect(expectedDwellWeeks("trough") + expectedDwellWeeks("expansion") + expectedDwellWeeks("peak")).toBeCloseTo(279, -1);
    expect(expectedDwellWeeks("contraction")).toBeCloseTo(45, -1);
  });
});

describe("openingCycle / openingCycles / drawnCycle", () => {
  it("opens every nation undrawn: expansion, zero amplitude, entered the given turn", () => {
    expect(openingCycle(1)).toEqual({ phase: "expansion", enteredTurn: 1, amplitude: 0 });
    const cycles = openingCycles(["USA", "ALP", "DEU"] as NationId[], 1);
    expect(Object.keys(cycles).sort()).toEqual(["ALP", "DEU", "USA"]);
    for (const cycle of Object.values(cycles)) {
      expect(cycle).toEqual(openingCycle(1));
      expect(isDrawn(cycle)).toBe(false);
    }
  });

  const ids = Array.from({ length: 2000 }, (_, i) => `N${String(i).padStart(4, "0")}` as NationId);
  const draw = (nation: NationId, seed = OPENING.seed) => drawnCycle(nation, 1, { ...OPENING, seed });

  it("draws the played nation an expansion already under way, and every economy an amplitude in range", () => {
    const us = draw("USA" as NationId);
    expect(us.phase).toBe("expansion");
    expect(us.enteredTurn).toBeLessThanOrEqual(1);
    expect(1 - us.enteredTurn).toBeLessThan(expectedDwellWeeks("expansion"));
    for (const id of ids) {
      const cycle = draw(id);
      expect(isDrawn(cycle)).toBe(true);
      expect(cycle.amplitude).toBeGreaterThanOrEqual(CYCLE_AMPLITUDE_RANGE.min);
      expect(cycle.amplitude).toBeLessThanOrEqual(CYCLE_AMPLITUDE_RANGE.max);
    }
  });

  it("desynchronizes the world: each phase's share of draws is its share of the expected cycle", () => {
    const cycles = ids.map((id) => draw(id));
    const total = PHASES.reduce((sum, phase) => sum + expectedDwellWeeks(phase), 0);
    for (const phase of PHASES) {
      const share = cycles.filter((cycle) => cycle.phase === phase).length / ids.length;
      expect(share, phase).toBeCloseTo(expectedDwellWeeks(phase) / total, 1);
    }
    expect(new Set(cycles.map((cycle) => cycle.enteredTurn)).size).toBeGreaterThan(100);
  });

  it("is a function of the seed: the same seed draws the same world, another seed another one", () => {
    const first = ids.slice(0, 50).map((id) => draw(id));
    expect(ids.slice(0, 50).map((id) => draw(id))).toEqual(first);
    expect(ids.slice(0, 50).map((id) => draw(id, makeCampaignSeed("another-seed")))).not.toEqual(first);
  });
});

describe("advanceCycle — dwell and hazard", () => {
  it("never turns before its minimum dwell, however hard the gap leans", () => {
    for (const phase of PHASES) {
      const cycle: CycleState = { phase, enteredTurn: 1, amplitude: 0.02 };
      for (let turn = 1; turn < 1 + CYCLE_MIN_DWELL_WEEKS[phase]; turn++) {
        expect(advanceCycle(cycle, turn, 0.2, 0.2, stream(`dwell-${phase}`, turn))).toBe(cycle);
      }
    }
  });

  it("turns with no gap and no impulse at all once the dwell is served: no growth reading gates a turning point", () => {
    for (const phase of PHASES) {
      const cycle: CycleState = { phase, enteredTurn: 1, amplitude: 0.02 };
      let turned = false;
      for (let turn = 1 + CYCLE_MIN_DWELL_WEEKS[phase]; turn < 3000 && !turned; turn++) {
        if (advanceCycle(cycle, turn, 0, 0, stream(`free-${phase}`, turn)) !== cycle) turned = true;
      }
      expect(turned, phase).toBe(true);
    }
  });

  it("leans an expansion and a peak toward the turn by a positive gap, and a contraction and a trough by a positive impulse or a negative gap", () => {
    for (const phase of ["expansion", "peak"] as const) {
      expect(cycleExitHazard(phase, 0.01, 0)).toBeCloseTo(CYCLE_EXIT_HAZARD[phase] * 1.5, 9);
      expect(cycleExitHazard(phase, -0.05, 0)).toBeCloseTo(CYCLE_EXIT_HAZARD[phase], 9);
      expect(cycleExitHazard(phase, 0, 0.05)).toBeCloseTo(CYCLE_EXIT_HAZARD[phase], 9);
    }
    for (const phase of ["contraction", "trough"] as const) {
      expect(cycleExitHazard(phase, 0, 0.01)).toBeCloseTo(CYCLE_EXIT_HAZARD[phase] * 1.5, 9);
      expect(cycleExitHazard(phase, 0.05, 0)).toBeCloseTo(CYCLE_EXIT_HAZARD[phase], 9);
      // A slump four points of output deep is three times as likely to turn this week as one at its potential.
      expect(cycleExitHazard(phase, -0.04, 0)).toBeCloseTo(CYCLE_EXIT_HAZARD[phase] * 3, 9);
      expect(cycleExitHazard(phase, -0.04, 0.01)).toBeCloseTo(CYCLE_EXIT_HAZARD[phase] * 3.5, 9);
    }
    expect(cycleExitHazard("peak", 1, 0)).toBeLessThanOrEqual(1);
  });

  it("moves round the ring and draws a new amplitude in range, entered the turn it turned", () => {
    const NEXT: Readonly<Record<CyclePhase, CyclePhase>> = { expansion: "peak", peak: "contraction", contraction: "trough", trough: "expansion" };
    for (const phase of PHASES) {
      const cycle: CycleState = { phase, enteredTurn: 1, amplitude: 0.02 };
      let next = cycle;
      let turnedAt = -1;
      for (let turn = 1000; turn < 3000 && next === cycle; turn++) {
        next = advanceCycle(cycle, turn, 0, 0, stream(`ring-${phase}`, turn));
        if (next !== cycle) turnedAt = turn;
      }
      expect(next.phase).toBe(NEXT[phase]);
      expect(next.amplitude).toBeGreaterThanOrEqual(CYCLE_AMPLITUDE_RANGE.min);
      expect(next.amplitude).toBeLessThanOrEqual(CYCLE_AMPLITUDE_RANGE.max);
      expect(next.enteredTurn).toBe(turnedAt);
    }
  });

  it("is deterministic: the same cycle, turn, gap, impulse and stream always decide alike", () => {
    const cycle: CycleState = { phase: "expansion", enteredTurn: 1, amplitude: 0.01 };
    expect(advanceCycle(cycle, 500, 0.01, 0, stream("determinism", 500))).toEqual(
      advanceCycle(cycle, 500, 0.01, 0, stream("determinism", 500)),
    );
  });
});

describe("cycleWord", () => {
  it("names every phase in plain words", () => {
    for (const phase of PHASES) expect(cycleWord({ phase, enteredTurn: 0, amplitude: 0 })).toMatch(/economy/i);
  });
});
