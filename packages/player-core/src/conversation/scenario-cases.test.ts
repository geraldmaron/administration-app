// An open scenario case survives a second draw. The desk-closed flag does not
// choose what is waiting, and a case settled today is not replaced today.
import { describe, expect, it } from "vitest";
import { addDays, apply, createSave, loadSave, withDueCaseDefaults, type Bill, type Campaign } from "@admin/engine";
import { castBound, ScenarioDef, scenarioPutOffEffect } from "@admin/content";
import { BUNDLED_SHARDS } from "../content/bundled-corpus.generated";
import { personFile } from "../dossier/person-file";
import { openingCampaign } from "../__fixtures__/opening";
import { RESPONSE_WINDOW_DAYS } from "./arrival";
import { openScenarioCasts, unansweredScenarioCasts, withScenarioCases, withWithdrawnScenarioCases } from "./scenario-cases";
import { pendingConversations, seatScenarioCases } from "./scripts";

function putOff(campaign: Campaign, id: string, days: number): Campaign {
  const effect = scenarioPutOffEffect(campaign, id, addDays(campaign.calendar, days));
  if (effect === undefined) throw new Error("expected the case to take a deferral");
  return apply(campaign, { source: "action", actor: "player", turn: campaign.turn, narration: { summary: "Put off." }, effects: [effect] });
}

describe("scenario cases", () => {
  it("seats a named mayor with the frozen case and retains their municipal dossier after reload", () => {
    const campaign = openingCampaign();
    const shipped = BUNDLED_SHARDS.flatMap((shard) => shard.jsonl.split("\n").filter(Boolean).map((line: string) => ScenarioDef.parse(JSON.parse(line))));
    const base = shipped.find((def) => def.id === "the-yard-that-builds-the-boats")!;
    const def = ScenarioDef.parse({ ...base, subjects: [{ key: "sender", source: "mayor" }],
      transmission: { relay: "letter", domesticSubject: "sender", attribution: "Letter from {{sender}}", text: base.opening[0]!.text } });
    const cast = castBound(campaign, def, campaign.founding.nation);
    const subject = cast.script.subjects!.find((item) => item.key === "sender")!;
    expect(campaign.people[subject.person!]).toBeUndefined();
    const restored = loadSave(JSON.parse(JSON.stringify(createSave(withScenarioCases(campaign, [cast])))));
    expect(restored.people[subject.person!]?.base.name).toBe(subject.name);
    expect(openScenarioCasts(restored)[0]?.transmission?.source).toBe(subject.name);
    expect(personFile(restored, subject.person!)?.dossier.standing.kind).toBe("mayor");
    expect(restored.cases![`scenario:${def.id}`]!.story?.subjects).toContainEqual(subject);
  });

  it("keeps the frozen subject when the same id is drawn again", () => {
    const seated = seatScenarioCases(openingCampaign());
    const id = Object.keys(seated.cases ?? {})[0];
    expect(id).toBeDefined();
    const item = seated.cases?.[id!];
    expect(item?.authoredSnapshot).toBeDefined();
    const frozen = JSON.parse(item!.authoredSnapshot!) as { script: { subject: string } };
    frozen.script.subject = "The frozen decision";
    const tampered = {
      ...seated,
      cases: { ...seated.cases, [id!]: { ...item!, authoredSnapshot: JSON.stringify(frozen) } },
      player: { ...seated.player, flags: { ...seated.player.flags, [`desk:closed:${seated.turn}`]: true } },
    };
    expect(pendingConversations(tampered).map((cast) => cast.script.subject)).toEqual(["The frozen decision"]);
  });

  it("does not raise another case on the day one was answered", () => {
    const seated = seatScenarioCases(openingCampaign());
    const id = Object.keys(seated.cases ?? {})[0]!;
    const answered = apply(seated, {
      source: "conversation",
      actor: "player",
      turn: seated.turn,
      narration: { summary: "Answered." },
      effects: [
        {
          kind: "case",
          actor: "player",
          transition: { id, disposition: { kind: "act", actionId: "reply" }, narration: "Answered." },
        },
      ],
    });
    expect(answered.cases?.[id]?.status).toBe("acted");
    expect(pendingConversations(answered)).toEqual([]);
    expect(seatScenarioCases(answered)).toBe(answered);
  });

  it("takes a decision put off off today's desk, and draws no other in its place", () => {
    const seated = seatScenarioCases(openingCampaign());
    const id = Object.keys(seated.cases ?? {})[0]!;
    const deferred = putOff(seated, id, 5);
    expect(deferred.cases?.[id]?.status).toBe("deferred");
    expect(pendingConversations(deferred)).toEqual([]);
    expect(seatScenarioCases(deferred)).toBe(deferred);
    const returned = { ...deferred, calendar: addDays(deferred.calendar, 5) };
    expect(pendingConversations(returned).map((cast) => `scenario:${cast.def.id}`)).toEqual([id]);
  });

  it("never puts a decision off past its own window", () => {
    const seated = seatScenarioCases(openingCampaign());
    const id = Object.keys(seated.cases ?? {})[0]!;
    const item = seated.cases![id]!;
    if (item.clock.kind === "none") throw new Error("expected a scenario case to carry its window");
    const deferred = putOff(seated, id, 30);
    expect(deferred.cases?.[id]?.deferredUntil).toEqual(addDays(item.clock.dueAt, -1));
  });

  it("lets an unanswered decision lapse when its window closes, and owes the lapse its price", () => {
    const seated = seatScenarioCases(openingCampaign());
    const id = Object.keys(seated.cases ?? {})[0]!;
    const clock = seated.cases![id]!.clock;
    if (clock.kind === "none") throw new Error("expected a scenario case to carry its window");
    expect(clock.dueAt).toEqual(addDays(seated.calendar, RESPONSE_WINDOW_DAYS[pendingConversations(seated)[0]!.def.severity]));
    const closing = { ...seated, calendar: clock.dueAt };
    const lapsed = withDueCaseDefaults(closing);
    expect(lapsed.cases?.[id]?.status).toBe("defaulted");
    expect(unansweredScenarioCasts(lapsed).map((cast) => `scenario:${cast.def.id}`)).toEqual([id]);
    expect(pendingConversations(lapsed)).toEqual([]);
  });

  it("caps a late conference decision at the conferees' real deadline", () => {
    const campaign = openingCampaign();
    const baseCast = pendingConversations(campaign)[0]!;
    const dueAt = addDays(campaign.calendar, 1);
    const cast = { ...baseCast, occurrence: `${baseCast.def.id}@bill:late-conference`,
      bill: { id: "bill:late-conference", act: "act-health-coverage", title: "Health Coverage Act",
        introducedTurn: campaign.turn - 2, stage: "conference" as const,
        text: { house: "base" as const, senate: "targeted" as const }, conferenceDeadline: dueAt } };
    const seated = withScenarioCases(campaign, [cast]);
    const id = `scenario:${cast.occurrence}`;
    expect(seated.cases?.[id]?.clock).toEqual({ kind: "opportunity", dueAt });
    expect(scenarioPutOffEffect(seated, id, addDays(campaign.calendar, 10))).toBeUndefined();
    const lapsed = withDueCaseDefaults({ ...seated, calendar: dueAt });
    expect(lapsed.cases?.[id]?.status).toBe("defaulted");
  });

  it("withdraws a decision whose subject is over rather than holding the desk on it", () => {
    const seated = seatScenarioCases(openingCampaign());
    const id = Object.keys(seated.cases ?? {})[0]!;
    const item = seated.cases![id]!;
    const frozen = JSON.parse(item.authoredSnapshot!) as Record<string, unknown>;
    const bound = { ...frozen, locus: { condition: "condition:flood:USA:1" } };
    const out = { ...seated, cases: { ...seated.cases, [id]: { ...item, authoredSnapshot: JSON.stringify(bound) } } };
    expect(pendingConversations(out)).toEqual([]);
    const reseated = seatScenarioCases(out);
    expect(reseated.cases?.[id]?.status).toBe("defaulted");
    expect(unansweredScenarioCasts(reseated)).toEqual([]);
  });

  it("serializes a pinned issued report and withdraws the case when its source disappears", () => {
    const campaign = openingCampaign();
    const base = pendingConversations(campaign)[0]!;
    const report = {
      id: "report-pinned", tasking: "task-report-pinned" as const, question: "What is known?",
      status: "findings" as const, target: String(base.counterpart), targetKind: "foreign-nation" as const,
      day: 1, date: campaign.calendar, element: "IC-CIA" as const, discipline: "humint" as const,
      summary: "A sourced finding.", confidence: "moderate" as const, exposed: false, gaps: [],
      topic: "external-intent" as const, findings: [{ topic: "external-intent" as const, observation: "A move is being prepared.", source: "Liaison", asOfDay: 1 }],
    };
    const cast = { ...base, occurrence: `${base.def.id}@report:${report.id}`, report,
      def: { ...base.def, cast: { pick: "collectionReport" as const, bind: "target" as const } } };
    const seated = withScenarioCases(campaign, [cast]);
    const item = seated.cases?.[`scenario:${cast.occurrence}`];
    expect(JSON.parse(item!.authoredSnapshot!)).toMatchObject({ report: { id: "report-pinned", findings: report.findings } });
    const withdrawn = withWithdrawnScenarioCases(seated);
    expect(withdrawn.cases?.[item!.id]?.status).toBe("defaulted");
    expect(unansweredScenarioCasts(withdrawn)).toEqual([]);
  });

  it("restores a frozen live bill and withdraws it when the bill text changes", () => {
    const campaign = openingCampaign();
    const base = pendingConversations(campaign)[0]!;
    const bill: Bill = { id: "bill:act-health-coverage:case", act: "act-health-coverage", title: "Health Coverage Act",
      sponsor: "administration", introducedTurn: campaign.turn, status: "in-progress", stage: "markup", passage: [] };
    const board = { ...campaign, bills: { ...campaign.bills, [bill.id]: bill } };
    const cast = { ...base, counterpart: board.founding.nation, occurrence: `${base.def.id}@bill:${bill.id}`,
      bill: { id: bill.id, act: bill.act, title: bill.title, introducedTurn: bill.introducedTurn, stage: "markup" as const },
      def: { ...base.def, cast: { pick: "liveBill" as const }, conditions: [{ kind: "liveBill" as const, stage: "markup" as const }] } };
    const seated = withScenarioCases(board, [cast]);
    const item = seated.cases?.[`scenario:${cast.occurrence}`];
    expect(item).toBeDefined();
    if (!item) return;
    expect(JSON.parse(item.authoredSnapshot!)).toMatchObject({ bill: { id: bill.id, stage: "markup" } });
    expect(pendingConversations(seated).map((entry) => entry.bill?.id)).toContain(bill.id);
    const changed = { ...seated, bills: { ...seated.bills, [bill.id]: { ...bill, text: { proposed: "targeted" as const } } } };
    const withdrawn = withWithdrawnScenarioCases(changed);
    expect(withdrawn.cases?.[item.id]?.status).toBe("defaulted");
    expect(unansweredScenarioCasts(withdrawn)).toEqual([]);
  });
});
