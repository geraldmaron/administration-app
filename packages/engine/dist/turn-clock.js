// How long a turn is, and nothing else.
//
// This module imports nothing, and that is its whole job.
//
// `turn-loop.ts` sits deep in a value-import cycle — it reaches the effect
// applier and the opinion model, which reach most of the engine and come back
// round. A cycle is survivable as long as every module in it only *calls*
// across the loop at runtime, because by then every module body has finished.
// It stops being survivable the moment a module body reads a value across the
// loop while it is being initialized: whichever module the loader happens to
// enter first sees `undefined` for the other's exports, and a constant derived
// from one silently becomes NaN rather than throwing.
//
// Three constants are derived from the turn length at module scope, in three
// different files (`POLICY_TURN_SHARE`, `TURNS_PER_YEAR`, and the docket's
// litigation clock). Read from a leaf, they are correct under every possible
// initialization order, because a module with no imports of its own is always
// fully initialized before anything that imports it.
//
// So: derive a turn-length constant from here, never from `turn-loop.js`.
// `turn-loop.ts` re-exports this so every existing caller is unchanged.
export const DAYS_PER_TURN = 7;
