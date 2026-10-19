import { z } from "zod";
import { NearDuplicateIndex, ScenarioDef, ScenarioSelector, type CorpusContext } from "@admin/content";
export declare const CorpusStats: z.ZodObject<{
    scenarios: z.ZodNumber;
    shards: z.ZodNumber;
}, z.core.$strip>;
export type CorpusStats = z.infer<typeof CorpusStats>;
export type CorpusPaths = {
    readonly root: string;
    readonly shardsDir: string;
    readonly indexPath: string;
    readonly overlapPath: string;
    readonly flagsPath: string;
    readonly phrasesPath: string;
};
/**
 * The layout under any root. Both corpora — scenarios and consequences — are
 * the same three files beside a shard directory, so the store is parameterized
 * by root rather than forked per content type.
 */
export declare function corpusPathsFor(root: string): CorpusPaths;
/**
 * Runs the shipped corpus already carries, for `stock-phrasing`.
 *
 * Built on first use from the bodies when the sidecar is absent, the way
 * `scenarioFlagEntries` backfills the read half of the flag index. A corpus
 * published without the sidecar would otherwise gate as if it carried no
 * phrasing at all — silently permissive, which is the worst way for a gate to
 * fail. The expensive read the sidecar exists to avoid is paid once per
 * corpus, not once per run.
 */
export declare function readPhraseCarriers(paths: CorpusPaths): Promise<[string, number][]>;
/** Rebuild the phrase index from bodies already in hand. */
export declare function writePhraseCarriers(paths: CorpusPaths, bodies: readonly ScenarioDef[]): Promise<number>;
export declare const FlagEntry: z.ZodObject<{
    id: z.ZodString;
    sets: z.ZodArray<z.ZodString>;
    reads: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type FlagEntry = z.infer<typeof FlagEntry>;
export declare function readFlagEntries(paths: CorpusPaths): Promise<FlagEntry[]>;
export declare function readCorpusIndex(paths: CorpusPaths): Promise<ScenarioSelector[]>;
/** The overlap index for the whole corpus, rebuilt from sketches — no body is read. */
export declare function readOverlapIndex(paths: CorpusPaths): Promise<NearDuplicateIndex>;
/** Everything the audit needs to judge a batch against the corpus it is landing in. */
export declare function corpusContext(paths: CorpusPaths): Promise<CorpusContext>;
export type PublishOutcome = {
    readonly added: readonly string[];
    readonly skipped: readonly string[];
    readonly stats: CorpusStats;
};
/**
 * Append scenarios to the corpus, updating the index and the overlap sketches
 * in the same pass. Ids already present are skipped rather than duplicated, so
 * re-publishing a batch is safe.
 */
export declare function publishToCorpus(paths: CorpusPaths, defs: readonly ScenarioDef[]): Promise<PublishOutcome>;
export type CorpusRead = {
    readonly bodies: readonly ScenarioDef[];
    /** Ids on disk that no longer parse, with the first reason each fails. */
    readonly unparseable: readonly {
        readonly id: string;
        readonly reason: string;
    }[];
};
/**
 * The same read as `readCorpusBodies`, except that a body which no longer
 * parses is reported rather than thrown on.
 *
 * A shipped corpus can stop parsing without anybody touching it: a ceiling
 * tightened after the fact makes bodies that were valid when they were written
 * invalid now. The strict read is right for the audit, which must not reason
 * about a pool it cannot fully see. It is wrong for a maintenance pass, where
 * throwing means nine stale labels block work on the other 294 — and where the
 * only silent fix available is to rewrite shipped prose, which is exactly what
 * an in-place upgrade exists to forbid. So they are named and skipped.
 */
export declare function readCorpusBodiesReporting(paths: CorpusPaths): Promise<CorpusRead>;
export type ReviseOutcome = {
    readonly revised: readonly string[];
    readonly missing: readonly string[];
};
export declare function reviseInCorpus(paths: CorpusPaths, defs: readonly ScenarioDef[]): Promise<ReviseOutcome>;
/**
 * Every scenario body the corpus holds, read from the shards — the expensive
 * read. Exported for the corpus-wide audit pass: a cross-batch rule like
 * flag-condition-never-set can only see what the whole pool actually writes,
 * which means reading every body rather than the selector index.
 */
export declare function readCorpusBodies(paths: CorpusPaths): Promise<ScenarioDef[]>;
/**
 * Every flag this corpus's replies stamp — the half of the flag vocabulary the
 * consequence gate has to be told about, or a card gating on something a
 * shipped scenario writes is refused for a chain that closes perfectly well.
 *
 * A corpus published before the sidecar existed has none, so it is rebuilt from
 * the bodies once and written back. That read is the thing this file exists to
 * avoid, which is exactly why it happens at most once per corpus.
 */
export declare function corpusFlags(paths: CorpusPaths): Promise<readonly string[]>;
/**
 * A deed the corpus already remembers: the flag, the scenario whose reply
 * stamped it, and — the part a reader is actually written against — what that
 * reply left behind.
 *
 * `remembered` is the sentence the campaign keeps, which Doctrine A quotes back.
 * `rejoinder` is what the room said after the player committed, and it is canon
 * the player has already read. A reader drafted without it can contradict the
 * week it is answering while passing every rule in the audit: a real batch
 * opened "the review found the hand" against a setter whose rejoinder had
 * already said the review named nobody, and only a human reading both caught it.
 */
export type CorpusDeed = {
    readonly flag: string;
    readonly scenario: string;
    readonly class: string;
    readonly remembered?: string;
    readonly rejoinder?: string;
};
/**
 * The same flags `corpusFlags` returns, carrying where each one came from.
 *
 * The gate has always accepted these — the whole corpus vocabulary is folded
 * into `scenarioFlags` — and the brief has always named the file they live in.
 * Neither was the problem. A batch put 25 of its 31 callbacks on the 12 deeds
 * quoted in the brief and 2 on the several hundred sitting in the corpus,
 * because a writer under pressure reaches for what is in front of them and a
 * flag id alone is not something you can write a scenario about. So the deed
 * travels with its scenario: "the-pardon-nobody-is-watching stamped
 * granted-the-quiet-clemency" is a callback someone can actually answer.
 *
 * Joined against the selector index for the class, which is what lets the brief
 * offer a writer the deeds their own kind of week plausibly follows from.
 */
export declare function corpusDeeds(paths: CorpusPaths): Promise<readonly CorpusDeed[]>;
/**
 * The same deeds read straight off the bodies, for a reader that has the
 * scenarios but not the sidecars — the authoring kit, which is built from the
 * corpus baked into the app. The entries are the ones the flag sidecar holds.
 */
export declare function bodyDeeds(bodies: readonly ScenarioDef[]): readonly CorpusDeed[];
export declare function corpusStats(paths: CorpusPaths): Promise<CorpusStats>;
/** One scenario's body, read from the shard its selector names. */
export declare function readBody(paths: CorpusPaths, selector: ScenarioSelector): Promise<ScenarioDef | undefined>;
export declare function writeCorpusManifest(paths: CorpusPaths): Promise<void>;
