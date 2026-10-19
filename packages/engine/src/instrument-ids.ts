// The five instruments and the five rungs, and nothing else.
//
// This module imports nothing, for the same reason `turn-clock.ts` does not:
// `instruments.ts` sits in a value-import cycle, and a module body elsewhere
// that spreads or iterates one of these lists during initialization can see
// `undefined` rather than the array — the failure reads as "X is not
// iterable" in a file that has nothing to do with the cycle.
//
// Vocabulary this small and this widely read belongs where every importer is
// guaranteed to find it built. `instruments.ts` re-exports both, so every
// existing caller is unchanged.

export type InstrumentId = "diplomatic" | "economic" | "covert" | "military" | "assistance";

export const INSTRUMENT_IDS: readonly InstrumentId[] = [
  "diplomatic",
  "economic",
  "covert",
  "military",
  "assistance",
];

export type RungLevel = 1 | 2 | 3 | 4 | 5;

export const RUNG_LEVELS: readonly RungLevel[] = [1, 2, 3, 4, 5];

// How coercive each instrument reads, on the same 0..1 scale as a nation's
// hostility toward a target — the two are compared directly. A property of
// the ladder rather than of any one reader of it: the NPC agent matches it
// against intent, counsel prices a reply by it, and a pursuit decides by it
// whether a move was a campaign or an incident.
// Assistance sits just above zero rather than at it: even a relief shipment is
// a state arriving somewhere with its flag on the crates, and the reading has
// to stay ordered so that "least coercive" is a place on the scale rather than
// a special case every consumer has to test for.
export const INSTRUMENT_COERCION: Record<InstrumentId, number> = {
  assistance: 0.05,
  diplomatic: 0.25,
  economic: 0.5,
  covert: 0.75,
  military: 1,
};
