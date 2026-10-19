import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { flagsSetBy, ScenarioDef } from "@admin/content";
import { harnessCorpus } from "../corpus/harness-corpus.js";
import { gateResult } from "./gate.js";
async function repairCandidates(job, workDir) {
    const candidates = await Promise.all(job.items.map(async (item) => {
        const file = path.join(workDir, `${item.id}.out.json`);
        if (!existsSync(file))
            return undefined;
        let output;
        try {
            output = JSON.parse(await readFile(file, "utf8"));
        }
        catch {
            // The session driver reports unreadable JSON at the item's own file.
            return undefined;
        }
        const parsed = ScenarioDef.safeParse(output);
        return parsed.success ? { item, output, scenario: parsed.data } : undefined;
    }));
    return candidates.filter((candidate) => candidate !== undefined);
}
function withCandidateFlags(corpus, candidates) {
    const flags = flagsSetBy(candidates.map((candidate) => candidate.scenario));
    return { ...corpus, scenarioFlags: [...new Set([...corpus.scenarioFlags, ...flags])] };
}
/** A sibling contributes flags only while it can itself pass the full repair gate. */
export async function repairSessionCorpus(job, workDir, corpus) {
    let candidates = await repairCandidates(job, workDir);
    while (candidates.length > 0) {
        const prospective = withCandidateFlags(corpus, candidates);
        const surviving = candidates.filter(({ item, output }) => gateResult("scenario-repair", item, { itemId: item.id, status: "done", spendUsd: 0, output }, prospective).status === "done");
        if (surviving.length === candidates.length)
            return prospective;
        candidates = surviving;
    }
    return corpus;
}
/** Use one corpus view for both the session's findings and the enforced gate. */
export async function jobHarnessCorpus(job, jobsDir, corpusRoot) {
    const mounted = await harnessCorpus(corpusRoot);
    return job.driver === "session" && job.kind === "scenario-repair"
        ? repairSessionCorpus(job, path.join(jobsDir, "work", job.id), mounted)
        : mounted;
}
