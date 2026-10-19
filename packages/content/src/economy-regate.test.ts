import { describe, expect, it } from "vitest";
import { apply, type Campaign, type NationCondition } from "@admin/engine";
import { previewBoards, sealedCampaign } from "./preview-board.js";
import { supplementBoards } from "./preview-board-oversight.js";
import { auditReachability } from "./scenario-reachability.js";
import { effectiveWeight, scenarioLive } from "./scenario-cast.js";
import type { ScenarioCondition, ScenarioDef } from "./scenario.js";

// The proof content-plan.md §12 calls for: `conditionActive` is the only
// economy gate (`scenario-cast.ts`'s `worstConditionSeverity`), and none of
// the ten canonical boards carries a standing economic condition — they run
// nine weeks of ordinary governance, not a business cycle. A scenario gated
// on one of the six standing economic kinds is unreachable until a board
// exists where that kind is actually live, which is what
// `preview-board-oversight.ts`'s `economyConditionBoard` now supplies.
//
// Scoped to what G1's own job carries in this worktree — the two items a
// fresh review sent back (`the-refinance-squeeze`, `the-currency-that-lost-
// a-tenth-of-itself-overnight`, both gated on `fiscal-crisis`) plus the
// mechanism those two share with the other standing economic kinds. The
// batch's other twenty-three items are not drafted in this worktree, so this
// file proves the gate rather than re-asserting content it cannot see.

const PLAYER = sealedCampaign().founding.nation;

const ECONOMY_CONDITIONS = [
  "recession",
  "inflation-shock",
  "unemployment-shock",
  "fiscal-crisis",
  "energy-shortage",
  "housing-crunch",
] as const;

/**
 * A whole scenario, so the reachability proof is the one the publish gate
 * runs rather than a condition read in isolation — the same discipline
 * `scenario-oversight.test.ts`'s `scenarioGatedOn` holds itself to, adapted
 * for the economy class `conditionActive` gates on.
 */
function economyScenario(id: string, conditions: readonly ScenarioCondition[]): ScenarioDef {
  return {
    id,
    class: "economy",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "A week the state of the economy is the thing on the desk",
    cast: { pick: "none" },
    conditions,
    weight: 1,
    locus: { site: "capital", descriptor: "the room where the numbers get read out" },
    opening: [
      {
        speaker: { kind: "cabinet", roleHint: "finance" },
        text: "This is the week the numbers are the story, and nobody in the building thinks they get better on their own.",
      },
    ],
    replies: [
      {
        id: "answer-it",
        tone: "firm",
        text: "Answer it this week, on the record, and say what it costs.",
        commitment: {
          kind: "position",
          cost: { stability: -0.05 },
          remembered: "The government answered it the week it landed, and said what it cost.",
          rejoinder: {
            speaker: { kind: "narrator" as const },
            text: "The number is what it is, and the department has been told to plan around it.",
          },
        },
      },
      {
        id: "wait-it-out",
        tone: "conciliatory",
        text: "Say nothing this week, and let it move before the government answers.",
        commitment: {
          kind: "position",
          cost: { stability: -0.02 },
          remembered: "The government said nothing this week and let the number move before it answered.",
          rejoinder: {
            speaker: { kind: "cabinet" as const, roleHint: "finance" as const },
            text: "Nothing was said, and the market read that as an answer of its own.",
          },
        },
      },
    ],
  } as ScenarioDef;
}

/**
 * The same campaign with one standing condition hand-set, the way a real
 * onset or weekly tick writes it (`record-effects.ts`'s `applyCondition`).
 * Kept separate from `preview-board-oversight.ts`'s own `economyConditionBoard`
 * so this file proves the gate's read of a condition independently of the
 * board that now supplies one.
 */
function withCondition(campaign: Campaign, kind: NationCondition["kind"], severity: number): Campaign {
  const condition: NationCondition = {
    id: `condition:${kind}:${campaign.founding.nation}:${campaign.turn}`,
    nation: campaign.founding.nation,
    kind,
    scope: "nation",
    severity,
    startedTurn: campaign.turn,
    status: "active",
    beats: [],
  };
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: `${kind} test condition` },
    effects: [{ kind: "condition", set: condition }],
  });
}

describe("the economy re-gate: conditionActive brings its own board", () => {
  it("hands the audit a board for every standing economic kind a batch gates on, and none it does not", () => {
    expect(supplementBoards([economyScenario("none", [{ kind: "turn", atLeast: 2 }])])).toEqual([]);
    expect(
      supplementBoards([
        economyScenario("one", [{ kind: "conditionActive", condition: "fiscal-crisis", atLeast: 0.05 }]),
      ]),
    ).toHaveLength(1);
    expect(
      supplementBoards([
        economyScenario("two", [{ kind: "conditionActive", condition: "recession", atLeast: 0.1 }]),
        economyScenario("three", [{ kind: "conditionActive", condition: "housing-crunch", atLeast: 0.1 }]),
      ]),
    ).toHaveLength(2);
    // Repeats of the same kind across a batch ask for one board, not one each.
    expect(
      supplementBoards([
        economyScenario("four", [{ kind: "conditionActive", condition: "recession", atLeast: 0.1 }]),
        economyScenario("five", [{ kind: "conditionActive", condition: "recession", atLeast: 0.2 }]),
      ]),
    ).toHaveLength(1);
  });

  it.each(ECONOMY_CONDITIONS)("gating on %s is unreachable on the canonical spread alone, and reachable once its board is supplied", (kind) => {
    const def = economyScenario(`${kind}-probe`, [{ kind: "conditionActive", condition: kind, atLeast: 0.1 }]);
    expect(auditReachability([def], previewBoards({}))).toHaveLength(1);
    expect(auditReachability([def])).toEqual([]);
  });

  it("re-gates the two items a fresh review sent back: turn plus fiscal-crisis at the floor the correction set", () => {
    const refinance = economyScenario("the-refinance-squeeze-probe", [
      { kind: "turn", atLeast: 6 },
      { kind: "conditionActive", condition: "fiscal-crisis", atLeast: 0.05 },
    ]);
    const currency = economyScenario("the-currency-that-lost-a-tenth-of-itself-overnight-probe", [
      { kind: "turn", atLeast: 2 },
      { kind: "conditionActive", condition: "fiscal-crisis", atLeast: 0.05 },
    ]);
    expect(auditReachability([refinance, currency])).toEqual([]);
  });

  it("is live under fiscal-crisis inside its bounds, closed with no condition and under an unrelated one, and still live at the floor the correction set", () => {
    const def = economyScenario("fiscal-crisis-floor-probe", [
      { kind: "conditionActive", condition: "fiscal-crisis", atLeast: 0.05 },
    ]);
    const base = sealedCampaign();
    expect(scenarioLive(base, def, PLAYER)).toBe(false);
    expect(scenarioLive(withCondition(base, "flood", 0.9), def, PLAYER)).toBe(false);
    expect(scenarioLive(withCondition(base, "fiscal-crisis", 0.3), def, PLAYER)).toBe(true);
    expect(scenarioLive(withCondition(base, "fiscal-crisis", 0.05), def, PLAYER)).toBe(true);
    expect(scenarioLive(withCondition(base, "fiscal-crisis", 0.04), def, PLAYER)).toBe(false);
  });

  // Owed by the G1 review (the-fuel-price-spike, approved with a blocking
  // sequencing condition): a `conditionSeverity` boost that names a kind
  // must read only that kind's severity, so a flood does not lift a
  // fuel-price scenario's weight. Exercises `scenario-cast.ts`'s
  // `worstConditionSeverity(campaign, boost.kind)`.
  it("its weight rises under a live condition of its kind and not under a flood", () => {
    const def: ScenarioDef = {
      ...economyScenario("fuel-boost-probe", [{ kind: "turn", atLeast: 2 }]),
      boosts: [{ source: "conditionSeverity", factor: 1.6, kind: "energy-shortage" }],
    } as ScenarioDef;
    const base = sealedCampaign();
    const baseline = effectiveWeight(base, def, PLAYER);
    expect(effectiveWeight(withCondition(base, "flood", 0.9), def, PLAYER)).toBe(baseline);
    expect(effectiveWeight(withCondition(base, "fiscal-crisis", 0.6), def, PLAYER)).toBe(baseline);
    expect(effectiveWeight(withCondition(base, "energy-shortage", 0.5), def, PLAYER)).toBeGreaterThan(baseline);
  });
});
