import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ConsequenceInstrument, ConsequenceRungBand, ConsequenceValence, FIXTURE_SCENARIOS, memoryPool, type ScenarioDef } from "@admin/content";
import { existsSync } from "node:fs";
import { cmdRun, main, parseCell, parseConsequenceCell, validatorFor } from "./cli.js";
import { spendAuthorizationFrom } from "./jobs/spend-authorization.js";
import { corpusPathsFor, publishToCorpus, readCorpusBodies, writeCorpusManifest } from "./corpus/shard-store.js";
import { harnessCorpus } from "./corpus/harness-corpus.js";
import type { JobFile } from "./jobs/job-file.js";

const BORDER_READING = FIXTURE_SCENARIOS.find((s) => s.id === "fixture-the-border-reading")!;

/**
 * The fixture as a fresh draft: topics, and the mechanism sentence the binding
 * contract asks of every priced metric (scenarios/binding.ts). The fixture is
 * shipped-corpus-shaped and predates both, and these cases are about the spend
 * gate rather than about content.
 */
const VALID_SCENARIO = {
  ...BORDER_READING,
  topics: ["diplomacy"],
  binding: {
    mechanisms: [
      { reply: "answer-the-paper-with-paper", metric: "standing", because: "answering their note in writing concedes the reading was theirs to take" },
      { reply: "answer-the-paper-with-paper", metric: "treasury", because: "the haulage backlog is paid off the books rather than by reopening the crossing" },
    ],
  },
};

const job: JobFile = {
  id: "openrouter-job",
  kind: "scenario-batch",
  driver: "openrouter",
  items: [{ id: "item-1", payload: { prompt: "go" } }],
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "studio-cli-run-"));
  await writeFile(path.join(dir, `${job.id}.json`), JSON.stringify(job), "utf8");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const generates = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content: JSON.stringify([VALID_SCENARIO]) } }] }),
});

const neverCalled = async () => {
  throw new Error("should never be called — the spend gate refused");
};

/** The journal lines that are item results, which is what the progress readers care about. */
async function progressLines(jobId: string): Promise<Record<string, unknown>[]> {
  const raw = await readFile(path.join(dir, `${jobId}.progress.jsonl`), "utf8");
  return raw.trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("cmdRun — openrouter spend gate", () => {
  it("refuses to run without OPENROUTER_API_KEY", async () => {
    await expect(
      cmdRun(job.id, { jobsDir: dir, ledgerDir: dir, env: {} }),
    ).rejects.toThrow(/OPENROUTER_API_KEY/);
  });

  it("aborts and spends nothing when the typed confirmation does not match the job id", async () => {
    const code = await cmdRun(job.id, {
      jobsDir: dir,
      ledgerDir: dir,
      env: { OPENROUTER_API_KEY: "test-key" },
      interactive: true,
      readLine: async () => "not-the-job-id",
      fetchImpl: neverCalled,
    });

    expect(code).toBe(1);
    await expect(readFile(path.join(dir, `${job.id}.progress.jsonl`), "utf8")).rejects.toThrow();
  });

  it("runs the job once the operator types the job id back", async () => {
    const code = await cmdRun(job.id, {
      jobsDir: dir,
      ledgerDir: dir,
      env: { OPENROUTER_API_KEY: "test-key" },
      interactive: true,
      readLine: async () => job.id,
      fetchImpl: generates,
    });

    expect(code).toBe(0);
    const progress = await progressLines(job.id);
    expect(progress).toHaveLength(1);
    expect(progress[0]!.status).toBe("done");
  });

  it("honors OPENROUTER_STAGE_MODELS for per-stage selection", async () => {
    const stagedJob: JobFile = { ...job, id: "staged-job", items: [{ id: "item-1", payload: { prompt: "go" }, stage: "draft" }] };
    await writeFile(path.join(dir, `${stagedJob.id}.json`), JSON.stringify(stagedJob), "utf8");

    let usedModel = "";
    const fetchImpl = async (_url: string, init: RequestInit) => {
      usedModel = JSON.parse(init.body as string).model;
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify([VALID_SCENARIO]) } }] }) };
    };
    await cmdRun(stagedJob.id, {
      jobsDir: dir,
      ledgerDir: dir,
      env: { OPENROUTER_API_KEY: "test-key", OPENROUTER_STAGE_MODELS: JSON.stringify({ draft: "model-draft" }) },
      interactive: true,
      readLine: async () => stagedJob.id,
      fetchImpl,
    });

    expect(usedModel).toBe("model-draft");
  });
});

// The unattended lane. A cron entry or a scheduled agent has no terminal, so
// the typed confirmation it would otherwise face is not a gate but a hang —
// and the pre-authorization that replaces it has to say who approved this
// exact job, before the first request rather than after it.
describe("cmdRun — unattended spend pre-authorization", () => {
  const env = { OPENROUTER_API_KEY: "test-key" };
  const refuseToPrompt = async (): Promise<string> => {
    throw new Error("an unattended run must never reach a prompt");
  };

  it("runs unattended under a recorded pre-authorization, journaled before the first request", async () => {
    const code = await cmdRun(job.id, {
      jobsDir: dir,
      ledgerDir: dir,
      env,
      interactive: false,
      readLine: refuseToPrompt,
      fetchImpl: generates,
      authorization: { jobId: job.id, authorizedBy: "Gerald Dagher" },
    });

    expect(code).toBe(0);
    const [authorization, result] = await progressLines(job.id);
    expect(authorization).toMatchObject({
      kind: "spend-authorization",
      jobId: job.id,
      authorizedBy: "Gerald Dagher",
    });
    expect(typeof authorization!.at).toBe("string");
    expect(authorization!.estimatedSpendUsd).toBeGreaterThan(0);
    expect(result!.status).toBe("done");
  });

  // The whole point of recording it: cron re-invokes the same resumable job
  // without re-authorizing, and the second run is covered by the first's
  // permission rather than by nothing at all.
  it("resumes a second unattended invocation on the authorization already in the journal", async () => {
    const twoItem: JobFile = {
      ...job,
      id: "resumable-job",
      items: [{ id: "item-1", payload: { prompt: "go" } }, { id: "item-2", payload: { prompt: "go" } }],
    };
    await writeFile(path.join(dir, `${twoItem.id}.json`), JSON.stringify(twoItem), "utf8");

    let calls = 0;
    const oneThenFail = async () => {
      calls += 1;
      if (calls > 1) throw new Error("network died mid-batch");
      return await generates();
    };
    await cmdRun(twoItem.id, {
      jobsDir: dir,
      ledgerDir: dir,
      env,
      interactive: false,
      readLine: refuseToPrompt,
      fetchImpl: oneThenFail,
      authorization: { jobId: twoItem.id, authorizedBy: "Gerald Dagher" },
    });

    const code = await cmdRun(twoItem.id, {
      jobsDir: dir,
      ledgerDir: dir,
      env,
      interactive: false,
      readLine: refuseToPrompt,
      fetchImpl: generates,
    });

    expect(code).toBe(0);
    const lines = await progressLines(twoItem.id);
    expect(lines.filter((line) => line.kind === "spend-authorization")).toHaveLength(1);
    expect(lines.filter((line) => line.status === "done").map((line) => line.itemId)).toContain("item-2");
  });

  it("refuses and spends nothing when the pre-authorization names a different job", async () => {
    const code = await cmdRun(job.id, {
      jobsDir: dir,
      ledgerDir: dir,
      env,
      interactive: false,
      readLine: refuseToPrompt,
      fetchImpl: neverCalled,
      authorization: { jobId: "some-other-job", authorizedBy: "Gerald Dagher" },
    });

    expect(code).toBe(1);
    await expect(readFile(path.join(dir, `${job.id}.progress.jsonl`), "utf8")).rejects.toThrow();
  });

  it("refuses an unattended run that carries no authorization, and names the flag", async () => {
    const printed: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => printed.push(args.join(" "));
    try {
      const code = await cmdRun(job.id, {
        jobsDir: dir,
        ledgerDir: dir,
        env,
        interactive: false,
        readLine: refuseToPrompt,
        fetchImpl: neverCalled,
      });
      expect(code).toBe(1);
    } finally {
      console.log = original;
    }

    expect(printed.join("\n")).toContain("--authorize-spend");
    await expect(readFile(path.join(dir, `${job.id}.progress.jsonl`), "utf8")).rejects.toThrow();
  });

  // The billed image path is gated identically, because it is the same money.
  it("refuses an unattended image run with no authorization, before the driver is built", async () => {
    const imageJob: JobFile = { ...job, id: "image-job", kind: "scene-batch", driver: "image" };
    await writeFile(path.join(dir, `${imageJob.id}.json`), JSON.stringify(imageJob), "utf8");

    const code = await cmdRun(imageJob.id, {
      jobsDir: dir,
      ledgerDir: dir,
      env: { OPENROUTER_API_KEY: "test-key", IMAGE_MODEL: "some/image-model" },
      interactive: false,
      readLine: refuseToPrompt,
      fetchImpl: neverCalled,
    });

    expect(code).toBe(1);
    await expect(readFile(path.join(dir, `${imageJob.id}.progress.jsonl`), "utf8")).rejects.toThrow();
  });

  it("reads the flag off the argv and refuses when no name can be resolved", () => {
    expect(spendAuthorizationFrom(["a-job", "--authorize-spend", "a-job", "--as", "Gerald Dagher"], () => undefined)).toEqual({
      jobId: "a-job",
      authorizedBy: "Gerald Dagher",
    });
    expect(spendAuthorizationFrom(["a-job"], () => "Gerald Dagher")).toBeUndefined();
    expect(spendAuthorizationFrom(["a-job", "--authorize-spend", "--as", "x"], () => "Gerald Dagher")).toEqual({
      error: expect.stringContaining("--authorize-spend needs the job id"),
    });
    expect(spendAuthorizationFrom(["a-job", "--authorize-spend", "a-job"], () => undefined)).toEqual({
      error: expect.stringContaining("--as"),
    });
  });
});

describe("corpus publish and the provisional flag", () => {
  it("refuses a batch whose reviewer was its own author", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-provisional-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await mkdir(path.join("content", "reviews", "selfreviewed"), { recursive: true });
      await writeFile(
        path.join("content", "reviews", "selfreviewed", "shipped.json"),
        JSON.stringify({ runId: "selfreviewed", reviewer: "me", provisional: true, scenarios: [] }),
        "utf8",
      );
      expect(await main(["corpus", "publish", "selfreviewed"])).toBe(1);
      // The corpus every later batch is judged against must not be set by
      // prose nobody but its author has read.
      expect(existsSync(path.join("content", "corpus", "index.jsonl"))).toBe(false);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("publishes a provisional batch when the override is typed", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-override-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await mkdir(path.join("content", "reviews", "selfreviewed"), { recursive: true });
      await writeFile(
        path.join("content", "reviews", "selfreviewed", "shipped.json"),
        JSON.stringify({ runId: "selfreviewed", reviewer: "me", provisional: true, scenarios: [] }),
        "utf8",
      );
      expect(await main(["corpus", "publish", "selfreviewed", "--allow-provisional"])).toBe(0);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  // The aftermath pool is judged against exactly as the scenario pool is, so
  // an unread batch setting its standard is the same failure. Sharing one
  // implementation of the refusal is what keeps that true; this is the test
  // that says so out loud for the second corpus.
  it("refuses a self-reviewed consequence batch, and takes the same typed override", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "consequence-provisional-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await mkdir(path.join("content", "reviews", "selfreviewed"), { recursive: true });
      await writeFile(
        path.join("content", "reviews", "selfreviewed", "shipped.json"),
        JSON.stringify({ runId: "selfreviewed", reviewer: "me", provisional: true, consequences: [] }),
        "utf8",
      );
      expect(await main(["corpus", "consequences", "publish", "selfreviewed"])).toBe(1);
      expect(existsSync(path.join("content", "corpus", "consequences", "index.jsonl"))).toBe(false);
      expect(await main(["corpus", "consequences", "publish", "selfreviewed", "--allow-provisional"])).toBe(0);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });
});

// Step 0.5 of the retime harness: `upgrade-publish` used to parse only
// `scenarios` off `shipped.json`, dropping `provisional`, and never called the
// independence guard `corpus publish` does — so a self-reviewed upgrade batch
// reached the corpus with no check at all. This is the same fixture and the
// same assertions as "corpus publish and the provisional flag" above, run
// through `scenarios upgrade-publish` instead, to prove the two paths now
// agree.
describe("upgrade-publish and the provisional flag", () => {
  it("refuses a batch whose reviewer was its own author", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "upgrade-publish-provisional-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [BORDER_READING]);
      await mkdir(path.join("content", "reviews", "selfreviewed"), { recursive: true });
      await writeFile(
        path.join("content", "reviews", "selfreviewed", "shipped.json"),
        JSON.stringify({ runId: "selfreviewed", reviewer: "me", provisional: true, scenarios: [BORDER_READING] }),
        "utf8",
      );
      expect(await main(["scenarios", "upgrade-publish", "selfreviewed"])).toBe(1);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("publishes a provisional batch when the override is typed, and revises the corpus in place", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "upgrade-publish-override-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [BORDER_READING]);
      const revised = { ...BORDER_READING, subject: `${BORDER_READING.subject}` };
      await mkdir(path.join("content", "reviews", "selfreviewed"), { recursive: true });
      await writeFile(
        path.join("content", "reviews", "selfreviewed", "shipped.json"),
        JSON.stringify({ runId: "selfreviewed", reviewer: "me", provisional: true, scenarios: [revised] }),
        "utf8",
      );
      expect(await main(["scenarios", "upgrade-publish", "selfreviewed", "--allow-provisional"])).toBe(0);
      const bodies = await readCorpusBodies(corpusPathsFor(path.join(root, "content", "corpus")));
      expect(bodies.map((body) => body.id)).toContain(BORDER_READING.id);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accepts an owner authorization on shipped.json the same way corpus publish does", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "upgrade-publish-authorized-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [BORDER_READING]);
      await mkdir(path.join("content", "reviews", "authorized"), { recursive: true });
      await writeFile(
        path.join("content", "reviews", "authorized", "shipped.json"),
        JSON.stringify({
          runId: "authorized",
          reviewer: "me",
          provisional: true,
          ownerAuthorization: { authorizedBy: "Gerald Dagher", reason: "the pool needs a floor before it can be judged at all", at: new Date().toISOString() },
          scenarios: [BORDER_READING],
        }),
        "utf8",
      );
      expect(await main(["scenarios", "upgrade-publish", "authorized"])).toBe(0);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not refuse a batch that was never marked provisional", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "upgrade-publish-clean-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [BORDER_READING]);
      await mkdir(path.join("content", "reviews", "clean"), { recursive: true });
      await writeFile(
        path.join("content", "reviews", "clean", "shipped.json"),
        JSON.stringify({ runId: "clean", reviewer: "someone-else", provisional: false, scenarios: [BORDER_READING] }),
        "utf8",
      );
      expect(await main(["scenarios", "upgrade-publish", "clean"])).toBe(0);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });
});

// A batch that reads a flag nothing anywhere sets — the same shape as the
// defect found by running the audit over the whole 53-scenario
// corpus at once: it never fires, and the per-batch gate cannot see it
// because the flag's absence is only true across the whole pool. The flag
// name is fixture-only, chosen not to collide with anything the bundled core
// pack (and therefore CORE_FLAG_VOCABULARY) already sets.
const READS_AN_UNSET_FLAG: ScenarioDef = {
  id: "fixture-reads-a-flag-nobody-sets",
  class: "economy",
  severity: "routine",
  dilemmaShape: "containment",
  subject: "A promise nobody remembers making",
  cast: { pick: "none" },
  locus: { site: "capital", ground: "home", descriptor: "the finance ministry room where an old promise is read back" },
  conditions: [{ kind: "flag", flag: "fixture-reads-a-flag-truly-nobody-ever-sets", is: true }],
  weight: 1,
  opening: [
    {
      speaker: { kind: "cabinet", roleHint: "finance" },
      text: "The old promise is being called in, and paying it costs the government room it does not have this year.",
    },
  ],
  replies: [
    {
      id: "pay-it",
      tone: "principled",
      text: "Pay it in full, today, and take the hit to the year's budget without complaint.",
      commitment: {
        kind: "position",
        cost: { treasury: -120, standing: 0.05 },
        remembered: "The old promise was paid in full, quietly, at real cost to the year.",
        rejoinder: {
          speaker: { kind: "cabinet" as const, roleHint: "finance" as const },
          text: "It cleared this morning. Two other offices with promises of the same age have written since lunch.",
        },
      },
    },
    {
      id: "stall-it",
      tone: "evasive",
      text: "Stall it another quarter and hope nobody outside the room notices the delay.",
      commitment: {
        kind: "position",
        cost: { treasury: -20, stability: -0.05 },
        remembered: "The promise was stalled another quarter, and the room noticed even if no one outside it did.",
        rejoinder: {
          speaker: { kind: "narrator" as const },
          text: "The quarter turned and nobody outside asked once, which is its own kind of answer to have earned.",
        },
      },
    },
  ],
};

// Cloned wholesale from a fixture already in the corpus, so the near-duplicate
// index has to find it — the cheapest reliable way to make the union audit
// surface a warning without also surfacing an error.
const NEAR_DUPLICATE_OF_A_FIXTURE: ScenarioDef = {
  ...FIXTURE_SCENARIOS.find((s) => s.id === "fixture-the-border-reading")!,
  id: "fixture-the-border-reading-again",
};

async function stageCorpus(root: string, defs: readonly ScenarioDef[]): Promise<void> {
  const paths = corpusPathsFor(path.join(root, "content", "corpus"));
  await publishToCorpus(paths, defs);
  await writeCorpusManifest(paths);
}

async function stageShippedBatch(jobId: string, defs: readonly ScenarioDef[]): Promise<void> {
  await mkdir(path.join("content", "reviews", jobId), { recursive: true });
  await writeFile(
    path.join("content", "reviews", jobId, "shipped.json"),
    JSON.stringify({ runId: jobId, reviewer: "someone-else", provisional: false, scenarios: defs }),
    "utf8",
  );
}

describe("corpus publish — the corpus-wide audit pass", () => {
  it("refuses a publish whose batch introduces a union-level error", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-union-error-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, FIXTURE_SCENARIOS);
      await stageShippedBatch("introduces-dead-flag", [READS_AN_UNSET_FLAG]);

      const code = await main(["corpus", "publish", "introduces-dead-flag"]);

      expect(code).toBe(1);
      // Refused before a single line was written — the corpus stays exactly
      // what it was before this batch was offered to it.
      const index = await readFile(path.join("content", "corpus", "index.jsonl"), "utf8");
      expect(index).not.toContain(READS_AN_UNSET_FLAG.id);
      expect(index.trim().split("\n")).toHaveLength(FIXTURE_SCENARIOS.length);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("publishes a clean batch over a corpus that already carries an error, and reports it without blocking", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-pre-existing-error-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      // The published corpus already carries a scenario waiting on a flag
      // nothing in it ever sets — deliberately, to prove an old defect does
      // not hold a new, unrelated batch hostage.
      const preExistingBug = FIXTURE_SCENARIOS.find((s) => s.id === "fixture-the-bill-for-the-guarantee")!;
      await stageCorpus(root, [preExistingBug]);
      const cleanBatch = FIXTURE_SCENARIOS.find((s) => s.id === "fixture-the-border-reading")!;
      await stageShippedBatch("clean-batch", [cleanBatch]);

      const code = await main(["corpus", "publish", "clean-batch"]);

      expect(code).toBe(0);
      expect(existsSync(path.join("content", "corpus", "index.jsonl"))).toBe(true);
      const index = await readFile(path.join("content", "corpus", "index.jsonl"), "utf8");
      expect(index).toContain(cleanBatch.id);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block on a warning-only finding", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-warning-only-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, FIXTURE_SCENARIOS);
      await stageShippedBatch("near-duplicate", [NEAR_DUPLICATE_OF_A_FIXTURE]);

      const code = await main(["corpus", "publish", "near-duplicate"]);

      expect(code).toBe(0);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("cell parsing", () => {
  it("reads class, cast, count and a steer that may contain colons", () => {
    expect(parseCell("espionage:tensest:3:a defector: with a suitcase")).toEqual({
      class: "espionage",
      severity: "serious",
      cast: "tensest",
      count: 3,
      steer: "a defector: with a suitcase",
    });
  });

  it("takes the war casts, which are what a front-week cell has to ask for", () => {
    expect(parseCell("war:warCounterpart:serious:2")).toMatchObject({ cast: "warCounterpart", count: 2 });
    expect(parseCell("war:belligerent:serious:2")).toMatchObject({ cast: "belligerent", count: 2 });
    expect(parseCell("institution:liveBill:serious:1")).toMatchObject({ cast: "liveBill", count: 1 });
    expect(parseCell("institution:judicialVacancy:serious:1")).toMatchObject({ cast: "judicialVacancy", count: 1 });
    expect(parseCell("institution:pendingOrderCase:serious:1")).toMatchObject({ cast: "pendingOrderCase", count: 1 });
  });

  it("reads a severity segment between cast and count", () => {
    expect(parseCell("economy:none:routine:4")).toEqual({
      class: "economy",
      severity: "routine",
      cast: "none",
      count: 4,
    });
    expect(parseCell("war:tensest:critical:1:the second front")).toEqual({
      class: "war",
      severity: "critical",
      cast: "tensest",
      count: 1,
      steer: "the second front",
    });
  });

  // Jobs written before the dial existed go straight from cast to count, and
  // every scenario then effectively was a serious one.
  it("defaults a cell with no severity segment to serious", () => {
    expect(parseCell("scandal:none:2").severity).toBe("serious");
  });

  it("takes a per-cell director off the class token", () => {
    expect(parseCell("scandal/the-embed:none:2").persona).toBe("the-embed");
    expect(parseCell("scandal:none:2").persona).toBeUndefined();
  });

  it("refuses a director that does not exist rather than generating flat", () => {
    expect(() => parseCell("scandal/the-auteur:none:2")).toThrow();
  });

  it("reads an arc prefix as one chain rather than N siblings", () => {
    expect(parseCell("arc:scandal:none:serious:3")).toEqual({
      class: "scandal",
      severity: "serious",
      cast: "none",
      count: 3,
      arc: true,
    });
  });

  it("leaves every other segment working under the arc prefix", () => {
    expect(parseCell("arc:economy/the-room:tensest:routine:3:the shipyard loan")).toEqual({
      class: "economy",
      severity: "routine",
      cast: "tensest",
      count: 3,
      arc: true,
      persona: "the-room",
      steer: "the shipyard loan",
    });
  });

  it("leaves an ordinary cell unmarked", () => {
    expect(parseCell("scandal:none:2").arc).toBeUndefined();
  });

  // The count is the arc's arithmetic: a setter with count-1 replies and one
  // reader per reply. Two would ask for a one-reply setter, which the schema
  // refuses anyway — a decision with one option is not a decision.
  it("refuses an arc too small to give every door somewhere to go", () => {
    expect(() => parseCell("arc:scandal:none:serious:1")).toThrow(/at least 3/);
    expect(() => parseCell("arc:scandal:none:serious:2")).toThrow(/at least 3/);
    expect(parseCell("arc:scandal:none:serious:3").count).toBe(3);
  });
});

// The production dashboard. It is the one command a writer runs before deciding
// what to spend a week on, so what it prints is part of the contract.
describe("studio consequences coverage", () => {
  const lines: string[] = [];
  const original = console.log;

  beforeEach(() => {
    lines.length = 0;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
  });
  afterEach(() => {
    console.log = original;
  });

  it("prints every cell of the matrix with its depth", async () => {
    expect(await main(["consequences", "coverage"])).toBe(0);
    const output = lines.join("\n");
    expect(output).toContain("45 cells");
    for (const instrument of ConsequenceInstrument.options) expect(output).toContain(instrument);
    for (const band of ConsequenceRungBand.options) expect(output).toContain(band);
    for (const valence of ConsequenceValence.options) expect(output).toContain(valence);
    expect(output).toContain("0 empty");
    expect(output).toContain("0 with no unconditioned floor card");
  });

  it("parses a consequence cell, director and steer included", () => {
    expect(parseConsequenceCell("covert/the-room:high:failure:2:a method seen twice")).toEqual({
      instrument: "covert",
      band: "high",
      valence: "failure",
      count: 2,
      steer: "a method seen twice",
      persona: "the-room",
    });
    expect(() => parseConsequenceCell("covert:high:failure:0")).toThrow(/bad count/);
  });
});

// The session driver's own check runs before the runner's gate and decides
// whether an item is journaled at all, so a vocabulary the gate has and this
// check does not is not a lenience — it is a false rejection the gate never
// gets the chance to overturn. That gap made the brief's "answer an older
// batch's deed" rule unsatisfiable on the session driver.
describe("the validator handed to the session driver", () => {
  const waitingOnAShippedDeed = (flag: string): ScenarioDef => ({
    ...FIXTURE_SCENARIOS[1]!,
    id: "scn-answers-an-older-batch",
    conditions: [...FIXTURE_SCENARIOS[1]!.conditions, { kind: "flag", flag, is: true }],
  });

  it("reads the corpus flag vocabulary, so a scenario may answer a shipped deed", async () => {
    const corpusRoot = await mkdtemp(path.join(tmpdir(), "session-validator-"));
    try {
      const setter = FIXTURE_SCENARIOS[0]!;
      const deed = "signed-the-quiet-annex";
      await publishToCorpus(corpusPathsFor(corpusRoot), [
        { ...setter, id: "scn-stamps-the-deed", replies: setter.replies.map((r, i) => (i === 0 ? { ...r, sets: [deed] } : r)) },
      ]);
      const corpus = await harnessCorpus(corpusRoot);
      const batch = [waitingOnAShippedDeed(deed)];

      // Matched on the message because the validator's declared finding type
      // does not surface `kind`, and widening it for a test would be the tail
      // wagging the dog.
      const orphaned = (validation: { findings: readonly { readonly message: string }[] }) =>
        validation.findings.some((f) => f.message.includes(`waits on the flag "${deed}"`));

      // Without the corpus this check refuses the batch outright.
      expect(orphaned(validatorFor("scenario-batch")("a.json", batch))).toBe(true);
      expect(orphaned(validatorFor("scenario-batch", corpus)("a.json", batch))).toBe(false);
    } finally {
      await rm(corpusRoot, { recursive: true, force: true });
    }
  });
});

// The continuity editor's worklist. `arc-branch-unread` warns one scenario at
// a time and cannot see the arcs nothing answers at all; this command reports
// both off the same ledger, so what it prints is part of the contract.
describe("studio corpus arcs", () => {
  const lines: string[] = [];
  const original = console.log;

  const borderReading = FIXTURE_SCENARIOS.find((s) => s.id === "fixture-the-border-reading")!;
  const position = borderReading.replies.find((reply) => reply.commitment.kind === "position")!;
  const SETTER: ScenarioDef = {
    ...borderReading,
    id: "arc-setter",
    replies: [
      { ...position, id: "answered-in-writing", sets: ["answered-the-note-in-writing"] },
      { ...position, id: "let-it-stand", sets: ["let-the-crossing-stand-shut"] },
    ],
  };
  const READER: ScenarioDef = {
    ...borderReading,
    id: "arc-reader",
    conditions: [{ kind: "flag", flag: "answered-the-note-in-writing", is: true }],
  };

  beforeEach(() => {
    lines.length = 0;
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
  });
  afterEach(() => {
    console.log = original;
  });

  it("names the door nothing answers, and counts it", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-arcs-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [SETTER, READER]);

      expect(await main(["corpus", "arcs"])).toBe(0);

      const output = lines.join("\n");
      expect(output).toContain("1 lopsided carrying 1 dead branch(es)");
      expect(output).toContain("DEAD:     let-it-stand (let-the-crossing-stand-shut)");
      expect(output).toContain("answered: answered-in-writing (answered-the-note-in-writing)");
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("counts a pending batch as part of the pool its setter is already in", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-arcs-batch-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      // Shipped alone, the setter is an arc nothing has answered — which the
      // audit warning cannot see at all, and which is not yet a defect.
      await stageCorpus(root, [SETTER]);
      expect(await main(["corpus", "arcs"])).toBe(0);
      expect(lines.join("\n")).toContain("0 lopsided carrying 0 dead branch(es), 1 fully silent");

      // The reader that answers one of its doors is still in a work directory.
      // Measured against the corpus it is joining, the arc it half-closes is
      // the finding — the count going up because a promise was kept.
      const work = path.join(root, "work");
      await mkdir(work, { recursive: true });
      await writeFile(path.join(work, "batch.json"), JSON.stringify([READER]), "utf8");
      lines.length = 0;

      expect(await main(["corpus", "arcs", "--dir", work])).toBe(0);
      expect(lines.join("\n")).toContain("1 lopsided carrying 1 dead branch(es), 0 fully silent");
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("--from traces a reader back to the reply that set its door", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-arcs-from-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [SETTER, READER]);

      expect(await main(["corpus", "arcs", "--from", "arc-reader"])).toBe(0);
      const output = lines.join("\n");
      expect(output).toContain("upstream of arc-reader: 1 generation(s)");
      expect(output).toContain("arc-setter [foreign-crisis] — answered-in-writing sets answered-the-note-in-writing");
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("--from names the flag as a root when nothing in the pool sets it", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-arcs-from-root-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [READER]);

      expect(await main(["corpus", "arcs", "--from", "arc-reader"])).toBe(0);
      expect(lines.join("\n")).toContain("root flag(s): answered-the-note-in-writing");
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("--check-delete refuses to call a scenario safe when a live reader depends on it", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-arcs-check-delete-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [SETTER, READER]);

      expect(await main(["corpus", "arcs", "--check-delete", "arc-setter"])).toBe(1);
      const output = lines.join("\n");
      expect(output).toContain("UNSAFE to retire");
      expect(output).toContain("arc-reader");
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("--check-delete passes a scenario nothing downstream reads", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-arcs-check-delete-safe-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [SETTER]);

      expect(await main(["corpus", "arcs", "--check-delete", "arc-setter"])).toBe(0);
      expect(lines.join("\n")).toContain("safe to retire");
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("retire refuses to mark a scenario a live reader still depends on, and touches nothing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-retire-unsafe-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [SETTER, READER]);

      expect(await main(["corpus", "retire", "arc-setter"])).toBe(1);
      const output = lines.join("\n");
      expect(output).toContain("UNSAFE to retire");
      expect(output).toContain("arc-reader");

      const paths = corpusPathsFor(path.join(root, "content", "corpus"));
      const [setter] = (await readCorpusBodies(paths)).filter((def) => def.id === "arc-setter");
      expect(setter?.retired).toBeUndefined();
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("retire marks a scenario nothing downstream reads, in place, and it stays out of a fresh pool", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-retire-safe-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [SETTER]);

      expect(await main(["corpus", "retire", "arc-setter"])).toBe(0);
      expect(lines.join("\n")).toContain("arc-setter: retired");

      const paths = corpusPathsFor(path.join(root, "content", "corpus"));
      const bodies = await readCorpusBodies(paths);
      const setter = bodies.find((def) => def.id === "arc-setter");
      expect(setter?.retired).toBe(true);
      // Marked, not deleted: the body and the flags its replies set are still
      // on disk, which is what lets a reader elsewhere in the corpus keep
      // resolving against it.
      expect(bodies).toHaveLength(1);
      expect(memoryPool(bodies).selectors).toHaveLength(0);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("retire is a no-op the second time, and reports a scenario the corpus never held", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "corpus-retire-idempotent-"));
    const previous = process.cwd();
    process.chdir(root);
    try {
      await stageCorpus(root, [SETTER]);
      expect(await main(["corpus", "retire", "arc-setter"])).toBe(0);
      lines.length = 0;

      expect(await main(["corpus", "retire", "arc-setter"])).toBe(0);
      expect(lines.join("\n")).toContain("already retired");

      expect(await main(["corpus", "retire", "never-shipped"])).toBe(1);
    } finally {
      process.chdir(previous);
      await rm(root, { recursive: true, force: true });
    }
  });
});
