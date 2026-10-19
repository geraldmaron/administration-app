import { ScenarioDef, type CorpusContext, type DeedsRemembered, type ScenarioFinding } from "@admin/content";
import type { BindingFinding } from "./binding.js";
export type ScenarioValidation = {
    readonly file: string;
    readonly scenarios: number;
    readonly shapeErrors: readonly string[];
    readonly findings: readonly ScenarioFinding[];
    /**
     * Binding-contract defects, kept in their own list rather than folded into
     * `findings`: `ScenarioFindingKind` is a closed union owned by `@admin/content`
     * and describes what the *shipped* audit checks, while these are the standard
     * a new draft is held to and the corpus deliberately is not. Empty everywhere
     * except a generation batch — see `bindingFindings`.
     */
    readonly binding: readonly BindingFinding[];
    readonly ok: boolean;
    /**
     * How much of what this document remembers is ever read back. Carried on the
     * result rather than printed as a finding: it is a pool-scale statistic with
     * no threshold behind it yet, and a run reports it by merging the documents
     * it read, which no single document can do for itself.
     */
    readonly deeds: DeedsRemembered;
};
/**
 * `corpus` is the pool this batch is landing in, as indexes rather than
 * content: passing it is what makes a batch's collisions with *already
 * shipped* scenarios visible. Omitted, the batch is only checked against
 * itself — correct for a standalone directory, wrong for a publish.
 */
export declare function validateScenarioDocument(file: string, raw: unknown, corpus?: CorpusContext, knownFlags?: readonly string[]): ScenarioValidation;
/**
 * The documents a directory holds.
 *
 * A work directory holds the gate's own rejection reports beside the documents
 * it rejected. Reading those back in would fail every one of them on shape and
 * bury the real count under noise the gate itself wrote. Shared with the readers
 * that only measure a batch, so a second caller cannot forget the exclusion and
 * quietly report on the gate's own output.
 */
export declare function scenarioDocumentPaths(dir: string): Promise<readonly string[]>;
export type ScenarioDirRead = {
    readonly defs: readonly ScenarioDef[];
    /** Files that did not parse, named rather than dropped: a batch measured short is a wrong measurement. */
    readonly unreadable: readonly string[];
};
/**
 * Every scenario a directory holds, for the callers that measure a batch rather
 * than gate it. The gate is `validateScenarioDir` and stays the only thing that
 * decides whether a document may ship.
 */
export declare function readScenarioDir(dir: string): Promise<ScenarioDirRead>;
/** Validate every .json under a directory — the CI shape of the gate. */
export declare function validateScenarioDir(dir: string, corpus?: CorpusContext): Promise<readonly ScenarioValidation[]>;
/**
 * The errors a shipped scenario already carries, keyed kind and message, so a
 * revision gate can tell a defect it introduced from the corpus's standing
 * debt in a field it may not touch. Reachability is left out on purpose: it is
 * the one error a revision of conditions, cast or family exists to answer.
 */
export declare function shippedErrorKeys(id: string, original: unknown, corpus?: CorpusContext, knownFlags?: readonly string[]): ReadonlySet<string>;
