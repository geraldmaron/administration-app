import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { flagsSetBy, ScenarioDef } from "@admin/content";
import { harnessCorpus, type HarnessCorpus } from "../corpus/harness-corpus.js";
import type { JobFile } from "./job-file.js";
import { gateResult } from "./gate.js";

type Candidate = {
  readonly item: JobFile["items"][number];
  readonly output: unknown;
  readonly scenario: ScenarioDef;
};

async function repairCandidates(job: JobFile, workDir: string): Promise<readonly Candidate[]> {
  const candidates = await Promise.all(job.items.map(async (item) => {
    const file = path.join(workDir, `${item.id}.out.json`);
    if (!existsSync(file)) return undefined;
    let output: unknown;
    try {
      output = JSON.parse(await readFile(file, "utf8"));
    } catch {
      // The session driver reports unreadable JSON at the item's own file.
      return undefined;
    }
    const parsed = ScenarioDef.safeParse(output);
    return parsed.success ? { item, output, scenario: parsed.data } : undefined;
  }));
  return candidates.filter((candidate): candidate is Candidate => candidate !== undefined);
}

function withCandidateFlags(corpus: HarnessCorpus, candidates: readonly Candidate[]): HarnessCorpus {
  const flags = flagsSetBy(candidates.map((candidate) => candidate.scenario));
  return { ...corpus, scenarioFlags: [...new Set([...corpus.scenarioFlags, ...flags])] };
}

/** A sibling contributes flags only while it can itself pass the full repair gate. */
export async function repairSessionCorpus(job: JobFile, workDir: string, corpus: HarnessCorpus): Promise<HarnessCorpus> {
  let candidates = await repairCandidates(job, workDir);
  while (candidates.length > 0) {
    const prospective = withCandidateFlags(corpus, candidates);
    const surviving = candidates.filter(({ item, output }) =>
      gateResult("scenario-repair", item, { itemId: item.id, status: "done", spendUsd: 0, output }, prospective).status === "done",
    );
    if (surviving.length === candidates.length) return prospective;
    candidates = surviving;
  }
  return corpus;
}

/** Use one corpus view for both the session's findings and the enforced gate. */
export async function jobHarnessCorpus(job: JobFile, jobsDir: string, corpusRoot: string): Promise<HarnessCorpus> {
  const mounted = await harnessCorpus(corpusRoot);
  return job.driver === "session" && job.kind === "scenario-repair"
    ? repairSessionCorpus(job, path.join(jobsDir, "work", job.id), mounted)
    : mounted;
}
