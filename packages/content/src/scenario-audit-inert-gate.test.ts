import { describe, expect, it } from "vitest";
import { auditInertGates, readsPlayerBoard } from "./scenario-audit-inert-gate.js";
import { reachabilityBoards } from "./scenario-reachability.js";
import type { ScenarioCondition, ScenarioDef } from "./scenario.js";

// The gates below are the ones the BL-252 review removed by hand: each was
// added to clear gate-on-nothing and held on every board the week could reach.

function gatedScenario(conditions: readonly ScenarioCondition[], overrides: Partial<ScenarioDef> = {}): ScenarioDef {
  return {
    id: "inert-gate-probe",
    class: "foreign-crisis",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "A probe of what a gate excludes",
    cast: { pick: "tensest" },
    conditions: [...conditions],
    weight: 1,
    locus: { site: "border", ground: "counterpart", descriptor: "the frontier track where the patrol crossed" },
    opening: [
      {
        speaker: { kind: "cabinet", roleHint: "foreign" },
        text: "A patrol crossed the line before first light and sat there for two hours, and the duty officer has photographs.",
      },
    ],
    replies: [
      {
        id: "hold-firm",
        tone: "firm",
        text: "Hold the line exactly where it is, and say so plainly before the day is out.",
        commitment: {
          kind: "position",
          cost: { standing: -0.05 },
          remembered: "The line held where it was drawn, and the government said so out loud the same day.",
          rejoinder: { speaker: { kind: "narrator" }, text: "The patrol stayed on its own side the next night, and the duty officer logged the quiet." },
        },
      },
      {
        id: "let-it-go",
        tone: "conciliatory",
        text: "Let this one pass without any comment, and see whether it happens a second time.",
        commitment: {
          kind: "position",
          cost: { stability: -0.02 },
          remembered: "It was let go without any comment at all, and nobody was asked to explain the silence.",
          rejoinder: { speaker: { kind: "narrator" }, text: "Nothing was said publicly, and the silence was read three different ways by the same room." },
        },
      },
    ],
    ...overrides,
  };
}

const boards = reachabilityBoards([gatedScenario([])]);
const flagged = (def: ScenarioDef) => auditInertGates([def], boards).map((finding) => finding.message);

describe("the inert gate: a condition no preview board fails", () => {
  it.each<[string, ScenarioCondition]>([
    ["an approval ceiling", { kind: "metric", metric: "approval", atMost: 0.75 }],
    ["a stability ceiling", { kind: "metric", metric: "stability", atMost: 0.9 }],
    ["a treasury floor far under any founding", { kind: "metric", metric: "treasury", atLeast: 12 }],
    ["a politicization ceiling", { kind: "institutionState", institution: "INST-DOJ", field: "politicization", atMost: 0.5 }],
    ["the player's own coast", { kind: "geography", field: "coastal", is: true }],
    ["a pulse band listing every band but one", { kind: "unemploymentBand", in: ["normal", "slack", "severe"] }],
  ])("flags %s", (_label, condition) => {
    const [message, ...rest] = flagged(gatedScenario([condition]));
    expect(rest).toEqual([]);
    expect(message).toContain(JSON.stringify(condition));
    expect(message).toContain("turns away no President");
  });

  it("leaves alone a gate that turns away a board the rest of the week would reach", () => {
    // Only the board in trouble sits under half approval.
    expect(flagged(gatedScenario([{ kind: "metric", metric: "approval", atMost: 0.5 }]))).toEqual([]);
  });

  it("leaves a gate no board meets to the reachability rule", () => {
    expect(flagged(gatedScenario([{ kind: "metric", metric: "approval", atLeast: 2 }]))).toEqual([]);
  });

  it("does not ask about the cast pick, the counterpart's ground, a deed or the clock", () => {
    const varyInPlay: readonly ScenarioCondition[] = [
      { kind: "relationship", field: "tension", atLeast: 0 },
      { kind: "geography", field: "bordered", is: true, of: "counterpart" },
      { kind: "flag", flag: "sent-the-team", is: false },
      { kind: "turn", atLeast: 1 },
    ];
    expect(varyInPlay.filter(readsPlayerBoard)).toEqual([]);
    expect(flagged(gatedScenario(varyInPlay))).toEqual([]);
  });

  it("names each inert gate once, beside the gates that do their work", () => {
    const messages = flagged(
      gatedScenario([
        { kind: "metric", metric: "approval", atMost: 0.5 },
        { kind: "geography", field: "coastal", is: true },
      ]),
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('"coastal"');
  });
});
