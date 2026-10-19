import type { FlagId } from "./state.js";

// One writer of turn-stamped flag markers, for every emitter that leaves a
// durable record in `campaign.player.flags`.
//
// A flag says *that* something happened; the marker beside it says *when*,
// which is the half an aged gate needs to tell a callback from a next-week
// script. The pair was open-coded where authored reply flags are stamped,
// which was fine while a reply was the only thing that could set a flag. The
// resolver stamps acts now, and a hand-rolled second copy of the pair is how
// one emitter's flags quietly stop aging while every other emitter's age.
//
// The marker's shape is fixed by its reader, not by this file: the content
// layer's flag-age boost and `agedAtLeast` condition look up
// `flagset:<flag>:<turn>` by exact key, so the string built here is that key
// or the flags this module stamps are invisible to both. Exported so the
// content layer (which can import the engine, unlike the reverse) builds the
// same key by calling this instead of holding its own copy of the template.
export function flagMarker(flag: FlagId, turn: number): FlagId {
  return `flagset:${flag}:${turn}`;
}

/**
 * Each flag followed by its turn-stamped marker, ready for a `FlagEffect`'s
 * `set`.
 *
 * `apply()` folds `set` into a keyed record, so a flag arriving twice writes
 * the same key rather than a second entry — this helper carries no counter
 * and nothing downstream of it can accumulate one.
 */
export function markedFlags(flags: readonly FlagId[], turn: number): readonly FlagId[] {
  return flags.flatMap((flag) => [flag, flagMarker(flag, turn)]);
}
