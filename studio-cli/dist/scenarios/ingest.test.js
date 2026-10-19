import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cmdRun } from "../cli.js";
import { defectsFrom, planCells, readHeader } from "./ingest.js";
import { finishJob, ingestFile } from "./kit-commands.js";
import { KIT_KIND } from "./kit.js";
import { referenceScenarios } from "./reference.js";
const VERSION = "abc123def456";
// One reference scenario that clears the whole gate, and the same scenario
// broken in two ways a careless author would break it.
const good = () => {
    const def = structuredClone(referenceScenarios().find((s) => s.id === "the-berth-they-will-not-open"));
    return { ...def, id: "the-berth-kit-test" };
};
const broken = () => {
    const def = good();
    return {
        ...def,
        id: "the-berth-kit-test-broken",
        class: "economy",
        replies: def.replies.map((reply, index) => (index === 0 ? { ...reply, tone: "pragmatic" } : reply)),
    };
};
const file = (scenarios, kitVersion = VERSION) => ({ kind: KIT_KIND, kitVersion, author: "test", scenarios });
describe("reading a kit file", () => {
    it("refuses a stale kit and says to regenerate it", () => {
        const header = readHeader(file([good()], "000000000000"), VERSION);
        expect(header.ok).toBe(false);
        expect(!header.ok && header.reason).toMatch(/stale kit.*Regenerate the kit/);
    });
    it("refuses a bare array as not written against the kit", () => {
        const header = readHeader([good()], VERSION);
        expect(!header.ok && header.reason).toMatch(/not a scenario kit file/);
    });
    it("sorts scenarios into cells and refuses what cannot be placed", () => {
        const { cells, refused } = planCells([
            good(),
            broken(),
            { ...good(), id: "set-piece", cast: { pick: "nation", nation: "FRA" } },
            { ...good() },
        ]);
        expect(cells.map((cell) => [cell.key, cell.ids])).toEqual([
            ["foreign-crisis:tensest:serious", ["the-berth-kit-test"]],
            ["economy:tensest:serious", ["the-berth-kit-test-broken"]],
        ]);
        expect(refused.map((refusal) => refusal.index)).toEqual([2, 3]);
        expect(refused[0]?.reason).toMatch(/set-piece/);
        expect(refused[1]?.reason).toMatch(/appears earlier/);
    });
    it("keeps a family in one cell however many classes, casts and severities its members span", () => {
        const member = (id, role, over) => ({ ...good(), id, family: { id: "arc-test", role }, ...over });
        const { cells, refused } = planCells([
            member("arc-close", "close", { class: "economy", severity: "routine" }),
            member("arc-open", "opener", { severity: "critical" }),
            member("arc-beat", "beat", { cast: { pick: "closest" } }),
            good(),
        ]);
        expect(refused).toEqual([]);
        expect(cells.map((cell) => [cell.key, cell.ids])).toEqual([
            ["arc:arc-test", ["arc-close", "arc-open", "arc-beat"]],
            ["foreign-crisis:tensest:serious", ["the-berth-kit-test"]],
        ]);
        expect(cells[0].spec).toMatchObject({ class: "foreign-crisis", severity: "critical", cast: "tensest", arc: true, count: 3 });
    });
    it("names the scenario a shape error belongs to", () => {
        const defects = defectsFrom({ shapeErrors: ["1.replies.0.tone: Invalid option"], findings: [], binding: [] }, ["a", "b"]);
        expect(defects).toEqual([{ scenario: "b", severity: "error", kind: "shape", message: "1.replies.0.tone: Invalid option" }]);
    });
});
describe("ingesting a kit file", () => {
    let dir;
    let deps;
    beforeEach(async () => {
        dir = await mkdtemp(path.join(os.tmpdir(), "kit-ingest-"));
        deps = {
            jobsDir: path.join(dir, "jobs"),
            corpusDir: path.join(dir, "corpus"),
            inboxDir: path.join(dir, "inbox"),
            run: (jobId) => cmdRun(jobId, { jobsDir: path.join(dir, "jobs"), ledgerDir: path.join(dir, "ledger"), env: {} }),
            kitVersion: () => VERSION,
        };
    });
    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });
    it("refuses a stale file without creating a job", async () => {
        const source = path.join(dir, "stale.json");
        await writeFile(source, JSON.stringify(file([good()], "000000000000")));
        const result = await ingestFile(source, deps);
        expect(result.code).toBe(2);
        expect(result.text).toMatch(/stale kit/);
        expect(existsSync(deps.jobsDir)).toBe(false);
    });
    it("passes a known-good scenario and returns a broken one with named findings", async () => {
        const source = path.join(dir, "batch.json");
        await writeFile(source, JSON.stringify(file([good(), broken()])));
        const result = await ingestFile(source, deps);
        expect(result.code).toBe(1);
        const cells = result.report?.cells ?? [];
        expect(cells.find((cell) => cell.ids.includes("the-berth-kit-test"))?.passed).toBe(true);
        const returned = cells.find((cell) => cell.ids.includes("the-berth-kit-test-broken"));
        expect(returned?.passed).toBe(false);
        expect(returned?.defects.some((defect) => defect.scenario === "the-berth-kit-test-broken" && defect.severity === "error")).toBe(true);
        const pasteBack = await readFile(result.pasteBack, "utf8");
        expect(pasteBack).toContain("### the-berth-kit-test-broken");
        expect(pasteBack).toContain("Accepted, do not send again: the-berth-kit-test.");
        expect(await finishJob(result.report.jobId, deps)).toMatch(/source moved/);
        expect(existsSync(source)).toBe(false);
        expect(existsSync(path.join(deps.jobsDir, "work", result.report.jobId))).toBe(false);
        expect(existsSync(result.pasteBack)).toBe(true);
    });
});
