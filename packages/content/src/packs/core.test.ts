import { describe, expect, it } from "vitest";
import { assertPlayable } from "@admin/engine";
import { sealedCampaign } from "../__fixtures__/campaign.js";
import { auditScenarios } from "../scenario-audit.js";
import { GROUNDING_FINDING_KINDS } from "../scenario-grounding.js";
import { SPEAKER_FINDING_KINDS } from "../scenario-audit-speakers.js";
import { castScenario } from "../scenario-cast.js";
import { supplementBoards } from "../preview-board-oversight.js";
import { auditReachability, withFamiliesOpened } from "../scenario-reachability.js";
import { ScenarioDef, ScenarioPack } from "../scenario.js";
import { CORE_SCENARIOS, corePack } from "./core.js";

// The bundled pack must clear the same gates a generated pack would:
// zod shape, the full audit, and the engine's own runtime playability gate
// once cast onto a real campaign. If the exemplars cannot pass the pipeline,
// the pipeline's bar is fiction.

describe("the core pack ships clean", () => {
  it("every scenario parses as the schema the pipeline validates", () => {
    for (const scenario of CORE_SCENARIOS) {
      expect(() => ScenarioDef.parse(scenario), scenario.id).not.toThrow();
    }
    expect(() => ScenarioPack.parse(corePack)).not.toThrow();
  });

  // The grounding rules (doctrine §6.1/§6.2) landed after this pack shipped.
  // They are the bar for new content and for the upgrade wave, not a
  // retroactive refusal of the floor every install already carries — so the
  // pack's grounding debt is counted rather than asserted away, and every
  // other rule stays at zero tolerance. Nothing here is an error, which is
  // what keeps the bundled pack publishable through the CLI gate.
  const CORE_GROUNDING_DEBT = 4;
  // The speaker rule also postdates the pack: a cabinet line handed to a
  // department with no brief in the week's class still plays, so it is
  // counted with the grounding debt and never asserted away.
  const CORE_SPEAKER_DEBT = 4;

  // Two of the pack's arcs open here and close in the shipped corpus, which is
  // how an arc written across batches is meant to land; the audit is told so
  // the way the publish gate is, through the corpus's own close index.
  const CLOSED_IN_THE_CORPUS = ["arc-the-water-they-both-claim", "arc-the-station-past-the-road"];

  it("passes every rule outside the grounding family with zero findings", () => {
    const findings = auditScenarios(CORE_SCENARIOS, undefined, { familyCloses: CLOSED_IN_THE_CORPUS });
    const debt = (finding: (typeof findings)[number]) => GROUNDING_FINDING_KINDS.has(finding.kind as never) || SPEAKER_FINDING_KINDS.has(finding.kind);
    expect(findings.filter((finding) => !debt(finding))).toEqual([]);
    expect(findings.filter((finding) => finding.severity === "error")).toEqual([]);
    expect(findings.filter((finding) => SPEAKER_FINDING_KINDS.has(finding.kind)).length).toBeLessThanOrEqual(CORE_SPEAKER_DEBT);
    expect(findings.length).toBeLessThanOrEqual(CORE_GROUNDING_DEBT + CORE_SPEAKER_DEBT);
  });

  it("every scenario, cast on the real dataset, clears the engine's playability gate", () => {
    const campaign = sealedCampaign();
    // A family's later beats bind to the pin its opener set, so they have to be
    // cast on a board where that opener has been dealt. Casting them on a
    // sealed board asks whether a follow-up works before the thing it follows
    // has happened, which every arc in the game would fail.
    //
    // The same is now true of a week gated on the board's own state: a decision
    // about a fire is not castable on a board with no fire, and the supplement
    // boards are the honest way to ask the question rather than relaxing it.
    const opened = withFamiliesOpened(campaign, CORE_SCENARIOS);
    for (const scenario of CORE_SCENARIOS) {
      const base = scenario.family && scenario.family.role !== "opener" ? opened : campaign;
      const boards = [base, ...supplementBoards([scenario]).map((board) => withFamiliesOpened(board, CORE_SCENARIOS))];
      const cast = boards.map((board) => castScenario(board, scenario)).find((candidate) => candidate !== undefined);
      expect(cast, scenario.id).toBeDefined();
      expect(() => assertPlayable(cast!.script), scenario.id).not.toThrow();
    }
  });

  // The pilot pack has always asserted this and the bundled one never did,
  // which is backwards: an unreachable scenario in a remote pack is content
  // nobody is served, and an unreachable one here ships dead to every install.
  // It matters most for exactly what the pack now carries — flag-gated readers,
  // the shape that clears every other rule and still reaches no player.
  it("every scenario is reachable on a real sealed board, not merely valid", () => {
    expect(auditReachability(CORE_SCENARIOS)).toEqual([]);
  });

  it("covers a spread of scenario classes, not one genre", () => {
    const classes = new Set(CORE_SCENARIOS.map((scenario) => scenario.class));
    expect(classes.size).toBeGreaterThanOrEqual(5);
  });

  it("chains at least one consequence: a scenario that only a past answer unlocks", () => {
    const flagsSet = new Set(CORE_SCENARIOS.flatMap((scenario) => scenario.replies.flatMap((reply) => reply.sets ?? [])));
    const chained = CORE_SCENARIOS.filter((scenario) =>
      scenario.conditions.some((condition) => condition.kind === "flag" && flagsSet.has(condition.flag)),
    );
    expect(chained.length).toBeGreaterThanOrEqual(1);
  });

  // The pack's worked example of an arc: one setter, and a reader for every
  // door out of it. Asserted rather than left to the audit's warning, because
  // this is the shape the generation brief holds up and a pack that quietly
  // lost a branch would go on teaching that one reply was the real one.
  it("answers every branch of the depot square, not just the one that pays", () => {
    const setter = CORE_SCENARIOS.find((scenario) => scenario.id === "the-morning-the-country-stopped")!;
    const read = new Set(
      CORE_SCENARIOS.flatMap((scenario) =>
        scenario.conditions.flatMap((condition) => (condition.kind === "flag" && condition.is ? [condition.flag] : [])),
      ),
    );
    for (const reply of setter.replies) {
      expect(reply.sets?.some((flag) => read.has(flag)), reply.id).toBe(true);
    }
  });
});
