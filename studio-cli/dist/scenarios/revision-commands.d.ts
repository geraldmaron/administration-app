import { ScenarioDef, ScenarioTopicTag, type ScenarioFinding } from "@admin/content";
import { JobFile } from "../jobs/job-file.js";
import { type NgramBaseline } from "./retime.js";
import { type CorpusPaths } from "../corpus/shard-store.js";
export declare const isError: (finding: ScenarioFinding) => boolean;
export declare const findingKey: (finding: ScenarioFinding) => string;
export declare function printFindings(findings: readonly ScenarioFinding[]): void;
/**
 * The error-severity findings the published corpus already carries, judged
 * against itself with the same flag vocabulary the harness gate uses. This is
 * the baseline a new batch's own, newly-introduced errors are measured
 * against — a defect the corpus already ships is not this batch's fault.
 */
export declare function existingCorpusErrors(paths: CorpusPaths): Promise<{
    readonly bodies: readonly ScenarioDef[];
    readonly errors: readonly ScenarioFinding[];
    readonly knownFlags: readonly string[];
    readonly unparseable: readonly {
        id: string;
        reason: string;
    }[];
}>;
/** What `corpus stats` prints so a standing defect is visible on every run, not only at publish time. */
export declare function reportCorpusHealth(paths: CorpusPaths): Promise<void>;
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
export declare function cmdUpgradeJob(id: string, driver: JobFile["driver"], limit?: number, topic?: ScenarioTopicTag, before?: string): Promise<void>;
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
export declare function cmdUpgradePublish(id: string, args?: readonly string[]): Promise<number>;
/**
 * Measure the §8 3-gram baseline over the corpus's commit-time fields as they
 * stand right now, and write it as JSON — to `outPath` if given, to stdout
 * otherwise. Run once, before any retime batch is drafted, so the ceiling in
 * `retime-report` compares a rewrite against the wave it started from rather
 * than against a corpus a sibling batch has already begun changing.
 */
export declare function cmdRetimeBaseline(outPath?: string): Promise<void>;
/**
 * Build a retime job over scenarios the corpus already ships with an
 * error-tier commit-time finding. `--shard` narrows to one scenario
 * class, matching the corpus's own shard-per-class layout, so a batch and its
 * review compare repetition against one shard rather than the whole pool.
 */
export declare function cmdRetimeJob(id: string, driver: JobFile["driver"], limit?: number, shard?: string): Promise<void>;
/**
 * The batch report a retime review runs before it reads a single line: every
 * changed field with its before and after text, so a reviewer reads the
 * change rather than the whole scenario, and the §8 repetition ceiling over
 * the batch and the corpus it is joining. A failing report blocks the
 * publish — it exits non-zero rather than merely printing a warning, so a CI
 * step or a reviewer's own habit of checking `$?` cannot skip past it.
 */
export declare function cmdRetimeReport(id: string, baseline: NgramBaseline): Promise<number>;
