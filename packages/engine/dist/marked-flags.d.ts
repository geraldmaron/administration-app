import type { FlagId } from "./state.js";
export declare function flagMarker(flag: FlagId, turn: number): FlagId;
/**
 * Each flag followed by its turn-stamped marker, ready for a `FlagEffect`'s
 * `set`.
 *
 * `apply()` folds `set` into a keyed record, so a flag arriving twice writes
 * the same key rather than a second entry — this helper carries no counter
 * and nothing downstream of it can accumulate one.
 */
export declare function markedFlags(flags: readonly FlagId[], turn: number): readonly FlagId[];
