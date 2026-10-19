import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runJob, pathsFor } from "./runner.js";
import { MockDriver } from "./drivers/mock-driver.js";
import { CORE_CONSEQUENCES, ScenarioDef } from "@admin/content";
import { gateResult } from "./gate.js";
import { referenceExemplars } from "../scenarios/reference.js";
// The claim under test is not "the drivers validate" — they do, and they could
// stop. It is that a driver reporting a clean result on content the audit
// rejects still cannot get a "done" entry, because the runner re-checks every
// result on the way to the journal.
const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "__fixtures__");
let rejected;
let dir;
const jobFor = (kind) => ({
    id: "gate-job",
    kind,
    driver: "mock",
    items: [{ id: "item-1", payload: { prompt: "go" } }],
});
async function writeJob(job) {
    await writeFile(path.join(dir, `${job.id}.json`), JSON.stringify(job), "utf8");
}
async function journal(jobId) {
    const raw = await readFile(path.join(dir, `${jobId}.progress.jsonl`), "utf8");
    return raw
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
}
beforeEach(async () => {
    rejected = JSON.parse(await readFile(path.join(fixturesDir, "rejected-scenarios.json"), "utf8"));
    dir = await mkdtemp(path.join(tmpdir(), "studio-cli-gate-"));
});
afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});
describe("the publish gate a driver cannot get around", () => {
    it("refuses a driver's clean report when the content itself is not clean", async () => {
        const job = jobFor("scenario-batch");
        await writeJob(job);
        // A driver that never validates anything and calls its output done.
        const summary = await runJob(pathsFor(dir, dir, job.id), new MockDriver(new Set(), rejected));
        expect(summary.ran).toEqual([]);
        expect(summary.failed).toEqual(["item-1"]);
        expect(summary.failedReasons["item-1"]).toMatch(/publish gate/);
        expect((await journal(job.id))[0].status).toBe("failed");
    });
    it("names the retargeted rules that caught it: band inconsistency and charter leakage", async () => {
        const job = jobFor("scenario-batch");
        await writeJob(job);
        const summary = await runJob(pathsFor(dir, dir, job.id), new MockDriver(new Set(), rejected));
        expect(summary.failedReasons["item-1"]).toContain("Germany");
        expect(summary.failedReasons["item-1"]).toContain("National Assembly");
    });
    it("still journals the spend of a rejected item, because the money left anyway", async () => {
        const job = jobFor("scenario-batch");
        await writeJob(job);
        await runJob(pathsFor(dir, dir, job.id), new MockDriver(new Set(), rejected));
        expect((await journal(job.id))[0].spendUsd).toBe(0.005);
    });
    it("fails closed on a job kind that has registered no gate", async () => {
        const job = jobFor("imagery-batch");
        await writeJob(job);
        const summary = await runJob(pathsFor(dir, dir, job.id), new MockDriver());
        expect(summary.ran).toEqual([]);
        expect(summary.failedReasons["item-1"]).toMatch(/no publish gate/);
    });
    it("gates a consequence batch on the same terms, naming what it refused", async () => {
        const job = jobFor("consequence-batch");
        await writeJob(job);
        const bad = [{ ...CORE_CONSEQUENCES[0], id: "cq-gate-bad", riskAffinity: ["blown-cover"] }];
        const summary = await runJob(pathsFor(dir, dir, job.id), new MockDriver(new Set(), bad));
        expect(summary.ran).toEqual([]);
        expect(summary.failedReasons["item-1"]).toMatch(/publish gate/);
        expect(summary.failedReasons["item-1"]).toContain("blown-cover");
        expect((await journal(job.id))[0].status).toBe("failed");
    });
    it("lets a clean consequence batch through", async () => {
        const job = jobFor("consequence-batch");
        await writeJob(job);
        const good = [{ ...CORE_CONSEQUENCES[0], id: "cq-gate-good" }];
        const summary = await runJob(pathsFor(dir, dir, job.id), new MockDriver(new Set(), good));
        expect(summary.ran).toEqual(["item-1"]);
        expect((await journal(job.id))[0].status).toBe("done");
    });
    it("lets clean content through, so the gate is a gate and not a wall", async () => {
        const job = jobFor("scenario-batch");
        await writeJob(job);
        const summary = await runJob(pathsFor(dir, dir, job.id), new MockDriver());
        expect(summary.ran).toEqual(["item-1"]);
        expect((await journal(job.id))[0].status).toBe("done");
    });
    // An image cannot be audited for craft, so what the image gate holds is the
    // checkable part: the file is there, and it is the format and weight the
    // player ships. Each case below is a way a paid-for batch can come back
    // worthless while every driver in it reports success.
    describe("the image gate", () => {
        const imageRecord = async (overrides = {}) => {
            const filePath = path.join(dir, "scene.webp");
            await writeFile(filePath, Buffer.alloc(12_000, 0x42));
            return { filePath, bytes: 12_000, mimeType: "image/webp", model: "test/model", ...overrides };
        };
        const runWith = async (output) => {
            const job = jobFor("scene-batch");
            await writeJob(job);
            return runJob(pathsFor(dir, dir, job.id), new MockDriver(new Set(), output));
        };
        it("accepts an image that meets the shipped standard", async () => {
            const summary = await runWith(await imageRecord());
            expect(summary.ran).toEqual(["item-1"]);
        });
        it("refuses an image too small to be a real image", async () => {
            // A model that declines politely still returns a few hundred bytes.
            const summary = await runWith(await imageRecord({ bytes: 400 }));
            expect(summary.failed).toEqual(["item-1"]);
            expect(summary.failedReasons["item-1"]).toContain("too small");
        });
        it("refuses an image heavier than the player ships", async () => {
            const summary = await runWith(await imageRecord({ bytes: 400_000 }));
            expect(summary.failed).toEqual(["item-1"]);
            expect(summary.failedReasons["item-1"]).toContain("ceiling");
        });
        it("refuses a format the player does not ship", async () => {
            const summary = await runWith(await imageRecord({ mimeType: "image/png" }));
            expect(summary.failed).toEqual(["item-1"]);
            expect(summary.failedReasons["item-1"]).toContain("webp");
        });
        it("refuses a record whose file is not actually on disk", async () => {
            const summary = await runWith({
                filePath: path.join(dir, "never-written.webp"),
                bytes: 12_000,
                mimeType: "image/webp",
                model: "test/model",
            });
            expect(summary.failed).toEqual(["item-1"]);
            expect(summary.failedReasons["item-1"]).toContain("no file");
        });
        it("refuses output that is not an image record at all", async () => {
            const summary = await runWith({ some: "other thing" });
            expect(summary.failed).toEqual(["item-1"]);
        });
    });
});
// The retime and regate gates: an upgrade held to one further thing, checked
// directly against `gateResult` rather than through a driver, the same way
// upgrade.test.ts checks `scenarioUpgradeGate`. The reference set is the
// fixture — real, reviewed content — but it is not yet clean of the very
// flash-forwards the retime pass exists to fix, so a case
// needing a known-clean field builds one rather than assuming the exemplar
// already has one.
describe("the retime and regate gates", () => {
    function exemplar() {
        const [first] = referenceExemplars();
        if (!first)
            throw new Error("the reference set is empty — gate tests have no fixture");
        return first;
    }
    function positionReplyId(def) {
        const reply = def.replies.find((candidate) => candidate.commitment?.kind === "position");
        if (!reply)
            throw new Error("the exemplar carries no position reply");
        return reply.id;
    }
    const FLASH_FORWARD = "Eleven weeks later, the numbers finally came back clean, and nobody in the building was surprised by how long it took.";
    const CLEAN_REWRITE = "By morning the duty officer had logged the call, and the first cost was already on the week's ledger.";
    const COUNTDOWN = "The clock is already running on the response, whatever the room decides.";
    function withRejoinderText(def, replyId, text) {
        return ScenarioDef.parse({
            ...def,
            replies: def.replies.map((reply) => reply.id === replyId && reply.commitment?.kind === "position"
                ? { ...reply, commitment: { ...reply.commitment, rejoinder: { ...reply.commitment.rejoinder, text } } }
                : reply),
        });
    }
    function retimeItem(original) {
        return { id: `retime-gate-${original.id}`, payload: { original: original } };
    }
    const gate = (kind, item, output) => gateResult(kind, item, { itemId: item.id, status: "done", spendUsd: 0, output });
    it("passes a retime that fixes the one flagged field and nothing else", () => {
        const replyId = positionReplyId(exemplar());
        const original = withRejoinderText(exemplar(), replyId, FLASH_FORWARD);
        const revised = withRejoinderText(exemplar(), replyId, CLEAN_REWRITE);
        expect(gate("scenario-retime", retimeItem(original), revised).status).toBe("done");
    });
    it("rule 1: refuses a retime that moved a field outside its allowance, however the flagged field reads", () => {
        const replyId = positionReplyId(exemplar());
        const original = withRejoinderText(exemplar(), replyId, FLASH_FORWARD);
        const revised = ScenarioDef.parse({ ...withRejoinderText(exemplar(), replyId, CLEAN_REWRITE), subject: `${original.subject} Updated.` });
        const result = gate("scenario-retime", retimeItem(original), revised);
        expect(result.status).toBe("failed");
        expect(result.error).toContain('"subject" changed');
    });
    it("rule 2: refuses a retime that leaves the flagged field's finding in place", () => {
        const replyId = positionReplyId(exemplar());
        const original = withRejoinderText(exemplar(), replyId, FLASH_FORWARD);
        // "Touched" but not actually fixed — a cosmetic edit that keeps the claim.
        const stillFlashesForward = withRejoinderText(exemplar(), replyId, `Yes — ${FLASH_FORWARD}`);
        const result = gate("scenario-retime", retimeItem(original), stillFlashesForward);
        expect(result.status).toBe("failed");
        expect(result.error).toContain("still carries a time finding");
    });
    it("rule 3: refuses a countdown phrase reached for in a routine or serious scenario's changed field", () => {
        const replyId = positionReplyId(exemplar());
        const original = withRejoinderText(exemplar(), replyId, FLASH_FORWARD);
        const revised = ScenarioDef.parse({ ...withRejoinderText(exemplar(), replyId, COUNTDOWN), severity: "serious" });
        const originalSerious = ScenarioDef.parse({ ...original, severity: "serious" });
        const result = gate("scenario-retime", retimeItem(originalSerious), revised);
        expect(result.status).toBe("failed");
        expect(result.error).toContain("countdown phrase");
    });
    // A bound no campaign ever reaches, rather than a flag condition: an
    // unset-flag condition is pre-seeded true on the preview boards by
    // `flagsWaitedOn` (this batch's own flag is assumed set so a scenario is not
    // called unreachable for waiting on its own deed), which would make the
    // scenario reachable despite the point of this fixture. An absolute
    // treasury floor no sealed campaign clears is unreachable regardless.
    const UNREACHABLE_CONDITION = { kind: "metric", metric: "treasury", atLeast: 999_999_999_999 };
    it("rule 4: a retime is not blamed for a reachability defect it may not touch — conditions and cast are preserved", () => {
        const replyId = positionReplyId(exemplar());
        const unreachable = ScenarioDef.parse({
            ...withRejoinderText(exemplar(), replyId, FLASH_FORWARD),
            conditions: [UNREACHABLE_CONDITION],
        });
        const revised = withRejoinderText(unreachable, replyId, CLEAN_REWRITE);
        // Reachability rides on `conditions`, unchanged from `unreachable` to
        // `revised`, so this must not be refused for a defect retiming cannot fix.
        expect(gate("scenario-retime", retimeItem(unreachable), revised).status).toBe("done");
    });
    it("rule 4, the other side: a regate IS held to reachability, because conditions is exactly what it changes", () => {
        const reachable = exemplar();
        const brokenGate = ScenarioDef.parse({ ...reachable, conditions: [UNREACHABLE_CONDITION] });
        const result = gate("scenario-regate", retimeItem(reachable), brokenGate);
        expect(result.status).toBe("failed");
        expect(result.error).toContain("never live on any of");
    });
    it("passes a regate that only moves conditions and boosts", () => {
        const original = exemplar();
        const regated = ScenarioDef.parse({ ...original, boosts: [{ source: "tension", factor: 1.2 }] });
        expect(gate("scenario-regate", retimeItem(original), regated).status).toBe("done");
    });
    // A bind re-points a shipped week at the condition that is actually running:
    // the locus follows the thing, the cast becomes the government bearing it, the
    // gate names the kind, and the beats trade a hard-coded state for the token.
    // What a bind may move is proven on the preservation contract itself
    // (`scenarios/retime.test.ts`); what it may not is proven here, because a
    // rewritten price is the failure a revision job exists to refuse.
    it("refuses a bind that rewrites a price, which is not its job", () => {
        const original = exemplar();
        const repriced = ScenarioDef.parse({ ...original, weight: original.weight + 0.5 });
        const result = gate("scenario-bind", retimeItem(original), repriced);
        expect(result.status).toBe("failed");
        expect(result.error).toContain('"weight" changed');
    });
    it("holds a bind to reachability, because the gate is exactly what it changes", () => {
        const original = exemplar();
        const nowhere = ScenarioDef.parse({ ...original, conditions: [UNREACHABLE_CONDITION] });
        const result = gate("scenario-bind", retimeItem(original), nowhere);
        expect(result.status).toBe("failed");
        expect(result.error).toContain("never live on any of");
    });
    it("both kinds fail closed on an item with no parseable original", () => {
        const orphan = { id: "orphan", payload: {} };
        expect(gate("scenario-retime", orphan, exemplar()).status).toBe("failed");
        expect(gate("scenario-regate", orphan, exemplar()).status).toBe("failed");
    });
});
