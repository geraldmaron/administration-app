import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CORE_CONSEQUENCES, FIXTURE_SCENARIOS, type ConsequenceDef, type ScenarioDef } from "@admin/content";
import { corpusPathsFor, publishToCorpus } from "./shard-store.js";
import { consequencePathsFor, publishConsequences } from "./consequence-store.js";
import { harnessCorpus } from "./harness-corpus.js";
import { validateScenarioDocument } from "../scenarios/validate.js";
import { SCENARIO_REVIEW } from "../scenarios/review.js";
import { validateConsequenceDocument } from "../consequences/validate.js";

// Chain closure runs across the two content types, so the vocabulary has to
// travel both ways. Each test here fails the same batch when the plumbing is
// cut in one direction, which is the only way to tell a real handoff from a
// gate that happened not to look.

const SET_BY_CONSEQUENCE = "burned-the-network";
const SET_BY_SCENARIO = "signed-the-quiet-annex";

let root: string | undefined;
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

async function stage(): Promise<string> {
  root = await mkdtemp(path.join(tmpdir(), "harness-corpus-"));
  return root;
}

const scenarioSetting = (flag: string): ScenarioDef => ({
  ...FIXTURE_SCENARIOS[0]!,
  id: "scn-sets-a-flag",
  replies: FIXTURE_SCENARIOS[0]!.replies.map((reply, index) => (index === 0 ? { ...reply, sets: [flag] } : reply)),
});

const cardSetting = (flag: string): ConsequenceDef => ({ ...CORE_CONSEQUENCES[0]!, id: "cq-sets-a-flag", sets: [flag] });

const scenarioWaiting = (flag: string): ScenarioDef => ({
  ...FIXTURE_SCENARIOS[1]!,
  id: "scn-waits-on-a-flag",
  conditions: [...FIXTURE_SCENARIOS[1]!.conditions, { kind: "flag", flag, is: true }],
});

const cardWaiting = (flag: string): ConsequenceDef => ({
  ...CORE_CONSEQUENCES[0]!,
  id: "cq-waits-on-a-flag",
  conditions: { flagsSet: [flag] },
});

describe("the flag vocabulary the two corpora hand each other", () => {
  it("carries the consequence corpus's flags into the scenario gate", async () => {
    const corpusRoot = await stage();
    await publishConsequences(consequencePathsFor(corpusRoot), [cardSetting(SET_BY_CONSEQUENCE)]);
    const corpus = await harnessCorpus(corpusRoot);
    expect(corpus.scenarioFlags).toContain(SET_BY_CONSEQUENCE);

    const batch = [scenarioWaiting(SET_BY_CONSEQUENCE)];
    // Without the handoff the scenario reads as unreachable and is refused.
    expect(validateScenarioDocument("a.json", batch).findings.some((f) => f.kind === "flag-condition-never-set")).toBe(true);
    expect(
      validateScenarioDocument("a.json", batch, corpus.scenarios, corpus.scenarioFlags).findings.some(
        (f) => f.kind === "flag-condition-never-set",
      ),
    ).toBe(false);
  });

  it("carries the scenario corpus's reply flags into the consequence gate", async () => {
    const corpusRoot = await stage();
    await publishToCorpus(corpusPathsFor(corpusRoot), [scenarioSetting(SET_BY_SCENARIO)]);
    const corpus = await harnessCorpus(corpusRoot);
    expect(corpus.consequenceFlags).toContain(SET_BY_SCENARIO);

    const batch = [cardWaiting(SET_BY_SCENARIO)];
    expect(validateConsequenceDocument("a.json", batch).findings.some((f) => f.kind === "consequence-flag-never-set")).toBe(true);
    expect(
      validateConsequenceDocument("a.json", batch, corpus.consequenceFlags, corpus.consequences).findings.some(
        (f) => f.kind === "consequence-flag-never-set",
      ),
    ).toBe(false);
  });

  // The delayed callback the whole `agedAtLeast` idea exists for: a scenario
  // waiting on a flag an earlier *scenario* stamped. The cross-corpus handoffs
  // above were wired from the start and this same-corpus one was not, so every
  // scenario-to-scenario chain that spanned two batches was refused as
  // unreachable — which is why the corpus writes flags in the hundreds and
  // reads them in single figures.
  it("carries the scenario corpus's own reply flags back into the scenario gate", async () => {
    const corpusRoot = await stage();
    await publishToCorpus(corpusPathsFor(corpusRoot), [scenarioSetting(SET_BY_SCENARIO)]);
    const corpus = await harnessCorpus(corpusRoot);
    expect(corpus.scenarioFlags).toContain(SET_BY_SCENARIO);

    const batch = [scenarioWaiting(SET_BY_SCENARIO)];
    // Judged alone the reader is unreachable; judged against the corpus that
    // already stamps the flag, it is a callback.
    expect(validateScenarioDocument("a.json", batch).findings.some((f) => f.kind === "flag-condition-never-set")).toBe(true);
    expect(
      validateScenarioDocument("a.json", batch, corpus.scenarios, corpus.scenarioFlags).findings.some(
        (f) => f.kind === "flag-condition-never-set",
      ),
    ).toBe(false);
  });

  it("still refuses a flag neither corpus writes", async () => {
    const corpusRoot = await stage();
    await publishConsequences(consequencePathsFor(corpusRoot), [cardSetting(SET_BY_CONSEQUENCE)]);
    await publishToCorpus(corpusPathsFor(corpusRoot), [scenarioSetting(SET_BY_SCENARIO)]);
    const corpus = await harnessCorpus(corpusRoot);

    expect(
      validateScenarioDocument("a.json", [scenarioWaiting("nobody-writes-this")], corpus.scenarios, corpus.scenarioFlags).ok,
    ).toBe(false);
    expect(
      validateConsequenceDocument("a.json", [cardWaiting("nobody-writes-this")], corpus.consequenceFlags, corpus.consequences).ok,
    ).toBe(false);
  });

  it("reads an empty corpus without inventing a vocabulary", async () => {
    const corpus = await harnessCorpus(await stage());
    expect([...(corpus.consequences.installed ?? [])]).toEqual([]);
    expect(corpus.scenarioFlags).not.toContain(SET_BY_CONSEQUENCE);
  });
});

describe("the consequence corpus store", () => {
  it("shards by instrument, indexes beside the bodies, and is idempotent", async () => {
    const paths = consequencePathsFor(await stage());
    const first = await publishConsequences(paths, CORE_CONSEQUENCES);
    expect(first.added).toHaveLength(CORE_CONSEQUENCES.length);
    expect(first.stats.shards).toBe(new Set(CORE_CONSEQUENCES.map((def) => def.instrument)).size);

    const again = await publishConsequences(paths, CORE_CONSEQUENCES);
    expect(again.added).toEqual([]);
    expect(again.stats.consequences).toBe(CORE_CONSEQUENCES.length);
  });
});

// The review path is the third place the vocabulary has to reach, and the one
// where losing it costs the most. The scaffold's triage reads the gate's
// findings to decide which items a human must read, so a gate without the
// corpus marks every legitimate cross-batch callback as flagged — pushing a
// reviewer to reject exactly the content the brief asks for — and the regate
// at finish refuses the publish outright.
describe("the review gate reads the corpus the batch is joining", () => {
  it("stops calling a scenario that answers a shipped deed unreachable", async () => {
    const corpusRoot = await stage();
    await publishToCorpus(corpusPathsFor(corpusRoot), [scenarioSetting(SET_BY_SCENARIO)]);
    const corpus = await harnessCorpus(corpusRoot);
    const defs = [scenarioWaiting(SET_BY_SCENARIO)];

    const orphaned = (result: { findings: readonly { message: string }[] }) =>
      result.findings.some((finding) => finding.message.includes(`waits on the flag "${SET_BY_SCENARIO}"`));

    expect(orphaned(SCENARIO_REVIEW.gate("a.json", defs))).toBe(true);
    expect(orphaned(SCENARIO_REVIEW.gate("a.json", defs, corpus))).toBe(false);
  });
});
