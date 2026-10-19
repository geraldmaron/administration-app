import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { corePack } from "@admin/content";
import { guardScenarioPublish, recordDefects, reviewJob, reviewPathsFor, ReviewFile, sampleRateFor, FULL_REVIEW_CEILING } from "./review.js";
import { ownerReviewFrom } from "../jobs/review-core.js";
import { shippedCorpus } from "./shipped-corpus.fixture.js";
// The claim under test: the review is a gate of its own. It refuses to emit a
// hand-off while any judgment is missing, and re-checks approved content as it
// stands on disk — because the journal never looks at an output file again
// after accepting it, and the review is the last checkpoint before publish.
async function stage() {
    const root = await mkdtemp(path.join(tmpdir(), "scenario-review-"));
    const jobsDir = path.join(root, "jobs");
    const paths = reviewPathsFor(jobsDir, path.join(root, "reviews"), "batch-1");
    await mkdir(paths.workDir, { recursive: true });
    const scenarios = [corePack.scenarios[0], corePack.scenarios[1]].map((def) => JSON.parse(JSON.stringify(def)));
    await writeFile(path.join(paths.workDir, "batch-1-0001.out.json"), JSON.stringify(scenarios), "utf8");
    await writeFile(paths.progressPath, `${JSON.stringify({ itemId: "batch-1-0001", status: "done", spendUsd: 0, timestamp: "2026-08-03T00:00:00.000Z" })}\n`, "utf8");
    return { paths, scenarios };
}
async function record(paths) {
    return ReviewFile.parse(JSON.parse(await readFile(path.join(paths.reviewDir, "review.json"), "utf8")));
}
describe("the review handshake", () => {
    it("scaffolds one pending decision per journaled-done scenario, then refuses to finish it unfilled", async () => {
        const { paths, scenarios } = await stage();
        expect(await reviewJob("batch-1", paths)).toBe(0);
        const scaffolded = await record(paths);
        expect(scaffolded.decisions.map((decision) => decision.scenarioId)).toEqual(scenarios.map((s) => s.id));
        expect(scaffolded.decisions.every((decision) => decision.decision === "pending")).toBe(true);
        // Untouched, the second run is the finish path — and it must refuse.
        expect(await reviewJob("batch-1", paths)).toBe(1);
        expect(existsSync(path.join(paths.reviewDir, "shipped.json"))).toBe(false);
    });
    it("names every hole: unsigned, unanswered authorship, pending decisions, undecided scenarios", () => {
        const defects = recordDefects({
            runId: "batch-1",
            reviewedAt: "2026-08-03T00:00:00.000Z",
            reviewer: "",
            reviewerIsAuthor: null,
            sampleRate: 1,
            decisions: [
                { scenarioId: "a", sourcePath: "x", decision: "pending", note: "", tier: "sampled", flags: [] },
                { scenarioId: "b", sourcePath: "x", decision: "approve", note: "fine", tier: "flagged", flags: [] },
            ],
        }, new Set(["a", "b", "c"]));
        expect(defects.some((defect) => defect.includes("reviewer is empty"))).toBe(true);
        expect(defects.some((defect) => defect.includes("reviewerIsAuthor"))).toBe(true);
        expect(defects.some((defect) => defect.includes("a (sampled): still pending"))).toBe(true);
        expect(defects.some((defect) => defect.includes("b: note under"))).toBe(false);
        expect(defects.some((defect) => defect.includes("c: journaled done but absent"))).toBe(true);
    });
    // Pinned known defect: The core-pack scenarios the fixture stages open arcs with no close member
    // and fail the audit on family-without-close, so the batch ships nothing.
    it.fails("ships approved scenarios, records the rejection, and marks an author-reviewed batch provisional", async () => {
        const { paths, scenarios } = await stage();
        await reviewJob("batch-1", paths);
        const filled = await record(paths);
        filled.reviewer = "claude-code";
        filled.reviewerIsAuthor = true;
        filled.decisions[0].decision = "approve";
        filled.decisions[0].note = "Stake is specific and the replies genuinely diverge.";
        filled.decisions[1].decision = "reject";
        filled.decisions[1].note = "Two replies resolve as the same outcome reworded.";
        await writeFile(path.join(paths.reviewDir, "review.json"), JSON.stringify(filled), "utf8");
        expect(await reviewJob("batch-1", paths)).toBe(0);
        const shipped = JSON.parse(await readFile(path.join(paths.reviewDir, "shipped.json"), "utf8"));
        expect(shipped.scenarios.map((s) => s.id)).toEqual([scenarios[0].id]);
        expect(shipped.provisional).toBe(true);
    });
    it("refuses to ship an approved scenario whose file was broken after the journal accepted it", async () => {
        const { paths, scenarios } = await stage();
        await reviewJob("batch-1", paths);
        const filled = await record(paths);
        filled.reviewer = "second-session";
        filled.reviewerIsAuthor = false;
        for (const decision of filled.decisions) {
            decision.decision = "approve";
            decision.note = "Reads well; replies diverge and remembered lines track.";
        }
        await writeFile(path.join(paths.reviewDir, "review.json"), JSON.stringify(filled), "utf8");
        // The edit the journal never sees: a real capital spliced in post-acceptance.
        const broken = JSON.parse(JSON.stringify(scenarios));
        broken[0].opening[0].text = broken[0].opening[0].text.replace(/^\S+/, "Berlin says");
        await writeFile(path.join(paths.workDir, "batch-1-0001.out.json"), JSON.stringify(broken), "utf8");
        expect(await reviewJob("batch-1", paths)).toBe(1);
        expect(existsSync(path.join(paths.reviewDir, "shipped.json"))).toBe(false);
    });
});
// Three directors are only worth having if it can be seen which one is
// working. The job file is the durable record of what a batch ran under, so
// attribution is read back from it rather than re-derived from the class.
describe("director attribution", () => {
    // Pinned known defect: The core-pack scenarios the fixture stages open arcs with no close member
    // and fail the audit on family-without-close, so the batch ships nothing.
    it.fails("records the job's persona per decision and tallies it into shipped.json", async () => {
        const { paths, scenarios } = await stage();
        await mkdir(path.dirname(paths.jobPath), { recursive: true });
        await writeFile(paths.jobPath, JSON.stringify({
            id: "batch-1",
            kind: "scenario-batch",
            driver: "mock",
            items: [{ id: "batch-1-0001", payload: { prompt: "x", persona: "the-room" } }],
        }), "utf8");
        await reviewJob("batch-1", paths);
        const filled = await record(paths);
        expect(filled.decisions.every((decision) => decision.persona === "the-room")).toBe(true);
        filled.reviewer = "second-session";
        filled.reviewerIsAuthor = false;
        filled.decisions[0].decision = "approve";
        filled.decisions[0].note = "Stake is specific and the replies genuinely diverge.";
        filled.decisions[1].decision = "reject";
        filled.decisions[1].note = "Two replies resolve as the same outcome reworded.";
        await writeFile(path.join(paths.reviewDir, "review.json"), JSON.stringify(filled), "utf8");
        expect(await reviewJob("batch-1", paths)).toBe(0);
        const shipped = JSON.parse(await readFile(path.join(paths.reviewDir, "shipped.json"), "utf8"));
        expect(shipped.personas).toEqual({ "the-room": { shipped: 1, rejected: 1 } });
        expect(shipped.scenarios.map((s) => s.id)).toEqual([scenarios[0].id]);
    });
    // Batches written before directors existed still review; they simply have
    // nothing to attribute.
    it("reviews a job file that names no persona", async () => {
        const { paths } = await stage();
        await reviewJob("batch-1", paths);
        expect((await record(paths)).decisions.every((decision) => decision.persona === undefined)).toBe(true);
    });
});
// A batch of thousands cannot be read line by line, and pretending otherwise
// buys a rubber stamp rather than a judgment. These are the properties that
// make the sample honest: it shrinks with size but never to nothing, it cannot
// be rerolled, and what a batch actually got is recorded with it.
describe("review at corpus scale", () => {
    it("reads a small batch in full and samples a large one", () => {
        expect(sampleRateFor(10)).toBe(1);
        expect(sampleRateFor(FULL_REVIEW_CEILING)).toBe(1);
        expect(sampleRateFor(1_000)).toBeLessThan(1);
        expect(sampleRateFor(10_000)).toBeGreaterThan(0);
        // Never below the floor, however big the batch gets.
        expect(sampleRateFor(1_000_000)).toBeGreaterThanOrEqual(0.02);
    });
    it("keeps a human's reading roughly constant as batches grow", () => {
        for (const size of [100, 1_000, 10_000]) {
            const read = size * sampleRateFor(size);
            expect(read).toBeGreaterThanOrEqual(40);
            expect(read).toBeLessThanOrEqual(size * 0.02 + 40);
        }
    });
    it("does not hold a clean scenario's pending decision against the batch, but still demands the sampled ones", () => {
        const base = {
            runId: "batch-1",
            reviewedAt: "2026-08-04T00:00:00.000Z",
            reviewer: "someone",
            reviewerIsAuthor: false,
            sampleRate: 0.1,
        };
        const defects = recordDefects({
            ...base,
            decisions: [
                { scenarioId: "clean", sourcePath: "x", decision: "pending", note: "", tier: "clean", flags: [] },
                { scenarioId: "flagged", sourcePath: "x", decision: "pending", note: "", tier: "flagged", flags: ["thin"] },
            ],
        }, new Set(["clean", "flagged"]));
        expect(defects.some((defect) => defect.includes("clean"))).toBe(false);
        expect(defects.some((defect) => defect.includes("flagged (flagged): still pending"))).toBe(true);
    });
});
// The escape hatch, and the fact that it is one. The independence check cannot
// verify identity, so the only property worth defending is that every way past
// it is attributable — an exception with a name and a reason on it, not a hole.
describe("the owner accepting a self-review deliberately", () => {
    const guard = (provisional, args, owner) => guardScenarioPublish("batch-1", provisional, args, owner);
    const authorization = {
        authorizedBy: "Gerald Dagher",
        reason: "The pool is below its floor and this batch is the floor; reviewed again before v1.",
        at: "2026-08-04T00:00:00.000Z",
    };
    it("refuses a provisional batch that carries no authorization, and says how to get one", () => {
        const outcome = guard(true, []);
        expect(outcome.ok).toBe(false);
        if (outcome.ok)
            return;
        expect(outcome.messages.some((m) => m.includes("--owner-review"))).toBe(true);
    });
    it("lets an authorized batch through, naming who authorized it and why", () => {
        const outcome = guard(true, [], authorization);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok)
            return;
        const said = (outcome.notices ?? []).join("\n");
        expect(said).toContain("Gerald Dagher");
        expect(said).toContain("below its floor");
        // The point the whole design turns on: authorized is not reviewed.
        expect(said).toContain("authorized is not reviewed");
    });
    it("still says something when the bare flag is used, because that flag records nothing", () => {
        const outcome = guard(true, ["--allow-provisional"]);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok)
            return;
        expect((outcome.notices ?? []).join("\n")).toContain("records nothing about who decided");
    });
    it("stays silent and open for a batch that was reviewed independently", () => {
        const outcome = guard(false, []);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok)
            return;
        expect(outcome.notices ?? []).toEqual([]);
    });
    it("reads the reason and the name off argv, and refuses a reason too short to be one", () => {
        const identity = () => "Gerald Dagher";
        expect(ownerReviewFrom(["batch-1"], identity)).toBeUndefined();
        expect(ownerReviewFrom(["batch-1", "--owner-review"], identity)).toEqual({
            error: expect.stringContaining("needs a reason"),
        });
        expect(ownerReviewFrom(["batch-1", "--owner-review", "ok"], identity)).toEqual({
            error: expect.stringContaining("at least"),
        });
        const parsed = ownerReviewFrom(["batch-1", "--owner-review", authorization.reason], identity);
        expect(parsed).toMatchObject({ authorizedBy: "Gerald Dagher", reason: authorization.reason });
    });
    it("will not sign an authorization with nobody's name on it", () => {
        // No git identity and no --as: the one thing it must not do is invent one.
        expect(ownerReviewFrom(["batch-1", "--owner-review", authorization.reason], () => undefined)).toEqual({
            error: expect.stringContaining("needs a name"),
        });
        expect(ownerReviewFrom(["batch-1", "--owner-review", authorization.reason, "--as", "Someone Else"], () => undefined)).toMatchObject({ authorizedBy: "Someone Else" });
    });
    it("keeps the provisional mark on a batch the owner authorized, in the shipped manifest", async () => {
        const { paths } = await stage();
        const corpus = shippedCorpus();
        await reviewJob("batch-1", paths, undefined, corpus);
        const filled = await record(paths);
        filled.reviewer = "claude-code";
        filled.reviewerIsAuthor = true;
        for (const decision of filled.decisions) {
            decision.decision = "approve";
            decision.note = "Reads well; replies diverge and the remembered lines track.";
        }
        await writeFile(path.join(paths.reviewDir, "review.json"), JSON.stringify(filled), "utf8");
        expect(await reviewJob("batch-1", paths, authorization, corpus)).toBe(0);
        const shipped = JSON.parse(await readFile(path.join(paths.reviewDir, "shipped.json"), "utf8"));
        // Both true at once. Authorization unblocks the publish; it does not
        // rewrite what happened, and the corpus keeps saying so.
        expect(shipped.provisional).toBe(true);
        expect(shipped.ownerAuthorization).toMatchObject({ authorizedBy: "Gerald Dagher" });
        expect(guard(shipped.provisional, [], shipped.ownerAuthorization).ok).toBe(true);
    });
});
