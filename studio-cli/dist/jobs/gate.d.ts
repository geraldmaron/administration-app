import type { HarnessCorpus } from "../corpus/harness-corpus.js";
import type { ItemResult, JobItem } from "./driver.js";
export type JobGate = (item: JobItem, output: unknown, corpus?: HarnessCorpus) => string | undefined;
/** Every job kind that has a gate, which is every kind a job may be. */
export declare const GATED_JOB_KINDS: readonly string[];
/**
 * Apply the gate for a job kind to one driver result. A kind with no
 * registered gate fails closed: an unvalidated batch is never worth more than
 * no batch, and a new job kind should have to say how its output is checked.
 */
export declare function gateResult(kind: string, item: JobItem, result: ItemResult, corpus?: HarnessCorpus): ItemResult;
