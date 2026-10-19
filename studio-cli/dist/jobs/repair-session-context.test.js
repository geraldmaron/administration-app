import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ScenarioDef } from "@admin/content";
import { harnessCorpus } from "../corpus/harness-corpus.js";
import { validatorFor } from "../cli.js";
import { referenceExemplars } from "../scenarios/reference.js";
import { SessionDriver } from "./drivers/session-driver.js";
import { jobHarnessCorpus } from "./repair-session-context.js";
import { pathsFor, runJob } from "./runner.js";
const FLAG = "repair-session-sibling-callback-test";
const base = referenceExemplars().find((scenario) => scenario.id === "the-yards-and-the-money-that-runs-out");
function output(id, reader) {
    const scenario = ScenarioDef.parse({
        ...base,
        // The exemplar declares a premise because its own gate is not a class reading; these probes gate on the treasury, which is.
        premise: undefined,
        id,
        conditions: reader
            ? [{ kind: "metric", metric: "treasury", atLeast: 0 }, { kind: "flag", flag: FLAG, is: true }]
            : [{ kind: "metric", metric: "treasury", atLeast: 0 }],
        replies: reader ? base.replies : base.replies.map((reply, index) => index === 0 ? { ...reply, sets: [...(reply.sets ?? []), FLAG] } : reply),
    });
    const mechanisms = scenario.replies.flatMap((reply) => reply.commitment.kind === "position"
        ? Object.entries(reply.commitment.cost)
            .filter(([, value]) => typeof value === "number" && value !== 0)
            .map(([metric]) => ({ reply: reply.id, metric, because: "The stated choice commits the resources and changes the board's position." }))
        : []);
    return { ...scenario, binding: { mechanisms } };
}
async function setup(reverse = false) {
    const root = await mkdtemp(path.join(tmpdir(), "repair-session-"));
    const jobsDir = path.join(root, "jobs");
    const workDir = path.join(jobsDir, "work", "repair-test");
    await mkdir(workDir, { recursive: true });
    const setter = output("repair-session-setter", false);
    const reader = output("repair-session-reader", true);
    const items = [setter, reader].map((candidate) => ({
        id: String(candidate.id),
        payload: { original: ScenarioDef.parse(candidate) },
    }));
    const job = { id: "repair-test", kind: "scenario-repair", driver: "session", items: reverse ? items.reverse() : items };
    await writeFile(path.join(jobsDir, `${job.id}.json`), JSON.stringify(job));
    for (const candidate of [setter, reader]) {
        await writeFile(path.join(workDir, `${candidate.id}.out.json`), JSON.stringify(candidate));
    }
    const corpus = await harnessCorpus(path.join(root, "corpus"));
    return { root, jobsDir, workDir, job, corpus, setter, reader, paths: pathsFor(jobsDir, root, job.id) };
}
async function run(fixture, recheck = false) {
    const corpus = await jobHarnessCorpus(fixture.job, fixture.jobsDir, path.join(fixture.root, "corpus"));
    const driver = new SessionDriver({ workDir: fixture.workDir, validate: validatorFor(fixture.job.kind, corpus) });
    return runJob(fixture.paths, driver, corpus, { recheck });
}
describe("session repair siblings", () => {
    it("leaves other job kinds on the mounted corpus", async () => {
        const fixture = await setup();
        try {
            const other = await jobHarnessCorpus({ ...fixture.job, kind: "scenario-batch" }, fixture.jobsDir, path.join(fixture.root, "corpus"));
            expect(other.scenarioFlags).toEqual(fixture.corpus.scenarioFlags);
        }
        finally {
            await rm(fixture.root, { recursive: true, force: true });
        }
    });
    it("recovers a real session reader that the mounted-only runner rejects", async () => {
        const fixture = await setup();
        try {
            const oldDriver = new SessionDriver({ workDir: fixture.workDir, validate: validatorFor(fixture.job.kind, fixture.corpus) });
            const before = await runJob(fixture.paths, oldDriver, fixture.corpus);
            expect(before.ran).toEqual(["repair-session-setter"]);
            expect(before.failed).toEqual(["repair-session-reader"]);
            const beforeFindings = await readFile(path.join(fixture.workDir, "repair-session-reader.findings.json"), "utf8");
            expect(beforeFindings).toContain("flag-condition-never-set");
            const after = await run(fixture, true);
            expect(after.ran, JSON.stringify(after.failedReasons)).toEqual(["repair-session-setter", "repair-session-reader"]);
            expect(after.failed).toEqual([]);
            const afterFindings = await readFile(path.join(fixture.workDir, "repair-session-reader.findings.json"), "utf8");
            expect(afterFindings).not.toContain("flag-condition-never-set");
        }
        finally {
            await rm(fixture.root, { recursive: true, force: true });
        }
    });
    it("accepts the reader when it comes before its valid setter", async () => {
        const fixture = await setup(true);
        try {
            const result = await run(fixture);
            expect(result.ran, JSON.stringify(result.failedReasons)).toEqual(["repair-session-reader", "repair-session-setter"]);
            expect(result.failed).toEqual([]);
        }
        finally {
            await rm(fixture.root, { recursive: true, force: true });
        }
    });
    it.each(["missing", "malformed", "preservation-invalid", "gate-invalid"])("does not trust a %s setter on recheck", async (defect) => {
        const fixture = await setup();
        try {
            expect((await run(fixture)).ran).toHaveLength(2);
            const setterPath = path.join(fixture.workDir, "repair-session-setter.out.json");
            if (defect === "missing")
                await rm(setterPath);
            if (defect === "malformed")
                await writeFile(setterPath, "{");
            if (defect === "preservation-invalid")
                await writeFile(setterPath, JSON.stringify({ ...fixture.setter, id: "different-id" }));
            if (defect === "gate-invalid")
                await writeFile(setterPath, JSON.stringify({ ...fixture.setter, conditions: [] }));
            const result = await run(fixture, true);
            expect(result.failed).toEqual(["repair-session-setter", "repair-session-reader"]);
            expect(result.failedReasons["repair-session-reader"]).toContain("defect");
        }
        finally {
            await rm(fixture.root, { recursive: true, force: true });
        }
    });
});
