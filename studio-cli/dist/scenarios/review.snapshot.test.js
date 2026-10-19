import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { corePack } from "@admin/content";
import { reviewJob, reviewPathsFor, ReviewFile, sampled, sampleRateFor } from "./review.js";
import { shippedCorpus } from "./shipped-corpus.fixture.js";
// The pin. Everything the scenario review writes to disk — the scaffolded
// record, the shipped manifest, and the audit draw that decides who reads what
// — is frozen here as literal output. The review path is one of two things the
// corpus is protected by, and the other one (publish refusing a self-reviewed
// batch) is only as good as the flag this file produces. So the shape of that
// output is not something to re-derive from whatever the code currently does;
// it is the contract, and a change to it has to be an argued change rather than
// a silent one.
const VOLATILE = /"(reviewedAt)": "[^"]*"/g;
async function pinned(file, root) {
    const raw = (await readFile(file, "utf8")).split(root).join("<tmp>").replace(VOLATILE, `"$1": "<when>"`);
    return JSON.parse(raw);
}
async function stage() {
    const root = await mkdtemp(path.join(tmpdir(), "review-pin-"));
    const jobsDir = path.join(root, "jobs");
    const paths = reviewPathsFor(jobsDir, path.join(root, "reviews"), "batch-1");
    await mkdir(paths.workDir, { recursive: true });
    const scenarios = [corePack.scenarios[0], corePack.scenarios[1]].map((def) => JSON.parse(JSON.stringify(def)));
    await writeFile(path.join(paths.workDir, "batch-1-0001.out.json"), JSON.stringify(scenarios), "utf8");
    await writeFile(paths.progressPath, `${JSON.stringify({ itemId: "batch-1-0001", status: "done", spendUsd: 0, timestamp: "2026-08-03T00:00:00.000Z" })}\n`, "utf8");
    await mkdir(jobsDir, { recursive: true });
    await writeFile(paths.jobPath, JSON.stringify({
        id: "batch-1",
        kind: "scenario-batch",
        driver: "mock",
        items: [{ id: "batch-1-0001", payload: { prompt: "x", persona: "the-room" } }],
    }), "utf8");
    return { paths, root };
}
describe("the scenario review's output shape", () => {
    it("writes the same review.json and shipped.json it always has", async () => {
        const { paths, root } = await stage();
        const corpus = shippedCorpus();
        expect(await reviewJob("batch-1", paths, undefined, corpus)).toBe(0);
        expect(await pinned(path.join(paths.reviewDir, "review.json"), root)).toMatchSnapshot("review.json");
        expect(await readFile(path.join(paths.reviewDir, "README.md"), "utf8")).toMatchSnapshot("README.md");
        const filled = ReviewFile.parse(JSON.parse(await readFile(path.join(paths.reviewDir, "review.json"), "utf8")));
        filled.reviewer = "second-session";
        filled.reviewerIsAuthor = false;
        filled.decisions[0].decision = "approve";
        filled.decisions[0].note = "Stake is specific and the replies genuinely diverge.";
        filled.decisions[1].decision = "reject";
        filled.decisions[1].note = "Two replies resolve as the same outcome reworded.";
        await writeFile(path.join(paths.reviewDir, "review.json"), JSON.stringify(filled), "utf8");
        expect(await reviewJob("batch-1", paths, undefined, corpus)).toBe(0);
        const shipped = await pinned(path.join(paths.reviewDir, "shipped.json"), root);
        // The bodies are the corpus's business, not this pin's — what is frozen
        // here is the envelope the publish gate reads.
        const { scenarios: _bodies, ...envelope } = shipped;
        expect(envelope).toMatchSnapshot("shipped.json envelope");
        expect(_bodies.map((def) => def.id)).toMatchSnapshot("shipped ids");
    });
    it("draws the same audit sample it always has", () => {
        const rates = [1, 0.5, 0.1, 0.02].map((rate) => [rate, sampleRateFor(Math.round(40 / rate))]);
        const draw = Array.from({ length: 60 }, (_, index) => [`sc-${index}`, ...[1, 0.5, 0.1].map((rate) => sampled("batch-1", `sc-${index}`, rate))].join(" "));
        expect({ rates, draw }).toMatchSnapshot("audit draw");
    });
});
