import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { auditScenarios, ScenarioDef } from "@admin/content";
import { JobFile } from "../jobs/job-file.js";
import { doneItems, OwnerAuthorizationSchema } from "../jobs/review-core.js";
import { needsUpgrade, selectUpgradeCandidates, upgradeCorpusContext, upgradeJob } from "./upgrade.js";
import { collectRetimeChanges, criticalCountdownUses, evaluateRetimeCeiling, measureNgramBaseline, retimeJob, selectRetimeCandidates, } from "./retime.js";
import { guardScenarioPublish, reviewPathsFor, SCENARIO_REVIEW } from "./review.js";
import { corpusPathsFor, readCorpusBodiesReporting, reviseInCorpus, writeCorpusManifest, } from "../corpus/shard-store.js";
import { harnessCorpus } from "../corpus/harness-corpus.js";
// The revision commands: every CLI-facing entry point that reads an existing
// shipped scenario, briefs one allowed change against it, and writes the
// result back over the corpus in place — `studio scenarios upgrade`,
// `upgrade-publish`, `retime` and `retime-report`. Moved out of cli.ts, which
// was at its 800-line-family ceiling, behavior-neutral for the upgrade half:
// every line below that predates this file is unchanged from cli.ts, only
// relocated. `cli.ts` re-exports the four command functions so nothing that
// imported them from there has to change its import.
const JOBS_DIR = path.join("content", "jobs");
const CORPUS_DIR = path.join("content", "corpus");
const REVIEWS_DIR = path.join("content", "reviews");
export const isError = (finding) => finding.severity === "error";
export const findingKey = (finding) => `${finding.kind}|${finding.scenario}|${finding.message}`;
export function printFindings(findings) {
    for (const finding of findings)
        console.log(`  ${finding.severity} ${finding.kind} [${finding.scenario}]: ${finding.message}`);
}
/**
 * The error-severity findings the published corpus already carries, judged
 * against itself with the same flag vocabulary the harness gate uses. This is
 * the baseline a new batch's own, newly-introduced errors are measured
 * against — a defect the corpus already ships is not this batch's fault.
 */
export async function existingCorpusErrors(paths) {
    const [read, harness] = await Promise.all([readCorpusBodiesReporting(paths), harnessCorpus(CORPUS_DIR)]);
    // The harness context lists every shipped id as installed, and the bodies are
    // those same scenarios, so auditing one against the other reported every id
    // in the corpus as appearing twice. Judge the corpus the way the revision
    // gate judges a revision: against the family and flag indexes only.
    const errors = auditScenarios(read.bodies, harness.scenarioFlags, upgradeCorpusContext(harness.scenarios)).filter(isError);
    return { bodies: read.bodies, errors, knownFlags: harness.scenarioFlags, unparseable: read.unparseable };
}
/** What `corpus stats` prints so a standing defect is visible on every run, not only at publish time. */
export async function reportCorpusHealth(paths) {
    const existing = await existingCorpusErrors(paths);
    if (existing.unparseable.length > 0) {
        console.log(`${existing.unparseable.length} shipped body(ies) the current schema no longer accepts, audited by nothing until they are fixed:`);
        for (const body of existing.unparseable)
            console.log(`  ${body.id} — ${body.reason}`);
    }
    if (existing.errors.length === 0)
        return;
    console.log(`corpus-wide audit: ${existing.errors.length} error finding(s) already in the published corpus:`);
    printFindings(existing.errors);
}
/**
 * Build an upgrade job over scenarios the corpus already holds.
 *
 * Selection is by what is actually missing rather than by a count, so a run
 * over a partly upgraded corpus picks up where the last one stopped and a
 * second run after a clean one writes an empty job rather than doing 303
 * scenarios of work twice. `--limit` exists for the pilot batch a human reads
 * before committing the rest.
 *
 * `--topic` and `--before` narrow the pending set further, after `needsUpgrade`
 * has already picked it: a run scoped to one topic or to content aging out by
 * a date is still only offered scenarios that actually need the pass, the
 * same convergence guarantee an unfiltered run has.
 */
export async function cmdUpgradeJob(id, driver, limit, topic, before) {
    const paths = corpusPathsFor(CORPUS_DIR);
    const read = await readCorpusBodiesReporting(paths);
    // Named rather than swallowed: a body that fails the current schema is a
    // defect somebody has to fix, and the one fix an upgrade run could apply on
    // its own is a rewrite of shipped prose, which is the thing this pass forbids.
    for (const stale of read.unparseable) {
        console.error(`skipped ${stale.id}: no longer parses against the current schema — ${stale.reason}`);
    }
    const allPending = read.bodies.filter(needsUpgrade);
    if (allPending.length === 0) {
        console.log("every scenario in the corpus already carries a context and its impacts — nothing to upgrade");
        return;
    }
    const selection = selectUpgradeCandidates(allPending, topic, before);
    if (before !== undefined && selection.undated > 0) {
        console.log(`--before excludes ${selection.undated} pending scenario(s) with no staleAfter to compare against ` +
            `(evergreen, or dated content missing its date) — they are not upgraded by this run`);
    }
    const pending = selection.pending;
    if (pending.length === 0) {
        console.log("nothing pending matches that selector — nothing to upgrade");
        return;
    }
    const items = limit === undefined ? pending : pending.slice(0, limit);
    const job = upgradeJob(id, driver, items);
    await mkdir(JOBS_DIR, { recursive: true });
    const file = path.join(JOBS_DIR, `${id}.json`);
    await writeFile(file, `${JSON.stringify(job, null, 2)}\n`, "utf8");
    console.log(`wrote ${file}: ${job.items.length} of ${pending.length} pending scenario(s), driver "${driver}"`);
}
/**
 * Write a finished upgrade, retime or regate run's output back over the
 * scenarios it revised.
 *
 * Separate from `corpus publish` because the two do opposite things to a
 * corpus — one appends what is new, one replaces what is there — and a flag on
 * publish that silently overwrote shipped bodies is the kind of convenience
 * that loses a corpus. Every body here has already cleared its revision gate
 * at the runner, preservation check included.
 *
 * `args` carries whatever followed the job id on the command line, so the
 * independence guard can read `--allow-provisional` the same way
 * `corpus publish` does. A self-reviewed batch with no owner authorization on
 * its `shipped.json` and no `--allow-provisional` is refused before anything
 * is written.
 */
export async function cmdUpgradePublish(id, args = []) {
    const paths = corpusPathsFor(CORPUS_DIR);
    const shippedPath = path.join(REVIEWS_DIR, id, "shipped.json");
    const shipped = z
        .object({
        scenarios: z.array(ScenarioDef),
        provisional: z.boolean().optional(),
        ownerAuthorization: OwnerAuthorizationSchema.nullable().optional(),
    })
        .parse(JSON.parse(await readFile(shippedPath, "utf8")));
    const guard = guardScenarioPublish(id, shipped.provisional, args, shipped.ownerAuthorization);
    if (!guard.ok) {
        for (const message of guard.messages)
            console.error(message);
        return 1;
    }
    for (const notice of guard.notices ?? [])
        console.log(notice);
    const outcome = await reviseInCorpus(paths, shipped.scenarios);
    if (outcome.missing.length > 0) {
        console.error(`${outcome.missing.length} id(s) the corpus does not hold, so nothing was written for them: ${outcome.missing.join(", ")}`);
        return 2;
    }
    await writeCorpusManifest(paths);
    console.log(`${id}: revised ${outcome.revised.length} scenario(s) in place`);
    // The union audit `corpus publish` runs asks what a batch introduces to the
    // pool it is joining, which is not the question here — these scenarios are
    // already in the pool. The corpus-wide health report is, and it runs over
    // the revised corpus rather than over a union this path never forms.
    await reportCorpusHealth(paths);
    return 0;
}
/**
 * Measure the §8 3-gram baseline over the corpus's commit-time fields as they
 * stand right now, and write it as JSON — to `outPath` if given, to stdout
 * otherwise. Run once, before any retime batch is drafted, so the ceiling in
 * `retime-report` compares a rewrite against the wave it started from rather
 * than against a corpus a sibling batch has already begun changing.
 */
export async function cmdRetimeBaseline(outPath) {
    const paths = corpusPathsFor(CORPUS_DIR);
    const read = await readCorpusBodiesReporting(paths);
    const baseline = measureNgramBaseline(read.bodies);
    const json = `${JSON.stringify(baseline, null, 2)}\n`;
    if (outPath === undefined) {
        console.log(json);
        return;
    }
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, json, "utf8");
    console.log(`wrote ${outPath}: ${Object.keys(baseline.grams).length} gram(s) over ${baseline.totalPassages} passage(s)`);
}
/**
 * Build a retime job over scenarios the corpus already ships with an
 * error-tier commit-time finding. `--shard` narrows to one scenario
 * class, matching the corpus's own shard-per-class layout, so a batch and its
 * review compare repetition against one shard rather than the whole pool.
 */
export async function cmdRetimeJob(id, driver, limit, shard) {
    const paths = corpusPathsFor(CORPUS_DIR);
    const read = await readCorpusBodiesReporting(paths);
    for (const stale of read.unparseable) {
        console.error(`skipped ${stale.id}: no longer parses against the current schema — ${stale.reason}`);
    }
    const candidates = selectRetimeCandidates(read.bodies, shard);
    if (candidates.length === 0) {
        console.log(shard
            ? `no scenario in shard "${shard}" carries an error-tier time finding — nothing to retime`
            : "no scenario in the corpus carries an error-tier time finding — nothing to retime");
        return;
    }
    const items = limit === undefined ? candidates : candidates.slice(0, limit);
    const job = retimeJob(id, driver, items);
    await mkdir(JOBS_DIR, { recursive: true });
    const file = path.join(JOBS_DIR, `${id}.json`);
    await writeFile(file, `${JSON.stringify(job, null, 2)}\n`, "utf8");
    console.log(`wrote ${file}: ${job.items.length} of ${candidates.length} flagged scenario(s), driver "${driver}"`);
}
/**
 * The batch report a retime review runs before it reads a single line: every
 * changed field with its before and after text, so a reviewer reads the
 * change rather than the whole scenario, and the §8 repetition ceiling over
 * the batch and the corpus it is joining. A failing report blocks the
 * publish — it exits non-zero rather than merely printing a warning, so a CI
 * step or a reviewer's own habit of checking `$?` cannot skip past it.
 */
export async function cmdRetimeReport(id, baseline) {
    const paths = reviewPathsFor(JOBS_DIR, REVIEWS_DIR, id);
    const jobText = await readFile(paths.jobPath, "utf8").catch(() => undefined);
    if (jobText === undefined) {
        console.log(`${id}: no job file at ${paths.jobPath}`);
        return 1;
    }
    const job = JobFile.parse(JSON.parse(jobText));
    const originalsByItemId = new Map(job.items.map((item) => [item.id, ScenarioDef.parse(item.payload.original)]));
    const done = await doneItems(SCENARIO_REVIEW, paths);
    const changes = [];
    const severityById = new Map();
    for (const [scenarioId, entry] of done) {
        const original = originalsByItemId.get(entry.itemId);
        if (!original)
            continue;
        severityById.set(scenarioId, entry.def.severity);
        changes.push(...collectRetimeChanges(original, entry.def));
    }
    if (changes.length === 0) {
        console.log(`${id}: nothing journaled done yet, or no field has actually changed — nothing to report`);
        return 1;
    }
    for (const change of changes) {
        console.log(`${change.scenarioId} — ${change.label}`);
        console.log(`  before: ${change.before}`);
        console.log(`  after:  ${change.after}`);
    }
    const report = evaluateRetimeCeiling(changes, baseline);
    console.log(`\n${report.changeCount} field(s) changed across ${done.size} scenario(s).`);
    const criticalUses = criticalCountdownUses(changes, (scenarioId) => severityById.get(scenarioId));
    if (criticalUses.length > 0) {
        console.log("countdown phrase(s) in a critical scenario (not refused by the gate — for the reviewer):");
        for (const line of criticalUses)
            console.log(`  ${line}`);
    }
    if (report.violations.length === 0) {
        console.log("3-gram ceiling: clear.");
        return 0;
    }
    console.log(`3-gram ceiling exceeded — ${report.violations.length} violation(s):`);
    for (const violation of report.violations)
        console.log(`  rule ${violation.rule}: ${violation.message}`);
    return 1;
}
