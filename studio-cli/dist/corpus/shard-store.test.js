import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FIXTURE_SCENARIOS, auditScenarios } from "@admin/content";
import { corpusContext, corpusPathsFor, corpusStats, publishToCorpus, readBody, readCorpusIndex, } from "./shard-store.js";
// The corpus is the half of the system that has to survive five figures, so
// these are about what happens as it grows: bodies stay in shards, the index
// and the sketches stay small and loadable, and a new batch is judged against
// everything already in there without any of it being read back.
let root;
afterEach(async () => {
    if (root)
        await rm(root, { recursive: true, force: true });
    root = undefined;
});
async function stage() {
    root = await mkdtemp(path.join(tmpdir(), "corpus-"));
    return corpusPathsFor(root);
}
describe("publishing into the sharded corpus", () => {
    it("writes bodies to per-class shards and keeps the index beside them", async () => {
        const paths = await stage();
        const outcome = await publishToCorpus(paths, FIXTURE_SCENARIOS);
        expect(outcome.added).toHaveLength(FIXTURE_SCENARIOS.length);
        expect(outcome.stats.scenarios).toBe(FIXTURE_SCENARIOS.length);
        // One class per scenario in this pack, so one shard each.
        expect(outcome.stats.shards).toBe(new Set(FIXTURE_SCENARIOS.map((def) => def.class)).size);
        const index = await readCorpusIndex(paths);
        expect(index).toHaveLength(FIXTURE_SCENARIOS.length);
        for (const selector of index) {
            expect(selector.shard).toMatch(/\.jsonl$/);
            // The index is the selector alone — a body in it would defeat the point.
            expect(selector).not.toHaveProperty("opening");
        }
    });
    it("reads one body back by id without loading the rest", async () => {
        const paths = await stage();
        await publishToCorpus(paths, FIXTURE_SCENARIOS);
        const index = await readCorpusIndex(paths);
        const wanted = index[2];
        const body = await readBody(paths, wanted);
        expect(body?.id).toBe(wanted.id);
        expect(body?.opening.length).toBeGreaterThan(0);
    });
    it("is idempotent: re-publishing a batch adds nothing and duplicates nothing", async () => {
        const paths = await stage();
        await publishToCorpus(paths, FIXTURE_SCENARIOS);
        const again = await publishToCorpus(paths, FIXTURE_SCENARIOS);
        expect(again.added).toEqual([]);
        expect(again.skipped).toHaveLength(FIXTURE_SCENARIOS.length);
        expect((await corpusStats(paths)).scenarios).toBe(FIXTURE_SCENARIOS.length);
    });
    it("rolls to a new shard once one fills, so no single file grows without bound", async () => {
        const paths = await stage();
        const many = Array.from({ length: 1200 }, (_, i) => ({ ...FIXTURE_SCENARIOS[0], id: `bulk-${i}` }));
        const outcome = await publishToCorpus(paths, many);
        expect(outcome.added).toHaveLength(1200);
        // 500 to a shard.
        expect(outcome.stats.shards).toBe(3);
        // This test is about where the rows land, not how fast they get there, and
        // 1,200 scenarios of deliberately identical prose is the worst input the
        // near-duplicate index can be given — identical prose really does contain
        // quadratically many duplicate pairs. It runs to about five seconds, which
        // is exactly vitest's default, so it failed or passed on machine load
        // rather than on behavior. The budget is stated instead of defaulted.
    }, 30_000);
});
describe("the corpus as the context a new batch is judged against", () => {
    it("hands the audit indexes, not content — no body is read to build it", async () => {
        const paths = await stage();
        await publishToCorpus(paths, FIXTURE_SCENARIOS);
        const context = await corpusContext(paths);
        expect([...(context.installedIds ?? [])]).toHaveLength(FIXTURE_SCENARIOS.length);
        // A reprint of a shipped scenario under a fresh id: invisible to a
        // batch-local check, caught against the corpus.
        const reprint = [{ ...FIXTURE_SCENARIOS[0], id: "brand-new-id" }];
        expect(auditScenarios(reprint).some((f) => f.kind === "template-overlap")).toBe(false);
        expect(auditScenarios(reprint, [], context).some((f) => f.kind === "template-overlap")).toBe(true);
    });
    it("refuses an id the corpus already holds", async () => {
        const paths = await stage();
        await publishToCorpus(paths, FIXTURE_SCENARIOS);
        const context = await corpusContext(paths);
        const clash = [FIXTURE_SCENARIOS[0]];
        expect(auditScenarios(clash, [], context).some((f) => f.kind === "duplicate-scenario-id")).toBe(true);
    });
    it("keeps the resident index far smaller than the bodies it indexes", async () => {
        const paths = await stage();
        const many = Array.from({ length: 500 }, (_, i) => ({ ...FIXTURE_SCENARIOS[i % FIXTURE_SCENARIOS.length], id: `bulk-${i}` }));
        await publishToCorpus(paths, many);
        const indexBytes = (await readFile(paths.indexPath, "utf8")).length;
        const shardBytes = (await Promise.all((await readCorpusIndex(paths)).map(async (s) => (await readFile(path.join(paths.shardsDir, s.shard), "utf8")).length))).reduce((a, b) => a + b, 0);
        expect(indexBytes * 4).toBeLessThan(shardBytes);
    });
});
describe("the read side of the flag sidecar", () => {
    it("records what each published scenario waits on, and corpusContext serves it", async () => {
        const paths = await stage();
        const waiting = {
            ...FIXTURE_SCENARIOS[0],
            id: "scn-waits",
            conditions: [{ kind: "flag", flag: "an-earlier-deed", is: true }],
        };
        await publishToCorpus(paths, [waiting]);
        const context = await corpusContext(paths);
        expect([...(context.readFlags ?? [])]).toContain("an-earlier-deed");
    });
    it("backfills an older sidecar that predates the read side, once, from the bodies", async () => {
        const paths = await stage();
        const waiting = {
            ...FIXTURE_SCENARIOS[0],
            id: "scn-waits-old",
            conditions: [{ kind: "flag", flag: "a-deed-of-record", is: true }],
        };
        await publishToCorpus(paths, [waiting]);
        // Strip the sidecar back to the pre-reads shape.
        const stripped = (await readFile(paths.flagsPath, "utf8"))
            .split("\n")
            .filter(Boolean)
            .map((line) => {
            const { id, sets } = JSON.parse(line);
            return `${JSON.stringify({ id, sets })}\n`;
        })
            .join("");
        const { writeFile } = await import("node:fs/promises");
        await writeFile(paths.flagsPath, stripped, "utf8");
        const context = await corpusContext(paths);
        expect([...(context.readFlags ?? [])]).toContain("a-deed-of-record");
        // The rebuild is persisted, so the expensive read happens once.
        expect((await readFile(paths.flagsPath, "utf8"))).toContain('"reads"');
    });
    it("keeps a negative wait out of the read side: reading a flag's absence keeps no promise", async () => {
        const paths = await stage();
        const refusing = {
            ...FIXTURE_SCENARIOS[0],
            id: "scn-waits-not",
            conditions: [{ kind: "flag", flag: "a-road-not-taken", is: false }],
        };
        await publishToCorpus(paths, [refusing]);
        const context = await corpusContext(paths);
        expect([...(context.readFlags ?? [])]).not.toContain("a-road-not-taken");
    });
});
