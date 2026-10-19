import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FIXTURE_SCENARIOS } from "@admin/content";
import { runJob, pathsFor } from "./runner.js";
import { MockDriver } from "./drivers/mock-driver.js";
import { OpenRouterDriver } from "./drivers/openrouter-driver.js";
// A shipped, audit-passing scenario — reused so the "second driver" test
// proves a genuine parse-then-validate round trip, not just an HTTP call.
const VALID_SCENARIO = FIXTURE_SCENARIOS.find((s) => s.id === "fixture-the-border-reading");
const job = {
    id: "test-job",
    kind: "scenario-batch",
    driver: "mock",
    items: [
        { id: "item-1", payload: { topic: "a" } },
        { id: "item-2", payload: { topic: "b" } },
        { id: "item-3", payload: { topic: "c" } },
    ],
};
let dir;
beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "studio-cli-jobs-"));
    await writeFile(path.join(dir, `${job.id}.json`), JSON.stringify(job), "utf8");
});
afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});
describe("runJob", () => {
    it("runs every item and journals progress + spend on a clean run", async () => {
        const paths = pathsFor(dir, dir, job.id);
        const summary = await runJob(paths, new MockDriver());
        expect(summary.ran).toEqual(["item-1", "item-2", "item-3"]);
        expect(summary.skipped).toEqual([]);
        expect(summary.totalSpendUsd).toBeCloseTo(0.015, 5);
        const ledger = (await readFile(paths.ledgerPath, "utf8")).trim().split("\n");
        expect(ledger).toHaveLength(3);
    });
    it("resumes an interrupted run without re-spending completed items", async () => {
        const paths = pathsFor(dir, dir, job.id);
        // First pass: item-2 deliberately fails; item-1 and item-3 complete normally.
        const first = await runJob(paths, new MockDriver(new Set(["item-2"])));
        expect(first.ran).toEqual(["item-1", "item-3"]);
        expect(first.failed).toEqual(["item-2"]);
        // Resume: item-1 and item-3 must be skipped (already done, no re-spend); item-2 retried and succeeds this time.
        const second = await runJob(paths, new MockDriver());
        expect(second.skipped).toEqual(["item-1", "item-3"]);
        expect(second.ran).toEqual(["item-2"]);
        const ledgerLines = (await readFile(paths.ledgerPath, "utf8")).trim().split("\n");
        const item1SpendEntries = ledgerLines.filter((l) => JSON.parse(l).itemId === "item-1");
        expect(item1SpendEntries).toHaveLength(1); // never re-spent
    });
    // The ceiling exists because image generation bills per request and a job
    // file is a loop. Everything below is about it being a ceiling the job stops
    // *under*, not one it reports having passed.
    describe("the budget ceiling", () => {
        it("stops before the item that would cross it, and names what it skipped", async () => {
            const paths = pathsFor(dir, dir, job.id);
            // Two items fit at 0.005 each with a 0.005 worst case; the third does not.
            const summary = await runJob(paths, new MockDriver(), undefined, {
                budgetUsd: 0.011,
                worstCaseItemUsd: 0.005,
            });
            expect(summary.ran).toEqual(["item-1", "item-2"]);
            expect(summary.haltedForBudget).toEqual(["item-3"]);
            expect(summary.totalSpendUsd).toBeLessThanOrEqual(0.011);
        });
        it("never starts an item whose worst case would breach the ceiling", async () => {
            const paths = pathsFor(dir, dir, job.id);
            const summary = await runJob(paths, new MockDriver(), undefined, {
                budgetUsd: 0.05,
                // A single item could cost this much, so nothing may run at all.
                worstCaseItemUsd: 0.06,
            });
            expect(summary.ran).toEqual([]);
            expect(summary.haltedForBudget).toEqual(["item-1", "item-2", "item-3"]);
            expect(summary.totalSpendUsd).toBe(0);
        });
        // The one that matters most: a budget counted from this process resets
        // every time a run is interrupted, which makes it not a budget at all.
        it("counts spend from previous runs, so resuming does not reset the budget", async () => {
            const paths = pathsFor(dir, dir, job.id);
            const first = await runJob(paths, new MockDriver(), undefined, {
                budgetUsd: 0.011,
                worstCaseItemUsd: 0.005,
            });
            expect(first.ran).toEqual(["item-1", "item-2"]);
            const second = await runJob(paths, new MockDriver(), undefined, {
                budgetUsd: 0.011,
                worstCaseItemUsd: 0.005,
            });
            expect(second.skipped).toEqual(["item-1", "item-2"]);
            expect(second.ran, "the budget is already spent — resuming must not run item-3").toEqual([]);
            expect(second.haltedForBudget).toEqual(["item-3"]);
            expect(second.lifetimeSpendUsd).toBeCloseTo(0.01, 5);
        });
        it("counts failed items against the budget — a rejected image still cost money", async () => {
            const paths = pathsFor(dir, dir, job.id);
            // item-1 fails at the gate but the mock still reports spend for it.
            const spendingFailure = new MockDriver(new Set(), { not: "a scenario" });
            await runJob(paths, spendingFailure, undefined, { budgetUsd: 1, worstCaseItemUsd: 0.005 });
            const { readJournaledSpend } = await import("./runner.js");
            expect(await readJournaledSpend(paths.progressPath)).toBeGreaterThan(0);
        });
        it("runs without a ceiling when none is given", async () => {
            const paths = pathsFor(dir, dir, job.id);
            const summary = await runJob(paths, new MockDriver());
            expect(summary.ran).toHaveLength(3);
            expect(summary.haltedForBudget).toEqual([]);
        });
    });
    it("the driver interface has more than one real implementation", async () => {
        const fakeFetch = async () => ({
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: JSON.stringify([VALID_SCENARIO]) } }] }),
        });
        const openRouter = new OpenRouterDriver({ apiKey: "test-key", models: { default: "test-model" }, fetchImpl: fakeFetch });
        const result = await openRouter.runItem({ id: "item-1", payload: {} });
        expect(result.status).toBe("done");
        expect(openRouter.name).not.toBe(new MockDriver().name);
    });
});
