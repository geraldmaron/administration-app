import { describe, expect, it } from "vitest";
import { auditReachability } from "./scenario-reachability.js";
import { previewBoards } from "./preview-board.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import type { ScenarioCast, ScenarioCondition, ScenarioDef } from "./scenario.js";

// The two defects this rule exists for are reproduced exactly as they were
// written, because a rule proved against an invented failure is a rule that
// might not catch the real one.

function reachableScenario(overrides: Partial<ScenarioDef> = {}): ScenarioDef {
  return {
    id: "reachability-probe",
    class: "foreign-crisis",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "A probe of what can be reached",
    cast: { pick: "tensest" },
    conditions: [],
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
          rejoinder: { speaker: { kind: "narrator" as const }, text: "The account it came out of is short now, the shortfall shows up in the spring, and the office that keeps it has already said so." },
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
          rejoinder: { speaker: { kind: "cabinet" as const, roleHint: "interior" as const }, text: "Nothing was said publicly, and the silence has been read three different ways since by people who were all in the same room." },
        },
      },
    ],
    ...overrides,
  };
}

const kindsOf = (def: ScenarioDef) => auditReachability([def]).map((finding) => finding.kind);

describe("reachability: whether a scenario ever reaches a player", () => {
  it("passes a scenario with no conditions at all", () => {
    expect(auditReachability([reachableScenario()])).toEqual([]);
  });

  it("passes every scenario in the shipped core pack", () => {
    expect(auditReachability(FIXTURE_SCENARIOS)).toEqual([]);
  });

  // The first defect, verbatim: treasury is absolute (a founding board holds
  // tens of thousands of it), so a bound written on the nought-to-one scale
  // every other metric uses can never be true.
  it("catches a treasury bound written on the wrong scale", () => {
    const conditions: ScenarioCondition[] = [{ kind: "metric", metric: "treasury", atMost: 0.55 }];
    expect(kindsOf(reachableScenario({ conditions }))).toContain("unreachable-scenario");
  });

  // The bound has to sit between what a healthy board holds and what a strained
  // one does, or it is testing nothing. Both figures move with the size of the
  // economy being governed, which is why an absolute bound like this one is the
  // fragile kind of authoring the rule above exists to catch.
  it("passes the same condition written on treasury's actual scale", () => {
    const conditions: ScenarioCondition[] = [{ kind: "metric", metric: "treasury", atMost: 2_000_000 }];
    expect(kindsOf(reachableScenario({ conditions }))).toEqual([]);
  });

  // The second defect, verbatim: the band pick is resolved before the bound is
  // read and is not chosen to satisfy it, so asking for a trading hub the
  // player depends on gets whichever trading hub the band names — and that one
  // carries no trade dependence with the player at all.
  it("catches a band cast whose relationship bound the band pick never satisfies", () => {
    const cast: ScenarioCast = { pick: "band", archetype: "trading-hub" };
    const conditions: ScenarioCondition[] = [{ kind: "relationship", field: "tradeDependence", atLeast: 0.25 }];
    expect(kindsOf(reachableScenario({ cast, conditions }))).toContain("unreachable-scenario");
  });

  it("passes the same band cast once the bound it could never meet comes off", () => {
    const cast: ScenarioCast = { pick: "band", archetype: "trading-hub" };
    expect(kindsOf(reachableScenario({ cast }))).toEqual([]);
  });

  it("catches a band no nation in the dataset matches", () => {
    const cast: ScenarioCast = { pick: "band", archetype: "microstate", powerTier: 5 };
    expect(kindsOf(reachableScenario({ cast }))).toContain("unreachable-scenario");
  });

  // Pressure-gated content is correct content. Before the strained board
  // existed it was indistinguishable from dead content, which is the failure
  // mode that makes a reachability rule dangerous rather than useful.
  it("passes content that is only true of a government in trouble", () => {
    const conditions: ScenarioCondition[] = [{ kind: "removalPressure", atLeast: 0.2 }];
    expect(kindsOf(reachableScenario({ cast: { pick: "none" }, conditions }))).toEqual([]);
  });

  it("passes content gated on a low stability a healthy board never has", () => {
    const conditions: ScenarioCondition[] = [{ kind: "metric", metric: "stability", atMost: 0.5 }];
    expect(kindsOf(reachableScenario({ cast: { pick: "none" }, conditions }))).toEqual([]);
  });

  // A follow-up waits on a deed no fresh campaign has done. Judged alone it is
  // unreachable; judged as part of the batch that stamps the flag, it is not.
  it("passes a follow-up when the batch it arrives with stamps the flag it waits on", () => {
    const conditions: ScenarioCondition[] = [{ kind: "flag", flag: "the-deed-was-done", is: true }];
    const followUp = reachableScenario({ id: "the-follow-up", cast: { pick: "none" }, conditions });
    expect(auditReachability([followUp])).toEqual([]);
  });

  it("takes boards from the caller when it is given them", () => {
    const conditions: ScenarioCondition[] = [{ kind: "turn", atLeast: 40 }];
    const late = reachableScenario({ conditions });
    expect(kindsOf(late)).toContain("unreachable-scenario");
    const deepBoards = previewBoards().map((campaign) => ({ ...campaign, turn: 41 }));
    expect(auditReachability([late], deepBoards)).toEqual([]);
  });
});

describe("a family member written alone", () => {
  const close = reachableScenario({ id: "reachability-close", family: { id: "arc-elsewhere", role: "close" } });
  const opener = reachableScenario({ id: "reachability-opener", family: { id: "arc-elsewhere", role: "opener" } });

  it("is reachable without its opener in the batch, against the installed one", () => {
    expect(auditReachability([close])).toEqual([]);
  });

  it("is reachable when the opener ships with it", () => {
    expect(auditReachability([opener, close])).toEqual([]);
  });
});
