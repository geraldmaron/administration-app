// The three binding rules, each proven on a scenario built to break it and on
// one built not to.
import { describe, expect, it } from "vitest";
import { CORE_SCENARIOS } from "./packs/core.js";
import { auditBindings } from "./scenario-audit-bind.js";
import type { ScenarioFinding } from "./scenario-audit-contract.js";
import type { ScenarioCondition, ScenarioDef, ScenarioLocus, ScenarioReply } from "./scenario.js";

const REPLY: ScenarioReply = {
  id: "hold-the-line",
  tone: "firm",
  text: "Hold the line where they are holding it and put the federal money behind that.",
  commitment: {
    kind: "position",
    cost: { treasury: -200 },
    remembered: "The administration put the federal money behind the line the state was already holding.",
    rejoinder: { speaker: { kind: "narrator" }, text: "The crews on the ridge road were paid federal rates by the weekend, and the reservoir held." },
  },
};

function scenario(patch: {
  readonly conditions?: readonly ScenarioCondition[];
  readonly locus?: Partial<ScenarioLocus>;
  readonly replies?: readonly ScenarioReply[];
  readonly beat?: string;
}): ScenarioDef {
  return {
    id: "probe",
    class: "disaster",
    severity: "serious",
    dilemmaShape: "allocation",
    subject: "The line above the reservoir",
    cast: { pick: "stricken" },
    locus: {
      site: "interior",
      ground: "home",
      descriptor: "the fire camp on the ridge road above the reservoir that supplies the valley",
      ...patch.locus,
    },
    conditions: patch.conditions ?? [],
    weight: 1,
    opening: [{ speaker: { kind: "narrator" }, text: patch.beat ?? "The line held overnight and the crews are asking what happens if it does not hold again." }],
    replies: patch.replies ?? [REPLY, { ...REPLY, id: "let-the-state-carry-it" }],
  } as ScenarioDef;
}

function kinds(def: ScenarioDef): readonly string[] {
  const findings: ScenarioFinding[] = [];
  auditBindings([def], findings);
  return findings.map((finding) => finding.kind);
}

const WILDFIRE: ScenarioCondition = { kind: "conditionActive", condition: "wildfire", atLeast: 0.1 };

describe("unbound-disaster", () => {
  it("warns on a home disaster whose locus rolls its own place", () => {
    expect(kinds(scenario({ conditions: [WILDFIRE] }))).toContain("unbound-disaster");
  });

  it("is a warning, never an error", () => {
    const findings: ScenarioFinding[] = [];
    auditBindings([scenario({ conditions: [WILDFIRE] })], findings);
    expect(findings.filter((finding) => finding.kind === "unbound-disaster").every((finding) => finding.severity === "warning")).toBe(true);
  });

  it("says nothing once the place follows the condition", () => {
    expect(kinds(scenario({ conditions: [WILDFIRE], locus: { bind: "condition" } }))).not.toContain("unbound-disaster");
  });

  it("says nothing about an authored set piece", () => {
    expect(kinds(scenario({ conditions: [WILDFIRE], locus: { state: "CO" } }))).not.toContain("unbound-disaster");
  });

  // A standing condition is not a place that was struck, and a foreign-ground
  // scenario has no state to bind to at all.
  it("says nothing about a standing condition or foreign ground", () => {
    expect(kinds(scenario({ conditions: [{ kind: "conditionActive", condition: "recession", atLeast: 0.1 }] }))).not.toContain("unbound-disaster");
    expect(kinds(scenario({ conditions: [WILDFIRE], locus: { ground: "counterpart" } }))).not.toContain("unbound-disaster");
  });
});

describe("season-literal", () => {
  it("warns on a season in the prose with no calendar gate", () => {
    expect(kinds(scenario({ beat: "The crews want to know whether the line holds until winter, because nobody believes it holds through August." }))).toContain("season-literal");
  });

  it("says nothing once the scenario is gated on the calendar", () => {
    expect(
      kinds(
        scenario({
          conditions: [{ kind: "calendar", season: "summer" }],
          beat: "The crews want to know whether the line holds until winter, because nobody believes it holds through August.",
        }),
      ),
    ).not.toContain("season-literal");
  });

  // "the march on the capital" and "the fall of the government" are not seasons.
  it("does not read a march or a fall as a season", () => {
    expect(kinds(scenario({ beat: "The march on the capital began at noon and the fall of the coalition was announced before it reached the square." }))).not.toContain("season-literal");
  });
});

describe("narrated-vacancy", () => {
  const resigning = (text: string): ScenarioReply => ({
    ...REPLY,
    commitment: {
      kind: "position",
      cost: { treasury: -200 },
      remembered: text,
      rejoinder: { speaker: { kind: "narrator" }, text: "The line held for two more days and then it did not." },
    },
  });

  it("warns when a card says a seated chair resigned", () => {
    expect(kinds(scenario({ replies: [resigning("The Secretary of the Interior resigned the same afternoon and said so on the way out."), { ...REPLY, id: "second" }] }))).toContain(
      "narrated-vacancy",
    );
  });

  it("warns on the seat named without its department", () => {
    expect(kinds(scenario({ replies: [resigning("The Secretary stepped down before the week was out, and nobody in the building was surprised."), { ...REPLY, id: "second" }] }))).toContain(
      "narrated-vacancy",
    );
  });

  // The game seats chairs, not deputies: flagging ordinary aftermath about
  // people it does not model would train an author to ignore the rule.
  it("says nothing about somebody the game does not seat", () => {
    expect(kinds(scenario({ replies: [resigning("Their deputy resigned in the afternoon and the coastal papers had the letter before anyone else did."), { ...REPLY, id: "second" }] }))).not.toContain(
      "narrated-vacancy",
    );
  });

  // One breath: a chair mentioned in one sentence and a resignation in another
  // are two facts, not one event.
  it("needs the chair and the departure in the same sentence", () => {
    expect(
      kinds(
        scenario({
          replies: [resigning("The Secretary of Labor took the call herself. An official who had never been named resigned that evening."), { ...REPLY, id: "second" }],
        }),
      ),
    ).not.toContain("narrated-vacancy");
  });
});

describe("the shipped core pack", () => {
  // Zero, not a debt allowance. All three rules landed after the pack shipped
  // and all three found something real in it — five season literals, the depot
  // strike among them, whose every line says "winter pay" and which the draw was
  // as likely to deal in July. The pack is the craft bar, so it was fixed rather
  // than exempted: the strike is gated on the heating season, and the four
  // loose season words are gone from the prose.
  it("clears every binding rule", () => {
    const findings: ScenarioFinding[] = [];
    auditBindings(CORE_SCENARIOS, findings);
    expect(findings).toEqual([]);
  });
});
