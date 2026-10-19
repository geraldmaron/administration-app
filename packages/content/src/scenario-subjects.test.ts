import { describe, expect, it } from "vitest";
import { apply, commitReply, createRngStreams, createSave, loadSave, type Campaign } from "@admin/engine";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { plantHolidayScenario } from "./__fixtures__/plant-holiday.js";
import { selectorOf } from "./corpus/selector.js";
import { memoryPool, drawFromResidentPool } from "./corpus/pool.js";
import { castBound, castScenario, scenarioLive } from "./scenario-cast.js";
import { rememberReply } from "./scenario-reply-memory.js";
import { ScenarioDef } from "./scenario.js";

const original = { ...plantHolidayScenario, entities: ["voss-shipyard"], subjects: [{ key: "yard", source: "entity" as const, entity: "voss-shipyard" }] };
const board = sealedCampaign("subject-persistence");

function raised(campaign: Campaign) {
  const cast = castBound(campaign, original, campaign.founding.nation);
  return { cast, campaign: apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn,
    narration: { summary: "Existing fixture raised." }, effects: [{ kind: "case", actor: "world", raise: {
      id: `scenario:${cast.def.id}`, kind: "authored-scenario", title: cast.script.subject,
      subject: { kind: "scenario", id: cast.def.id }, clock: { kind: "none" }, defaultOutcome: { kind: "none" },
      urgency: "soft", responseRequirement: "president", allowedDispositions: ["act"],
      story: { scenario: cast.def.id, subjects: cast.script.subjects! } } }] }) };
}

describe("persistent story subjects", () => {
  it("uses the same person identity across unrelated cases and retains token aliases", () => {
    const def = { ...original, subjects: [{ key: "official", source: "governor" as const }] };
    const first = castBound(board, def, board.founding.nation);
    const held = first.script.subjects!.find((subject) => subject.key === "official")!;
    const caseBoard = raised(board).campaign;
    const persisted: Campaign = { ...caseBoard, cases: { ...caseBoard.cases,
      [`scenario:${original.id}`]: { ...caseBoard.cases![`scenario:${original.id}`]!, story: { scenario: original.id, subjects: [held] } } } };
    const next = castBound(loadSave(JSON.parse(JSON.stringify(createSave(persisted)))), { ...def, id: "unrelated-governor-case",
      subjects: [{ key: "sender", source: "governor" }, { key: "signer", source: "governor" }] }, board.founding.nation);
    const aliases = next.script.subjects!.filter((subject) => subject.person === held.person);
    expect(held.id).toBe(held.person);
    expect(aliases.map((subject) => subject.key)).toEqual(["sender", "signer"]);
    expect(aliases.every((subject) => subject.id === held.id && subject.originCase === held.originCase)).toBe(true);
  });

  it("keeps a registered identity and causal link across the answer, save and callback", () => {
    const first = raised(board);
    const option = first.cast.script.options.find((reply) => reply.id === "approve-ten")!;
    const result = commitReply(first.campaign, first.cast.script, option, createRngStreams(board.seed));
    if (!result.ok) throw new Error(result.missingCapability);
    const answered = apply(first.campaign, rememberReply(first.campaign, result.packet, first.cast, option.id));
    const restored = loadSave(JSON.parse(JSON.stringify(createSave(answered))));
    const next = castBound(restored, { ...original, id: "subject-follow-up", entities: [],
      subjects: [{ key: "sameyard", source: "inherit", scenario: original.id, slot: "yard" }] }, board.founding.nation);
    expect(next.script.subjects![0]).toMatchObject({ ...first.cast.script.subjects![0], key: "sameyard" });
    expect(next.script.subjectCauseIds).toContain(answered.ledger.at(-1)!.causal!.eventId);
    expect(answered.ledger.at(-1)!.subjects?.[0]?.id).toBe("entity:voss-shipyard");
    const flagCallback = castBound(restored, { ...original, id: "flag-subject-follow-up", entities: [], subjects: [],
      conditions: [{ kind: "flag", flag: "approved-the-ten-year-holiday", is: true }] }, board.founding.nation);
    expect(flagCallback.script.subjects?.[0]?.id).toBe("entity:voss-shipyard");
    const followResult = commitReply(restored, flagCallback.script, flagCallback.script.options[0]!, createRngStreams(board.seed));
    if (!followResult.ok) throw new Error(followResult.missingCapability);
    expect(followResult.packet.provenance?.causeIds).toContain(answered.ledger.at(-1)!.causal!.eventId);
  });

  it("pins the person introduced as governor instead of replacing them with their successor", () => {
    const def = { ...original, subjects: [{ key: "official", source: "governor" as const }] };
    const first = castBound(board, def, board.founding.nation);
    const held = first.script.subjects!.find((subject) => subject.key === "official")!;
    expect(held.person).toBe(board.states.PA!.governor!.person);
    const caseBoard = raised(board).campaign;
    const changed: Campaign = { ...caseBoard, cases: { ...caseBoard.cases,
      [`scenario:${original.id}`]: { ...caseBoard.cases![`scenario:${original.id}`]!, story: { scenario: original.id, subjects: [held] } } },
      states: { ...caseBoard.states, PA: { ...caseBoard.states.PA!, governor: caseBoard.states.NY!.governor } } };
    const follow = castBound(changed, { ...def, id: "official-follow", entities: [],
      subjects: [{ key: "official", source: "inherit", scenario: original.id, slot: "official" }] }, board.founding.nation);
    expect(follow.script.subjects![0]!.person).toBe(held.person);
  });

  it("excludes a missing predecessor and rejects duplicate or reserved token keys", () => {
    const callback = { ...original, cast: { pick: "none" as const }, subjects: [{ key: "sameyard", source: "inherit" as const, scenario: "not-yet-seen", slot: "yard" }] };
    expect(castScenario(board, callback)).toBeUndefined();
    expect(scenarioLive(board, selectorOf(callback), board.founding.nation)).toBe(false);
    expect(drawFromResidentPool(board, memoryPool([callback]))).toBeUndefined();
    expect(() => castBound(board, callback, board.founding.nation)).toThrow("required story subject");
    expect(ScenarioDef.safeParse({ ...original, subjects: [...original.subjects, ...original.subjects] }).success).toBe(false);
    expect(ScenarioDef.safeParse({ ...original, subjects: [{ ...original.subjects[0], key: "governor" }] }).success).toBe(false);
  });
});
