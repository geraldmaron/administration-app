import { type ResolutionSequenceDef, type ResolutionSequenceKey } from "./resolution-beat.js";
/**
 * Every key a resolution can hand the selector.
 *
 * A failure always carries a named branch — the resolver partitions the whole
 * failure mass across them — so there is no branchless failure situation, and a
 * success or partial never carries one.
 */
export declare const SITUATION_KEYS: readonly ResolutionSequenceKey[];
/** Whether one authored document answers to one situation. */
export declare function coversKey(def: ResolutionSequenceDef, key: ResolutionSequenceKey): boolean;
export type UnreachableSequence = {
    readonly id: string;
    /** The keys the document claims, none of which resolution can produce. */
    readonly claimed: readonly string[];
};
/** Documents no instrument, rung and branch combination can ever reach. */
export declare function unreachableSequences(defs: readonly ResolutionSequenceDef[]): readonly UnreachableSequence[];
/** The other direction: situations a player can reach that no document answers. */
export declare function uncoveredSituationKeys(defs: readonly ResolutionSequenceDef[]): readonly string[];
