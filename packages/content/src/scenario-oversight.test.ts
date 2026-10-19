import { describe, expect, it } from "vitest";
import { isMatterOpen, selectOpenMatters, selectShutdown } from "@admin/engine";
import { previewBoards } from "./preview-board.js";
import { oversightBoard, rulemakingBoard, shutdownBoard, supplementBoards } from "./preview-board-oversight.js";
import { auditReachability } from "./scenario-reachability.js";
import {
  auditExecutiveStateGates,
  executiveStateMet,
  IMPLAUSIBLE_LAPSE_WEEKS,
} from "./scenario-oversight.js";
import { ScenarioCondition, type ScenarioDef } from "./scenario.js";

const fresh = previewBoards({})[0]!;

function findingsFor(conditions: readonly ScenarioCondition[]) {
  const found: { kind: string; severity: string; scenario: string; message: string }[] = [];
  auditExecutiveStateGates({ id: "probe", conditions, replies: [] } as unknown as ScenarioDef, found);
  return found.map((finding) => `${finding.severity}:${finding.kind}`);
}

/**
 * A whole scenario, so the reachability proof is the one the publish gate runs
 * rather than a condition read in isolation. Everything but the conditions is
 * held constant across the four kinds, because what is under test is whether
 * the gate is ever true on a board, not whether the prose is any good.
 */
function scenarioGatedOn(id: string, conditions: readonly ScenarioCondition[]): ScenarioDef {
  return {
    id,
    class: "institution",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "A week the machinery of the government is the thing on the desk",
    cast: { pick: "none" },
    conditions,
    weight: 1,
    locus: { site: "capital", descriptor: "the room off the West Wing where this gets decided" },
    opening: [
      {
        speaker: { kind: "cabinet", roleHint: "interior" },
        text: "This is the week it lands on you, and the people who would normally have handled it are the people it is about.",
      },
    ],
    replies: [
      {
        id: "answer-it",
        tone: "firm",
        text: "Answer it on the record this week, in writing, and say who signs the answer.",
        commitment: {
          kind: "position",
          cost: { standing: -0.05 },
          remembered: "The answer went out over a name, in the week it was asked for.",
          rejoinder: {
            speaker: { kind: "narrator" as const },
            text: "The letter went up the same week, and the people who asked for it read it out loud the day after.",
          },
        },
      },
      {
        id: "wait-it-out",
        tone: "conciliatory",
        text: "Say nothing this week, and let the people whose job it is finish before the government speaks.",
        commitment: {
          kind: "position",
          cost: { stability: -0.02 },
          remembered: "The government said nothing and waited for the people whose job it was to finish.",
          rejoinder: {
            speaker: { kind: "cabinet" as const, roleHint: "interior" as const },
            text: "Nothing was said, which the room read as an answer of its own, and they have written that down too.",
          },
        },
      },
    ],
  } as ScenarioDef;
}

describe("the evolved boards produce their state by running the engine", () => {
  it("opens matters at every stage, from every origin, on both sides of public and obstructed", () => {
    const open = selectOpenMatters(oversightBoard());
    expect(new Set(open.map((matter) => matter.origin.kind))).toEqual(
      new Set(["inspector-general", "committee", "special-counsel"]),
    );
    expect(new Set(open.map((matter) => matter.stage))).toEqual(new Set(["opened", "gathering", "reported"]));
    expect(new Set(open.map((matter) => matter.public))).toEqual(new Set([true, false]));
    expect(new Set(open.map((matter) => matter.obstructed))).toEqual(new Set([true, false]));
  });

  it("writes no matter onto the board that the engine's own phases did not open", () => {
    // Every matter carries the beat its opening phase wrote. A hand-poked
    // record would have an empty log, which is the tell this asserts against.
    for (const matter of oversightBoard().oversight.matters) {
      expect(matter.beats.length).toBeGreaterThan(0);
      expect(matter.beats[0]!.turn).toBe(matter.openedTurn);
    }
  });

  it("closes the government through the funding book rather than a stored flag", () => {
    const reading = selectShutdown(shutdownBoard());
    expect(reading?.weeks).toBeGreaterThanOrEqual(2);
    expect(shutdownBoard().congress.appropriation.onPriorYear).toBe(true);
    expect(shutdownBoard().lapses.some((lapse) => lapse.endedTurn === undefined)).toBe(true);
  });

  it("carries pending, effective, and invalidated rules from engine phases", () => {
    expect(new Set(rulemakingBoard().pendingRules.map((rule) => rule.status))).toEqual(
      new Set(["pending", "in-effect", "struck-down"]),
    );
  });

  it("hands the audit only the boards a batch's own conditions ask for", () => {
    expect(supplementBoards([scenarioGatedOn("none", [{ kind: "turn", atLeast: 2 }])])).toEqual([]);
    expect(supplementBoards([scenarioGatedOn("one", [{ kind: "shutdown" }])])).toHaveLength(1);
    expect(
      supplementBoards([
        scenarioGatedOn("two", [{ kind: "shutdown" }, { kind: "pendingRule", status: "pending" }]),
      ]),
    ).toHaveLength(2);
  });
});

describe("oversightMatter", () => {
  it("parses the facets and refuses a stage the census never counts", () => {
    expect(ScenarioCondition.parse({ kind: "oversightMatter", origin: "committee", stage: "reported" })).toMatchObject({
      kind: "oversightMatter",
      origin: "committee",
    });
    expect(() => ScenarioCondition.parse({ kind: "oversightMatter", stage: "closed" })).toThrow();
  });

  it("is false on a founding and true on the week the auditors caught up", () => {
    const gate = { kind: "oversightMatter", origin: "inspector-general", obstructed: true, stage: "reported" } as const;
    expect(executiveStateMet(fresh, gate)).toBe(false);
    expect(executiveStateMet(oversightBoard(), gate)).toBe(true);
  });

  it("counts across origins, so a census of three is met and one of forty is not", () => {
    expect(executiveStateMet(oversightBoard(), { kind: "oversightMatter", atLeast: 3 })).toBe(true);
    expect(executiveStateMet(oversightBoard(), { kind: "oversightMatter", atLeast: 40 })).toBe(false);
  });

  it("refuses the facets the engine can never put together", () => {
    expect(findingsFor([{ kind: "oversightMatter", stage: "reported", public: false }])).toEqual([
      "error:oversight-facets-contradict",
    ]);
    expect(findingsFor([{ kind: "oversightMatter", origin: "committee", obstructed: true }])).toEqual([
      "error:oversight-facets-contradict",
    ]);
    expect(findingsFor([{ kind: "oversightMatter", origin: "special-counsel", atLeast: 2 }])).toEqual([
      "error:oversight-count-unreachable",
    ]);
    expect(findingsFor([{ kind: "oversightMatter", atLeast: 0.5 }])).toEqual(["error:oversight-count-unreachable"]);
    expect(findingsFor([{ kind: "oversightMatter", origin: "inspector-general", obstructed: true }])).toEqual([]);
  });

  it("reaches a player", () => {
    expect(
      auditReachability([
        scenarioGatedOn("oversight-matter-probe", [
          { kind: "oversightMatter", origin: "committee", stage: "reported", public: true },
        ]),
      ]),
    ).toEqual([]);
  });
});

describe("shutdown", () => {
  it("reads the closed government and its weeks, and the open one on a founding", () => {
    expect(executiveStateMet(fresh, { kind: "shutdown" })).toBe(false);
    expect(executiveStateMet(fresh, { kind: "shutdown", is: false })).toBe(true);
    expect(executiveStateMet(shutdownBoard(), { kind: "shutdown", weeksAtLeast: 2 })).toBe(true);
    expect(executiveStateMet(shutdownBoard(), { kind: "shutdown", weeksAtLeast: 40 })).toBe(false);
  });

  it("refuses an open government asked for weeks of lapse, and warns past what one costs", () => {
    expect(findingsFor([{ kind: "shutdown", is: false, weeksAtLeast: 3 }])).toEqual([
      "error:shutdown-gate-contradicts",
    ]);
    expect(findingsFor([{ kind: "shutdown", weeksAtLeast: IMPLAUSIBLE_LAPSE_WEEKS }])).toEqual([
      "warning:shutdown-gate-contradicts",
    ]);
    expect(findingsFor([{ kind: "shutdown", weeksAtLeast: 3 }])).toEqual([]);
  });

  it("reaches a player", () => {
    expect(
      auditReachability([scenarioGatedOn("shutdown-probe", [{ kind: "shutdown", weeksAtLeast: 3 }])]),
    ).toEqual([]);
  });
});

describe("appropriation", () => {
  it("refuses a condition that states neither facet", () => {
    expect(() => ScenarioCondition.parse({ kind: "appropriation" })).toThrow();
  });

  it("reads the book on a founding and on the week it ran out", () => {
    const priorYear = { kind: "appropriation", onPriorYear: true } as const;
    expect(executiveStateMet(fresh, priorYear)).toBe(false);
    expect(executiveStateMet(shutdownBoard(), priorYear)).toBe(true);
    expect(executiveStateMet(fresh, { kind: "appropriation", weeksLeftAtMost: 4 })).toBe(false);
    expect(executiveStateMet(shutdownBoard(), { kind: "appropriation", weeksLeftAtMost: 4 })).toBe(true);
  });

  it("reaches a player", () => {
    expect(
      auditReachability([scenarioGatedOn("appropriation-probe", [{ kind: "appropriation", onPriorYear: true }])]),
    ).toEqual([]);
  });
});

describe("pendingRule", () => {
  it("counts the rules in flight and the ones that landed", () => {
    expect(executiveStateMet(fresh, { kind: "pendingRule" })).toBe(false);
    expect(executiveStateMet(rulemakingBoard(), { kind: "pendingRule", status: "pending" })).toBe(true);
    expect(executiveStateMet(rulemakingBoard(), { kind: "pendingRule", status: "in-effect" })).toBe(true);
    expect(executiveStateMet(rulemakingBoard(), { kind: "pendingRule", status: "struck-down" })).toBe(true);
    expect(executiveStateMet(rulemakingBoard(), { kind: "pendingRule", status: "stayed" })).toBe(false);
    expect(executiveStateMet(rulemakingBoard(), { kind: "pendingRule", status: "in-effect", atLeast: 2 })).toBe(false);
  });

  it("refuses a count that is not a whole number of rules", () => {
    expect(findingsFor([{ kind: "pendingRule", atLeast: 0 }])).toEqual(["error:pending-rule-count-unreachable"]);
    expect(findingsFor([{ kind: "pendingRule", atLeast: 2 }])).toEqual([]);
  });

  it("refuses content gated on a status no campaign reaches, rather than shipping it dead", () => {
    // `disapproved` needs a resolution of disapproval carried through both
    // chambers against a veto. No board reaches it, and the honest answer is a
    // refusal at the gate rather than a scenario that parses and never fires.
    expect(
      auditReachability([scenarioGatedOn("disapproved-probe", [{ kind: "pendingRule", status: "disapproved" }])]),
    ).toHaveLength(1);
  });

  it("reaches a player", () => {
    expect(
      auditReachability([scenarioGatedOn("pending-rule-probe", [{ kind: "pendingRule", status: "in-effect" }])]),
    ).toEqual([]);
    expect(
      auditReachability([scenarioGatedOn("struck-rule-probe", [{ kind: "pendingRule", status: "struck-down" }])]),
    ).toEqual([]);
  });
});

describe("institutionState openMatters, now that a board can carry one", () => {
  it("is true for one matter at a body the auditors opened on", () => {
    const audited = oversightBoard().oversight.matters.find(
      (matter) => matter.origin.kind === "inspector-general" && isMatterOpen(matter),
    );
    const institution = audited?.origin.kind === "inspector-general" ? audited.origin.institution : "INST-DOD";
    const gate = { kind: "institutionState", institution, field: "openMatters", atLeast: 1 } as const;
    expect(executiveStateMet(fresh, gate)).toBe(false);
    expect(executiveStateMet(oversightBoard(), gate)).toBe(true);
  });

  it("refuses a body asked to be under two audits at once", () => {
    expect(
      findingsFor([{ kind: "institutionState", institution: "INST-DOD", field: "openMatters", atLeast: 2 }]),
    ).toEqual(["error:institution-open-matters-unreachable"]);
  });
});
