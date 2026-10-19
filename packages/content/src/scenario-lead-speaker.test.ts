import { describe, expect, it } from "vitest";
import { LENGTH_FLOORS, ScenarioBeat, ScenarioReply } from "./scenario.js";

// A shard cut before `ScenarioSpeakerRoleHint` narrowed away `"lead"` can
// still carry `{ kind: "cabinet", roleHint: "lead" }`. That shape always
// meant "the player speaks" (the lead chair is, by construction, always the
// player — see `ScenarioSpeakerRoleHint`'s own doc comment), so a remote
// content service serving a pre-narrowing shard must not lose it.

function replyWithRejoinderSpeaker(speaker: unknown) {
  return {
    id: "r1",
    tone: "firm",
    text: "x".repeat(LENGTH_FLOORS.reply),
    commitment: {
      kind: "position",
      cost: {},
      remembered: "x".repeat(LENGTH_FLOORS.remembered),
      rejoinder: { speaker, text: "x".repeat(LENGTH_FLOORS.beat) },
    },
  };
}

describe("ScenarioSpeaker — the pre-narrowing lead roleHint", () => {
  it("normalizes an opening beat's stale lead speaker to the player", () => {
    const parsed = ScenarioBeat.parse({
      speaker: { kind: "cabinet", roleHint: "lead" },
      text: "x".repeat(LENGTH_FLOORS.beat),
    });
    expect(parsed.speaker).toEqual({ kind: "player" });
  });

  it("still accepts a real department hint unchanged", () => {
    const parsed = ScenarioBeat.parse({
      speaker: { kind: "cabinet", roleHint: "defense" },
      text: "x".repeat(LENGTH_FLOORS.beat),
    });
    expect(parsed.speaker).toEqual({ kind: "cabinet", roleHint: "defense" });
  });

  it("still rejects a genuinely unrecognized roleHint", () => {
    // The example moved because the vocabulary widened: `health` used to be a
    // stand-in for "a chair this game does not seat", and the game now seats a
    // Secretary of Health and Human Services. The rule it is guarding has not
    // changed — a hint outside the enum must not parse — so it needs a hint
    // that is still genuinely outside it. The government models no ministry of
    // sport, and a closed vocabulary is the whole reason this test exists.
    expect(() =>
      ScenarioBeat.parse({ speaker: { kind: "cabinet", roleHint: "sport" }, text: "x".repeat(LENGTH_FLOORS.beat) }),
    ).toThrow();
  });
});

describe("ScenarioRejoinderSpeaker — the pre-narrowing lead roleHint", () => {
  it("normalizes a stale lead rejoinder speaker to the narrator, since a rejoinder has no player kind", () => {
    const parsed = ScenarioReply.parse(replyWithRejoinderSpeaker({ kind: "cabinet", roleHint: "lead" }));
    if (parsed.commitment.kind !== "position") throw new Error("unreachable");
    expect(parsed.commitment.rejoinder.speaker).toEqual({ kind: "narrator" });
  });

  it("still accepts a real department hint unchanged", () => {
    const parsed = ScenarioReply.parse(replyWithRejoinderSpeaker({ kind: "cabinet", roleHint: "finance" }));
    if (parsed.commitment.kind !== "position") throw new Error("unreachable");
    expect(parsed.commitment.rejoinder.speaker).toEqual({ kind: "cabinet", roleHint: "finance" });
  });
});
