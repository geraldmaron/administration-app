import { describe, expect, it } from "vitest";
import { actForText, addDays, apply, commitReply, conferenceRecommendationDeadline, createRngStreams, createSave, loadSave, openConversation, projectReply, type Bill, type Campaign } from "@admin/engine";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { auditScenarioCommands } from "./scenario-audit-command.js";
import { billBoards } from "./preview-board-bill.js";
import { auditReachability } from "./scenario-reachability.js";
import { castScenario, castStillBound } from "./scenario-cast.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
import type { ScenarioDef } from "./scenario.js";

const base = FIXTURE_SCENARIOS[0]!;
const actId = "act-health-coverage";

function board(stage: "markup" | "conference"): Campaign {
  const state = sealedCampaign(`bill-${stage}`);
  const id = `bill:${actId}:${state.turn}`;
  const bill: Bill = { id, act: actId, title: actForText(actId, "base")!.title,
    sponsor: "administration", introducedTurn: state.turn, status: "in-progress", stage, passage: [],
    ...(stage === "conference" ? { beats: [{ turn: state.turn - 1, stage: "floor", outcome: "success", account: "Both chambers passed different texts." }],
      text: { house: "base", senate: "targeted", initialPassage: [
      { chamber: "house" as const, yeas: 230, nays: 205, required: 218, passed: true },
      { chamber: "senate" as const, yeas: 55, nays: 45, required: 51, passed: true },
    ] } } : {}) };
  return { ...state, bills: { ...state.bills, [id]: bill } };
}

function scenario(stage: "markup" | "conference"): ScenarioDef {
  return { ...base, id: `bill-${stage}-probe`, cast: { pick: "liveBill" },
    conditions: [{ kind: "liveBill", stage, ...(stage === "conference" ? { responseText: "targeted" as const } : {}) }], subject: "The {{billTitle}} provision is before Congress",
    opening: [{ speaker: { kind: "narrator" }, text: "The provision reads: {{billProvision}} Congress is waiting for the President's answer." }],
    replies: [{ ...base.replies[0]!, commitment: { kind: "position", cost: {},
      billText: stage === "markup" ? { action: "propose" } : { action: "recommend", text: "targeted" },
      remembered: "The President answered the pending bill text.",
      rejoinder: { speaker: { kind: "narrator" }, text: "Congress received the recommendation and will take the next vote." } } }],
  };
}

describe("live bill scenario binding", () => {
  it("admits a late conference cast for its final response day but not at the autonomous deadline", () => {
    const state = board("conference");
    const bill = Object.values(state.bills)[0]!;
    const deadline = conferenceRecommendationDeadline(state, bill)!;
    const lastChance = { ...state, calendar: addDays(deadline, -1) };
    const cast = castScenario(lastChance, scenario("conference"));
    expect(cast?.bill?.conferenceDeadline).toEqual(deadline);
    expect(castScenario({ ...state, calendar: deadline }, scenario("conference"))).toBeUndefined();
  });
  it("offers both passed conference texts as distinct executable recommendations", () => {
    const state = board("conference");
    const single = scenario("conference");
    const first = single.replies[0]!;
    if (first.commitment.kind !== "position") throw new Error("bill fixture needs a position reply");
    const def: ScenarioDef = { ...single, id: "bill-conference-two-texts", conditions: [{ kind: "liveBill", stage: "conference", responseText: "both" }],
      opening: [{ speaker: { kind: "narrator" }, text: "The House passed {{billHouseProvision}}; the Senate passed {{billSenateProvision}}. Both chambers must vote again." }],
      replies: [
        { ...first, id: "recommend-house", commitment: { ...first.commitment, billText: { action: "recommend", text: "house" } } },
        { ...first, id: "recommend-senate", tone: "principled", commitment: { ...first.commitment, billText: { action: "recommend", text: "senate" } } },
      ] };
    const findings: ScenarioFinding[] = [];
    auditScenarioCommands(def, findings);
    expect(findings).toEqual([]);
    const cast = castScenario(state, def)!;
    expect(cast.script.opening[0]!.text).toContain(actForText(actId, "base")!.summary);
    expect(cast.script.opening[0]!.text).toContain(actForText(actId, "targeted")!.summary);
    const thread = openConversation(state, cast.script, createRngStreams(state.seed));
    expect(thread.replies).toHaveLength(2);
    expect(thread.replies.every((reply) => reply.available)).toBe(true);
    for (const [index, expected] of ["base", "targeted"].entries()) {
      const option = cast.script.options[index]!;
      expect(projectReply(state, cast.script, option, createRngStreams(state.seed)).available).toBe(true);
      const committed = commitReply(state, cast.script, option, createRngStreams(state.seed));
      expect(committed.ok).toBe(true);
      if (!committed.ok) continue;
      expect(apply(state, committed.packet).bills[cast.bill!.id]?.text?.conference).toBe(expected);
    }
    expect(billBoards([def])).toHaveLength(1);
    expect(auditReachability([def])).toEqual([]);
  });

  it("reaches a genuine two-text grid conference when energy import dependence puts the measure on the agenda", () => {
    const def: ScenarioDef = { ...scenario("conference"), id: "grid-conference-probe",
      conditions: [{ kind: "liveBill", stage: "conference", act: "act-clean-grid", responseText: "both" }] };
    expect(billBoards([def])).toHaveLength(1);
    expect(auditReachability([def])).toEqual([]);
  });

  it.each(["markup", "conference"] as const)("pins and executes a %s bill reply after save/reopen", (stage) => {
    const state = board(stage);
    const def = scenario(stage);
    const findings: ScenarioFinding[] = [];
    auditScenarioCommands(def, findings);
    expect(findings).toEqual([]);
    const cast = castScenario(state, def)!;
    expect(cast.occurrence).toBe(`${def.id}@bill:${cast.bill!.id}`);
    expect(cast.script.subject).toContain(cast.bill!.title);
    expect(cast.script.opening[0]!.text).toContain(actForText(actId, "targeted")!.summary);
    expect(castStillBound(loadSave(JSON.parse(JSON.stringify(createSave(state)))), cast)).toBe(true);
    const option = cast.script.options[0]!;
    expect(projectReply(state, cast.script, option, createRngStreams(state.seed)).available).toBe(true);
    const committed = commitReply(state, cast.script, option, createRngStreams(state.seed));
    expect(committed.ok).toBe(true);
    if (!committed.ok) return;
    const after = apply(state, committed.packet);
    expect(after.bills[cast.bill!.id]?.text?.[stage === "markup" ? "proposed" : "conference"]).toBe("targeted");
    expect(castStillBound(after, cast)).toBe(false);
  });

  it("refuses a stale pinned bill in preview and commit", () => {
    const state = board("markup");
    const cast = castScenario(state, scenario("markup"))!;
    const bill = state.bills[cast.bill!.id]!;
    const changed = { ...state, bills: { ...state.bills, [bill.id]: { ...bill, title: `${bill.title} revised` } } };
    expect(castStillBound(changed, cast)).toBe(false);
    expect(projectReply(changed, cast.script, cast.script.options[0]!, createRngStreams(changed.seed)).available).toBe(false);
    expect(commitReply(changed, cast.script, cast.script.options[0]!, createRngStreams(changed.seed)).ok).toBe(false);
  });

  it("rejects a bill gate whose reply cannot execute against the pinned stage", () => {
    const def = scenario("conference");
    const findings: ScenarioFinding[] = [];
    auditScenarioCommands({ ...def, conditions: [{ kind: "liveBill", stage: "conference", responseText: "base" }] }, findings);
    expect(findings.some((finding) => finding.kind === "ungrounded-command")).toBe(true);
    const missing: ScenarioFinding[] = [];
    auditScenarioCommands({ ...def, replies: base.replies }, missing);
    expect(missing.some((finding) => finding.message.includes("executable bill-text reply"))).toBe(true);
  });

  it("builds a transmitted-bill board for the authoring reachability gate", () => {
    for (const stage of ["markup", "conference"] as const) {
      const def = scenario(stage);
      expect(billBoards([def])).toHaveLength(1);
      expect(auditReachability([def])).toEqual([]);
    }
  });
});
