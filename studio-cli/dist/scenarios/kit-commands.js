import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { corpusDeeds, corpusPathsFor } from "../corpus/shard-store.js";
import { readCompletedItemIds } from "../jobs/runner.js";
import { scenarioJob } from "./brief.js";
import { defectsFrom, formatPasteBack, formatReport, needsPasteBack, planCells, readHeader, } from "./ingest.js";
import { currentKitVersion, writeKit } from "./kit.js";
import { writePlayerBundle } from "../corpus/player-bundle.js";
export const DEFAULT_INGEST_DIRS = {
    jobsDir: path.join("content", "jobs"),
    corpusDir: path.join("content", "corpus"),
    inboxDir: path.join("content", "inbox"),
};
export const DEFAULT_KIT_DIR = path.join("content", "kit");
const Manifest = z.object({
    source: z.string(),
    kitVersion: z.string(),
    author: z.string().optional(),
    cells: z.array(z.object({ itemId: z.string(), cell: z.string(), ids: z.array(z.string()) })),
    refused: z.array(z.object({ index: z.number(), id: z.string().optional(), reason: z.string() })),
});
const manifestPath = (deps, jobId) => path.join(deps.jobsDir, `${jobId}.ingest.json`);
/** Same file, same job: re-ingesting re-gates the outputs already in the work directory. */
export function ingestJobId(file, bytes) {
    const stem = path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
    return `ingest-${stem || "batch"}-${digest}`;
}
async function writeJob(jobId, cells, deps) {
    const deeds = await corpusDeeds(corpusPathsFor(deps.corpusDir));
    const job = scenarioJob(jobId, "session", cells.map((cell) => cell.spec), undefined, deeds);
    const workDir = path.join(deps.jobsDir, "work", jobId);
    await mkdir(workDir, { recursive: true });
    await writeFile(path.join(deps.jobsDir, `${jobId}.json`), `${JSON.stringify(job, null, 2)}\n`, "utf8");
    return await Promise.all(job.items.map(async (item, index) => {
        const cell = cells[index];
        await writeFile(path.join(workDir, `${item.id}.out.json`), `${JSON.stringify(cell.scenarios, null, 2)}\n`, "utf8");
        return { itemId: item.id, cell: cell.key, ids: [...cell.ids] };
    }));
}
async function outcomes(jobId, manifest, deps) {
    const done = await readCompletedItemIds(path.join(deps.jobsDir, `${jobId}.progress.jsonl`));
    const workDir = path.join(deps.jobsDir, "work", jobId);
    return await Promise.all(manifest.cells.map(async (cell) => {
        const findingsPath = path.join(workDir, `${cell.itemId}.findings.json`);
        const findings = existsSync(findingsPath) ? JSON.parse(await readFile(findingsPath, "utf8")) : undefined;
        const output = JSON.parse(await readFile(path.join(workDir, `${cell.itemId}.out.json`), "utf8"));
        const defects = defectsFrom(findings, cell.ids, Array.isArray(output) ? output : []);
        return { ...cell, passed: done.has(cell.itemId), defects };
    }));
}
async function prepare(file, bytes, jobId, deps) {
    if (existsSync(manifestPath(deps, jobId))) {
        return Manifest.parse(JSON.parse(await readFile(manifestPath(deps, jobId), "utf8")));
    }
    if (existsSync(path.join(deps.jobsDir, `${jobId}.json`)))
        return `job ${jobId} already exists and is not an ingest job — pass another --job`;
    let raw;
    try {
        raw = JSON.parse(bytes);
    }
    catch (error) {
        return `unreadable JSON in ${file}: ${error instanceof Error ? error.message : String(error)}`;
    }
    const header = readHeader(raw, (deps.kitVersion ?? currentKitVersion)());
    if (!header.ok)
        return header.reason;
    const { cells, refused } = planCells(header.scenarios);
    const manifest = {
        source: path.resolve(file),
        kitVersion: header.kitVersion,
        ...(header.author ? { author: header.author } : {}),
        cells: cells.length > 0 ? await writeJob(jobId, cells, deps) : [],
        refused: [...refused],
    };
    await mkdir(deps.jobsDir, { recursive: true });
    await writeFile(manifestPath(deps, jobId), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return manifest;
}
export async function ingestFile(file, deps, jobOverride) {
    if (!existsSync(file))
        return { code: 2, text: `no such file: ${file}` };
    const bytes = await readFile(file, "utf8");
    const jobId = jobOverride ?? ingestJobId(file, bytes);
    const manifest = await prepare(file, bytes, jobId, deps);
    if (typeof manifest === "string")
        return { code: 2, text: `REFUSED ${file}: ${manifest}` };
    if (manifest.cells.length > 0)
        await deps.run(jobId);
    const report = {
        source: path.basename(manifest.source),
        jobId,
        kitVersion: manifest.kitVersion,
        ...(manifest.author ? { author: manifest.author } : {}),
        cells: await outcomes(jobId, manifest, deps),
        refused: manifest.refused,
    };
    let pasteBack;
    if (needsPasteBack(report)) {
        const returnedDir = path.join(deps.inboxDir, "returned");
        await mkdir(returnedDir, { recursive: true });
        pasteBack = path.join(returnedDir, `${path.basename(manifest.source, path.extname(manifest.source))}.${jobId}.findings.md`);
        await writeFile(pasteBack, formatPasteBack(report), "utf8");
    }
    const code = needsPasteBack(report) ? 1 : 0;
    return { code, report, text: formatReport(report, pasteBack), ...(pasteBack ? { pasteBack } : {}) };
}
/**
 * Remove a session job's workspace once its scenarios are published or
 * returned. For an ingest job, also file the dropped source under
 * `processed/`. The review record under content/reviews and any findings
 * returned to the author are kept: they are the batch's history.
 */
export async function finishJob(jobId, deps) {
    if (!existsSync(path.join(deps.jobsDir, `${jobId}.json`)) && !existsSync(manifestPath(deps, jobId))) {
        throw new Error(`no job ${jobId} in ${deps.jobsDir}`);
    }
    const lines = [`${jobId}: job workspace removed`];
    if (existsSync(manifestPath(deps, jobId))) {
        const manifest = Manifest.parse(JSON.parse(await readFile(manifestPath(deps, jobId), "utf8")));
        const processedDir = path.resolve(deps.inboxDir, "processed");
        if (existsSync(manifest.source) && path.dirname(manifest.source) !== processedDir) {
            await mkdir(processedDir, { recursive: true });
            const target = path.join(processedDir, `${jobId}${path.extname(manifest.source)}`);
            await rename(manifest.source, target);
            lines.push(`  source moved to ${target}`);
        }
    }
    for (const suffix of [".json", ".progress.jsonl", ".ingest.json"])
        await rm(path.join(deps.jobsDir, `${jobId}${suffix}`), { force: true });
    await rm(path.join(deps.jobsDir, "work", jobId), { recursive: true, force: true });
    return lines.join("\n");
}
/**
 * The bake, and the kit rewritten from it in the same step: the kit's corpus
 * listing, deeds and needs are read off the bake, so the two are committed
 * together or the kit-current gate refuses the tree.
 */
export async function bakeWithKit(outDir, manifest) {
    const bundle = await writePlayerBundle(process.cwd(), outDir, manifest);
    const kit = await writeKit(DEFAULT_KIT_DIR, process.cwd());
    console.log(`authoring kit ${kit.version} rewritten in ${DEFAULT_KIT_DIR}`);
    return bundle;
}
export async function cmdKitGroup(command, rest, cli) {
    const args = [...rest];
    const deps = { ...DEFAULT_INGEST_DIRS, run: cli.run };
    const flag = cli.takeFlag;
    if (command === "kit") {
        const out = flag(args, "--out") ?? DEFAULT_KIT_DIR;
        const kit = await writeKit(out);
        console.log(`kit ${kit.version}: ${Object.keys(kit.files).length} file(s) in ${out}`);
        return 0;
    }
    if (command === "ingest") {
        const job = flag(args, "--job");
        const [file] = args;
        if (!file)
            throw new Error("usage: studio scenarios ingest <file> [--job <id>]");
        const result = await ingestFile(file, deps, job);
        console.log(result.text);
        return result.code;
    }
    const [jobId] = args;
    if (!jobId)
        throw new Error("usage: studio scenarios finish <jobId>");
    console.log(await finishJob(jobId, deps));
    return 0;
}
