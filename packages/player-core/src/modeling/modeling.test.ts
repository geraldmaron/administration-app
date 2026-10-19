import { describe, expect, it } from "vitest";
import { createSave } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { pendingConversations } from "../conversation/scripts";
import { ORDER_SIGN } from "../policy/order-desk";
import { BUDGET_SEND, UNTOUCHED, modelingChoice, modelingChoiceKey, type ModelingChoiceSpec } from "./choices";
import { runModelingJobs, type ModelingJob } from "./run";
import { ensembleBand, modelingView } from "./view";

const campaign = openingCampaign({ seedText: "modeling-workbench" });
const WEEKS = 2;
const MEMBERS = 2;

function jobsFor(spec: ModelingChoiceSpec): readonly ModelingJob[] {
  const choice = modelingChoice(campaign, spec)!;
  return choice.alternatives.flatMap((alternative) => Array.from({ length: MEMBERS }, (_, member) => ({ alternative: alternative.id, member })));
}

function project(spec: ModelingChoiceSpec) {
  return runModelingJobs(campaign, { spec, weeks: WEEKS, jobs: jobsFor(spec) });
}

describe("the modeling workbench", () => {
  it("keys a choice by its content, so the same draft is the same choice", () => {
    expect(modelingChoiceKey({ kind: "order", id: "order-border-controls" })).toBe("order:order-border-controls");
    expect(modelingChoiceKey({ kind: "budget-draft", draft: { domestic: 0.1, military: 0.03 } })).toBe(modelingChoiceKey({ kind: "budget-draft", draft: { military: 0.03, domestic: 0.1 } }));
  });

  it("names each alternative by the option id its own screen uses", () => {
    const cast = pendingConversations(campaign)[0]!;
    expect(modelingChoice(campaign, { kind: "decision", id: cast.def.id })!.alternatives.map((entry) => entry.id)).toEqual([UNTOUCHED, ...cast.script.options.map((option) => option.id)]);
    expect(modelingChoice(campaign, { kind: "order", id: "order-border-controls" })!.alternatives.map((entry) => entry.id)).toEqual([UNTOUCHED, ORDER_SIGN]);
    expect(modelingChoice(campaign, { kind: "budget-draft", draft: {} })!.alternatives.map((entry) => entry.id)).toEqual([UNTOUCHED, BUDGET_SEND]);
  });

  it("projects an order without touching the live campaign, and the same way twice", () => {
    const spec = { kind: "order", id: "order-border-controls" } as const;
    const before = JSON.stringify(createSave(campaign));
    const first = project(spec);
    expect(JSON.stringify(createSave(campaign))).toBe(before);
    expect(project(spec)).toEqual(first);
  });

  it("compares each alternative with the run where nothing is approved, run by run", () => {
    const spec = { kind: "order", id: "order-border-controls" } as const;
    const view = modelingView(campaign, modelingChoice(campaign, spec)!, project(spec), WEEKS);
    const [hold, sign] = view.alternatives;
    expect(hold!.baseline).toBe(true);
    expect(sign!.paired).toBe(MEMBERS);
    expect(hold!.deltas).toEqual([]);
    expect(sign!.deltas.map((delta) => delta.metric)).toContain("approval");
    expect(sign!.sureness).toMatch(/approval/);
    expect(view.weekDates).toHaveLength(WEEKS + 1);
    const approval = view.metrics.find((metric) => metric.metric === "approval")!;
    expect(approval.lines.map((line) => line.alternative)).toEqual([UNTOUCHED, ORDER_SIGN]);
    expect(approval.lines[0]!.points).toHaveLength(WEEKS + 1);
    expect(view.movers.every((mover) => mover.alternative === ORDER_SIGN)).toBe(true);
  });

  it("separates a decision's replies where the engine prices them differently", () => {
    const spec = { kind: "decision", id: pendingConversations(campaign)[0]!.def.id } as const;
    const view = modelingView(campaign, modelingChoice(campaign, spec)!, project(spec), WEEKS);
    const answered = view.alternatives.filter((alternative) => !alternative.baseline && alternative.refused === undefined);
    expect(answered.length).toBeGreaterThan(0);
    expect(answered.some((alternative) => alternative.deltas.some((delta) => delta.agreement !== "same"))).toBe(true);
  });

  it("pairs a partial ensemble only on the runs both sides have finished", () => {
    const spec = { kind: "order", id: "order-border-controls" } as const;
    const runs = project(spec);
    const partial = runs.filter((run) => !(run.alternative === UNTOUCHED && run.member === 1));
    const view = modelingView(campaign, modelingChoice(campaign, spec)!, partial, WEEKS);
    expect(view.members).toBe(1);
    const first = modelingView(campaign, modelingChoice(campaign, spec)!, runs.filter((run) => run.member === 0), WEEKS);
    expect(view.alternatives).toEqual(first.alternatives);
  });

  it("projects a screen's own options through the call its commit makes, from a run it adds with nothing approved", () => {
    const spec = { kind: "acts", title: "Markets", against: "no lever", baselineMeaning: "No lever.", alternatives: [{ id: "fed-ease", label: "Ask the Fed to ease", act: { act: "lever", key: "fed-ease" } }] } as const;
    expect(modelingChoice(campaign, spec)!.alternatives.map((entry) => [entry.id, entry.baseline])).toEqual([[UNTOUCHED, true], ["fed-ease", false]]);
    const runs = runModelingJobs(campaign, { spec, weeks: 1, jobs: [{ alternative: UNTOUCHED, member: 0 }, { alternative: "fed-ease", member: 0 }] });
    expect(runs).toHaveLength(2);
    expect(runs[1]!.refused ?? runs[1]!.readings.length).toBeTruthy();
    expect(modelingChoice(campaign, { ...spec, alternatives: [] })).toBeUndefined();
  });

  it("takes the middle of the runs as the line and their extremes as the band", () => {
    expect(ensembleBand([0.3, 0.1, 0.2, 0.5, 0.4])).toEqual({ median: 0.3, low: 0.1, high: 0.5 });
    expect(ensembleBand([0.1, 0.3])).toEqual({ median: 0.2, low: 0.1, high: 0.3 });
  });
});
