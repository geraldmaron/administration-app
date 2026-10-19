import type { HarnessCorpus } from "../corpus/harness-corpus.js";
import type { JobDriver } from "./driver.js";
export type RunPaths = {
    jobPath: string;
    progressPath: string;
    ledgerPath: string;
};
export declare function pathsFor(jobsDir: string, ledgerDir: string, jobId: string): RunPaths;
export declare function readCompletedItemIds(progressPath: string): Promise<Set<string>>;
/**
 * Everything this job has already cost, across every previous run.
 *
 * Counted from the journal rather than from this process's own tally, because
 * a budget that resets when a run is interrupted is not a budget. Failed items
 * count too: a rejected generation costs exactly as much as an accepted one.
 */
export declare function readJournaledSpend(progressPath: string): Promise<number>;
export type RunSummary = {
    jobId: string;
    skipped: string[];
    ran: string[];
    failed: string[];
    failedReasons: Record<string, string>;
    /** Warning counts for items that passed the gate, by item id. Clean items are absent. */
    warned: Record<string, number>;
    totalSpendUsd: number;
    /** Everything this job has cost across every run, not just this one. */
    lifetimeSpendUsd: number;
    /**
     * Items left unrun because the budget ceiling was reached. Named rather than
     * counted: a run that stops early has to say what it did not do, or a
     * partial batch reads as a complete one.
     */
    haltedForBudget: string[];
};
export type RunOptions = {
    /**
     * A hard ceiling on what this job may ever cost, in USD, across all runs.
     *
     * Enforced before each item rather than after: an item is only started if
     * its worst-case cost still fits, so the ceiling cannot be overshot by the
     * one request that crosses it. Omitted means no ceiling — which is the right
     * default for a job whose cost is already known, and the wrong one for
     * anything generating images.
     */
    readonly budgetUsd?: number;
    /**
     * The most a single item is expected to cost. The ceiling check needs to
     * know what it is about to risk, and no driver can report that until after
     * it has spent it.
     */
    readonly worstCaseItemUsd?: number;
    /**
     * Re-run items the journal already records done, so an output edited after
     * it was journaled goes back through the gate. Only safe on a driver that
     * re-reads a file it did not pay for; a driver that would regenerate the
     * item spends the whole job again.
     */
    readonly recheck?: boolean;
};
/**
 * What one item is assumed to risk when nothing better is known. Exported
 * because the spend gate prices a run against the same number the ceiling
 * check uses — an authorization recorded against one estimate and enforced
 * against another is two different promises wearing one name.
 */
export declare const DEFAULT_WORST_CASE_ITEM_USD = 0.1;
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
export declare function runJob(paths: RunPaths, driver: JobDriver, corpus?: HarnessCorpus, options?: RunOptions): Promise<RunSummary>;
