import { type ScenarioDef as ScenarioDefType } from "@admin/content";
/** One shipped scenario the schema refused, and why. */
export type ShardDrop = {
    /** 1-based line in the shard body, so a finding names somewhere to look. */
    readonly line: number;
    /** The document's own id when it had a readable one, `?` when it did not. */
    readonly id: string;
    readonly issue: string;
};
export type ShardBody = {
    readonly scenarios: readonly ScenarioDefType[];
    /**
     * Lines this build could not read. Empty for every shard that cleared the
     * content gate against this schema; anything else means the corpus and the
     * binary disagree, and the disagreement is costing playable scenarios.
     */
    readonly drops: readonly ShardDrop[];
};
/**
 * A shard is JSONL: one scenario document per line, which is what the corpus
 * writes and what lets a shard be appended to without rewriting it.
 *
 * Every line is parsed through the schema rather than cast, and a refused
 * line is returned beside the scenarios that survived rather than discarded
 * quietly — a dropped line is a scenario somebody wrote and nobody will ever
 * be dealt, and the only thing worse than losing it is losing it silently.
 */
export declare function parseShardBody(text: string): ShardBody;
