import { z } from "zod";
import { ConsequenceDef, NearDuplicateIndex, type ConsequenceCorpusContext } from "@admin/content";
import { type CorpusPaths } from "./shard-store.js";
export declare const ConsequenceSelector: z.ZodObject<{
    id: z.ZodString;
    instrument: z.ZodEnum<{
        diplomatic: "diplomatic";
        economic: "economic";
        covert: "covert";
        military: "military";
        assistance: "assistance";
    }>;
    rungBands: z.ZodArray<z.ZodEnum<{
        low: "low";
        high: "high";
        mid: "mid";
    }>>;
    valence: z.ZodEnum<{
        success: "success";
        partial: "partial";
        failure: "failure";
    }>;
    shard: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ConsequenceSelector = z.infer<typeof ConsequenceSelector>;
export declare const ConsequenceCorpusStats: z.ZodObject<{
    consequences: z.ZodNumber;
    shards: z.ZodNumber;
}, z.core.$strip>;
export type ConsequenceCorpusStats = z.infer<typeof ConsequenceCorpusStats>;
/** The consequence corpus lives beside the scenario one, under the same root convention. */
export declare function consequencePathsFor(corpusRoot: string): CorpusPaths;
export declare function readConsequenceIndex(paths: CorpusPaths): Promise<ConsequenceSelector[]>;
/** Every card the corpus holds, read from the shards. */
export declare function readConsequenceBodies(paths: CorpusPaths): Promise<ConsequenceDef[]>;
export declare function readConsequenceOverlapIndex(paths: CorpusPaths): Promise<NearDuplicateIndex>;
/** Everything the consequence audit needs to judge a batch against the pool it is joining. */
export declare function consequenceCorpusContext(paths: CorpusPaths): Promise<ConsequenceCorpusContext>;
/** Every flag the shipped cards stamp — the scenario gate's half of chain closure. */
export declare function consequenceCorpusFlags(paths: CorpusPaths): Promise<readonly string[]>;
export type ConsequencePublishOutcome = {
    readonly added: readonly string[];
    readonly skipped: readonly string[];
    readonly stats: ConsequenceCorpusStats;
};
/**
 * Append cards to the corpus, updating the index, the sketches and the flag
 * sidecar in the same pass. Ids already present are skipped rather than
 * duplicated, so re-publishing a batch is safe.
 */
export declare function publishConsequences(paths: CorpusPaths, defs: readonly ConsequenceDef[]): Promise<ConsequencePublishOutcome>;
export declare function consequenceCorpusStats(paths: CorpusPaths): Promise<ConsequenceCorpusStats>;
export declare function writeConsequenceManifest(paths: CorpusPaths): Promise<void>;
