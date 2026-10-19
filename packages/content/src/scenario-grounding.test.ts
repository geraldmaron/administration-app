import { describe, expect, it } from "vitest";
import {
  auditConditionVocabularySpread,
  auditCriticalPricesLife,
  auditDecapitatedOpening,
  auditForeignCastTransmission,
  auditGateOnNothing,
  auditGrounding,
  auditHardcodedAssembly,
  auditParticularsFloor,
  auditUnmooredPrice,
  strippedHead,
} from "./scenario-grounding.js";
import type { ScenarioDef, ScenarioFinding } from "./index.js";

// A scenario bound the way §6.2 asks: a real condition, four particulars, a
// counterpart that speaks for itself, a priced human toll, and a first
// sentence that is a sentence. Every test below breaks exactly one of those.
function boundScenario(overrides: Partial<ScenarioDef> = {}): ScenarioDef {
  return {
    id: "test-scenario",
    class: "foreign-crisis",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "A test of nerve",
    cast: { pick: "tensest" },
    conditions: [{ kind: "relationship", field: "trust", atMost: 0.5 }],
    weight: 1,
    locus: { site: "border", ground: "counterpart", descriptor: "the frontier track where the patrol crossed" },
    particulars: [
      { label: "Crossing", value: "Two hours before first light" },
      { label: "Depth", value: "Four hundred yards past the line" },
      { label: "Photographs", value: "Nine, timed and filed" },
      { label: "Last incident", value: "Two winters ago, same track" },
    ],
    transmission: {
      relay: "cable",
      text: "The patrol was inside its own ground and will be there again tomorrow. We are not asking, and we will not be answering questions about the timing of it.",
      attribution: "Their foreign ministry, to our embassy",
    },
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
          impact: { human: { lives: "isolated", borneBy: "one-region" } },
          remembered: "The line held where it was drawn, and the government said so out loud the same day.",
          rejoinder: {
            speaker: { kind: "narrator" },
            text: "The patrol came back the following night with a second vehicle, and the duty officer photographed that too.",
          },
        },
      },
    ],
    ...overrides,
  };
}

const kindsOf = (def: ScenarioDef): string[] => {
  const findings: ScenarioFinding[] = [];
  auditGrounding(def, findings);
  return findings.map((finding) => finding.kind);
};

function fire(rule: (def: ScenarioDef, sink: { push(f: ScenarioFinding): void }) => void, def: ScenarioDef): ScenarioFinding[] {
  const findings: ScenarioFinding[] = [];
  rule(def, findings);
  return findings;
}

describe("the grounded opening", () => {
  it("passes a scenario bound the way the doctrine asks", () => {
    expect(kindsOf(boundScenario())).toEqual([]);
  });

  it("refuses a first beat that starts mid-clause", () => {
    const def = boundScenario({
      opening: [{ speaker: { kind: "narrator" }, text: "patrol crossed the line before first light and sat there for two hours in plain view." }],
    });
    const [finding] = fire(auditDecapitatedOpening, def);
    expect(finding?.severity).toBe("error");
    // The fix is a rewrite; a rule that says "capitalize" teaches the defect.
    expect(finding?.message).toContain("Rewrite the sentence");
  });

  it("leaves a beat opening on a binder token alone, whatever its case", () => {
    const def = boundScenario({
      opening: [{ speaker: { kind: "narrator" }, text: "{{counterpart}} moved a patrol across the line before first light and left it there for two hours." }],
    });
    expect(fire(auditDecapitatedOpening, def)).toEqual([]);
  });

  // The review of BL-252's repairs found each of these by hand after the gate
  // had passed them: a capital on the wreckage, or a demonym in front of it.
  it.each([
    "Facility stays open past the deadline, and the county has stopped asking why.",
    "Man who negotiated the last ceasefire is asking to be sent back.",
    "City council voted at midnight to paint over the mural before the festival.",
    "Operation succeeded, and the two engineers are home.",
    "Overnight patrol flagged two men near the terminal with wiring in a gym bag.",
    "Roofing contract for the House annex went to a firm that shares an address.",
    "Freeze order was signed nine days ago, and the accounts are still moving.",
    "{{counterpartAdjective}} coast guard is holding six of our trawlers and their crews.",
    "{{counterpartAdjective}} fisheries office has floated the same idea.",
  ])("refuses a capitalized first beat with its determiner stripped: %s", (text) => {
    const def = boundScenario({ opening: [{ speaker: { kind: "narrator" }, text }] });
    const [finding] = fire(auditDecapitatedOpening, def);
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain("no determiner");
  });

  it.each([
    "Backup generators at the central hospital failed twenty minutes into the surgery.",
    "Refinery workers voted four to one before the morning shift to walk out.",
    "Ship procurement is underway under emergency authority.",
    "Water came over the levee crest at ten past four this morning.",
    "Baltimore's port authority has closed the outer berths.",
    "Operation Nightfall began before dawn on the southern ridge.",
    "Second contracts went out to the same three firms.",
    "Word came overnight that the convoy had turned back.",
    "State has a channel to the ministry open tonight.",
    "{{counterpartAdjective}} officials have asked for the talks to move.",
    "Border villages are awake, and someone has filmed the column's lights.",
  ])("passes a first beat that is a sentence: %s", (text) => {
    expect(strippedHead(text)).toBeUndefined();
    expect(fire(auditDecapitatedOpening, boundScenario({ opening: [{ speaker: { kind: "narrator" }, text }] }))).toEqual([]);
  });

  it("calls zero particulars an error and a thin set a warning", () => {
    expect(fire(auditParticularsFloor, boundScenario({ particulars: undefined }))[0]?.severity).toBe("error");
    const thin = boundScenario({ particulars: [{ label: "Crossing", value: "Two hours before first light" }] });
    expect(fire(auditParticularsFloor, thin)[0]?.severity).toBe("warning");
    expect(fire(auditParticularsFloor, boundScenario())).toEqual([]);
  });

  it("wants the counterpart's own words on a foreign week, and insists at critical", () => {
    expect(fire(auditForeignCastTransmission, boundScenario({ transmission: undefined }))[0]?.severity).toBe("warning");
    const critical = boundScenario({ transmission: undefined, severity: "critical" });
    expect(fire(auditForeignCastTransmission, critical)[0]?.severity).toBe("error");
    // Nobody sent it, so nobody is missing from it.
    expect(fire(auditForeignCastTransmission, boundScenario({ cast: { pick: "none" }, transmission: undefined }))).toEqual([]);
    expect(fire(auditForeignCastTransmission, boundScenario({ cast: { pick: "liveBill" }, transmission: undefined }))).toEqual([]);
  });

  it("warns when a critical week prices no human toll anywhere", () => {
    const def = boundScenario({ severity: "critical" });
    const bloodless = {
      ...def,
      replies: def.replies.map((reply) => ({
        ...reply,
        commitment: { ...reply.commitment, impact: undefined } as ScenarioDef["replies"][number]["commitment"],
      })),
    };
    expect(fire(auditCriticalPricesLife, bloodless)[0]?.severity).toBe("warning");
    expect(fire(auditCriticalPricesLife, def)).toEqual([]);
  });

  it("catches the player's legislature written as the assembly, and spares the assembly line", () => {
    const literal = boundScenario({ subject: "Appropriation the assembly never signed" });
    expect(fire(auditHardcodedAssembly, literal)[0]?.severity).toBe("error");
    const line = boundScenario({
      locus: { site: "border", ground: "counterpart", descriptor: "the assembly area behind the crossing, where the trucks are held" },
    });
    expect(fire(auditHardcodedAssembly, line)).toEqual([]);
    // The placeholder renders correctly and is not the defect.
    expect(fire(auditHardcodedAssembly, boundScenario({ subject: "What {{assembly}} never signed" }))).toEqual([]);
  });
});

describe("the binding contract", () => {
  it("warns on a week gated on nothing, and refuses one at critical", () => {
    expect(fire(auditGateOnNothing, boundScenario({ conditions: [] }))[0]?.severity).toBe("warning");
    expect(fire(auditGateOnNothing, boundScenario({ conditions: [], severity: "critical" }))[0]?.severity).toBe("error");
  });

  it("counts an early turn floor as no gate at all, and a late one as a reading", () => {
    expect(fire(auditGateOnNothing, boundScenario({ conditions: [{ kind: "turn", atLeast: 3 }] }))).toHaveLength(1);
    expect(fire(auditGateOnNothing, boundScenario({ conditions: [{ kind: "turn", atLeast: 20 }] }))).toEqual([]);
  });

  it("quotes the doctrine's own exception rather than inventing a schema field for it", () => {
    const [finding] = fire(auditGateOnNothing, boundScenario({ conditions: [] }));
    expect(finding?.message).toContain("silence is not a declaration");
  });

  it("accepts a boost as evidence somebody read the board", () => {
    const boosted = boundScenario({ conditions: [], boosts: [{ source: "warIntensity", factor: 1.5 }] });
    expect(fire(auditGateOnNothing, boosted)).toEqual([]);
  });

  it("warns on a batch whose conditions are all clock and memory", () => {
    const clockOnly = Array.from({ length: 10 }, (_, index) =>
      boundScenario({ id: `turn-only-${index}`, conditions: [{ kind: "turn", atLeast: 6 }] }),
    );
    const findings: ScenarioFinding[] = [];
    auditConditionVocabularySpread(clockOnly, findings);
    expect(findings[0]?.kind).toBe("condition-vocabulary-spread");
    expect(findings[0]?.severity).toBe("warning");

    const spread = clockOnly.map((def, index) =>
      index < 4 ? boundScenario({ id: def.id, conditions: [{ kind: "institutionState", institution: "national-police", field: "backlog", atLeast: 0.6 }] }) : def,
    );
    const after: ScenarioFinding[] = [];
    auditConditionVocabularySpread(spread, after);
    expect(after).toEqual([]);
  });

  it("warns on readiness moved by a week with no military language in it", () => {
    const culture = boundScenario({
      class: "culture",
      cast: { pick: "none" },
      transmission: undefined,
      subject: "The orchestra's pay dispute reaches the desk",
      locus: { site: "city", ground: "counterpart", descriptor: "the concert hall whose season was announced before the pay talks failed" },
      opening: [{ speaker: { kind: "narrator" }, text: "The orchestra has not been paid since the season was announced, and the hall has stopped answering the union's letters." }],
      replies: [
        {
          ...boundScenario().replies[0]!,
          commitment: {
            kind: "position",
            cost: { treasury: -60, militaryReadiness: -0.05 },
            impact: { human: { lives: "isolated", borneBy: "one-region" } },
            remembered: "The orchestra was paid out of the contingency line and the season went ahead as announced.",
            rejoinder: { speaker: { kind: "narrator" }, text: "Two other funded companies wrote the same week to say their own talks had just reopened." },
          },
        },
      ],
    });
    const [finding] = fire(auditUnmooredPrice, culture);
    expect(finding?.severity).toBe("warning");
    expect(finding?.message).toContain("forces-committed");
  });

  it("leaves readiness alone where the fiction gives it a mechanism", () => {
    const patrol = boundScenario({
      replies: [
        {
          ...boundScenario().replies[0]!,
          commitment: {
            kind: "position",
            cost: { standing: -0.05, militaryReadiness: -0.04 },
            impact: { human: { lives: "isolated", borneBy: "one-region" } },
            remembered: "A second patrol went up to the line and stayed there, and the first one did not come home on schedule.",
            rejoinder: { speaker: { kind: "narrator" }, text: "The patrol came back the following night with a second vehicle, and the duty officer photographed that too." },
          },
        },
      ],
    });
    expect(fire(auditUnmooredPrice, patrol)).toEqual([]);
  });
});
