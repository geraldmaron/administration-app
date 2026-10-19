import { readFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { JobFile, progressEntryOf } from "./job-file.js";
import { gateResult } from "./gate.js";
export function pathsFor(jobsDir, ledgerDir, jobId) {
    return {
        jobPath: path.join(jobsDir, `${jobId}.json`),
        progressPath: path.join(jobsDir, `${jobId}.progress.jsonl`),
        ledgerPath: path.join(ledgerDir, "spend.jsonl"),
    };
}
export async function readCompletedItemIds(progressPath) {
    if (!existsSync(progressPath))
        return new Set();
    const raw = await readFile(progressPath, "utf8");
    const completed = new Set();
    for (const line of raw.split("\n")) {
        if (!line.trim())
            continue;
        const entry = progressEntryOf(JSON.parse(line));
        if (entry?.status === "done")
            completed.add(entry.itemId);
    }
    return completed;
}
/**
 * Everything this job has already cost, across every previous run.
 *
 * Counted from the journal rather than from this process's own tally, because
 * a budget that resets when a run is interrupted is not a budget. Failed items
 * count too: a rejected generation costs exactly as much as an accepted one.
 */
export async function readJournaledSpend(progressPath) {
    if (!existsSync(progressPath))
        return 0;
    const raw = await readFile(progressPath, "utf8");
    let spent = 0;
    for (const line of raw.split("\n")) {
        if (!line.trim())
            continue;
        spent += progressEntryOf(JSON.parse(line))?.spendUsd ?? 0;
    }
    return spent;
}
async function appendJsonLine(filePath, value) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}
/**
 * What one item is assumed to risk when nothing better is known. Exported
 * because the spend gate prices a run against the same number the ceiling
 * check uses — an authorization recorded against one estimate and enforced
 * against another is two different promises wearing one name.
 */
export const DEFAULT_WORST_CASE_ITEM_USD = 0.1;
/**
 * Runs a job file to completion, resuming from the progress journal: any item
 * already recorded "done" is skipped and never re-spent. A driver reporting
 * "failed" for an item does not mark it done, so a later resume retries it.
 *
 * Every result passes the publish gate (gate.ts) before it can be journaled
 * done — including results a driver already called clean. Spend is still
 * recorded for a gate-rejected item: the money left regardless of whether the
 * output was worth keeping, and a ledger that hid that would understate cost.
 *
 * `options.budgetUsd` is a hard ceiling across every run of this job, read
 * from the journal rather than from this process, so an interrupted run
 * resumes into the same budget instead of a fresh one.
 */
export async function runJob(paths, driver, corpus, options = {}) {
    const job = JobFile.parse(JSON.parse(await readFile(paths.jobPath, "utf8")));
    const completed = await readCompletedItemIds(paths.progressPath);
    const priorSpendUsd = await readJournaledSpend(paths.progressPath);
    const worstCaseItemUsd = options.worstCaseItemUsd ?? DEFAULT_WORST_CASE_ITEM_USD;
    const skipped = [];
    const ran = [];
    const failed = [];
    const failedReasons = {};
    const warned = {};
    const haltedForBudget = [];
    let totalSpendUsd = 0;
    for (const item of job.items) {
        // A done item is normally never re-read: the journal is what stops a job
        // from paying twice for the same output. `recheck` is the exception a
        // review pass needs — an output edited after it was journaled is not the
        // output the gate blessed, and without this the correction ships unchecked.
        // The caller is responsible for only offering it where re-running an item
        // costs nothing.
        if (completed.has(item.id) && !options.recheck) {
            skipped.push(item.id);
            continue;
        }
        // Checked before the item runs and against its worst case, so the ceiling
        // is one the job stops under rather than one it discovers it has passed.
        if (options.budgetUsd !== undefined) {
            const committed = priorSpendUsd + totalSpendUsd;
            if (committed + worstCaseItemUsd > options.budgetUsd) {
                haltedForBudget.push(item.id);
                continue;
            }
        }
        const result = gateResult(job.kind, item, await driver.runItem(item), corpus);
        const entry = {
            itemId: item.id,
            status: result.status,
            spendUsd: result.spendUsd,
            timestamp: new Date().toISOString(),
            ...(result.error ? { error: result.error } : {}),
            ...(result.producer ? { producer: result.producer } : {}),
        };
        await appendJsonLine(paths.progressPath, entry);
        await appendJsonLine(paths.ledgerPath, { jobId: job.id, driver: driver.name, ...entry });
        // Counted whatever the outcome: a rejected generation cost exactly as much
        // as an accepted one, and a total that only added up the successes would
        // report a batch of failures as free.
        totalSpendUsd += result.spendUsd;
        if (result.status === "done") {
            ran.push(item.id);
            if (result.warnings)
                warned[item.id] = result.warnings;
        }
        else {
            failed.push(item.id);
            failedReasons[item.id] = result.error ?? "no reason reported";
        }
    }
    return {
        jobId: job.id,
        skipped,
        ran,
        failed,
        failedReasons,
        warned,
        totalSpendUsd,
        lifetimeSpendUsd: priorSpendUsd + totalSpendUsd,
        haltedForBudget,
    };
}
