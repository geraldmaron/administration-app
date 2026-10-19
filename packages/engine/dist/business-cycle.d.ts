import type { NationId } from "@admin/world";
import { type CampaignSeed, type RngStream } from "./rng.js";
export type CyclePhase = "expansion" | "peak" | "contraction" | "trough";
export type CycleState = {
    readonly phase: CyclePhase;
    /** Turn the phase was entered. Negative for a phase already under way when the campaign opened. */
    readonly enteredTurn: number;
    /** Drawn once on entry from the seeded stream. No two expansions are the same size. */
    readonly amplitude: number;
};
/** Full replacement of `Campaign.cycles[nation]` on a transition turn. */
export type CycleEffect = {
    readonly kind: "cycle";
    readonly nation: NationId;
    readonly phase: CyclePhase;
    readonly amplitude: number;
    readonly enteredTurn: number;
};
/**
 * A nation whose cycle has not been drawn yet: expansion, zero amplitude,
 * entered the given turn. Every nation opens this way at founding, and the
 * drift phase draws each one its place in the cycle the first week it runs
 * (`drawnCycle`), so the draw happens on the campaign's own seed wherever the
 * campaign came from.
 */
export declare function openingCycle(turn: number): CycleState;
/** One undrawn `CycleState` per nation, in sorted id order. */
export declare function openingCycles(nationIds: readonly NationId[], turn: number): Readonly<Record<NationId, CycleState>>;
/** The seed and the played nation a cycle's first draw reads. */
export type CycleOpening = {
    readonly seed: CampaignSeed;
    readonly player: NationId;
};
/** Whether a cycle has been drawn: a drawn cycle always carries an amplitude. */
export declare function isDrawn(cycle: CycleState): boolean;
/**
 * A nation's place in its cycle, drawn once: a phase in proportion to how long
 * each lasts, and a stretch of it already served, so the world turns on its
 * own clocks rather than in unison. The played nation always draws an
 * expansion, part way through: a President inherits the economy where it
 * stands, and the expansion is where the country spends most of its time.
 */
export declare function drawnCycle(nation: NationId, turn: number, opening: CycleOpening): CycleState;
/**
 * Zero amplitude reads as no cycle at all under any phase. Used wherever a
 * reading wants a country's rest state with no cyclical swing —
 * `restingRuntime`'s "nothing is happening" comparator among them. On a live
 * nation it is a cycle not yet drawn.
 */
export declare const NO_CYCLE: CycleState;
/**
 * The growth offset per unit of amplitude, by phase.
 *
 * Mean zero over the phases' expected dwells (one point for 229 weeks against
 * five for 46), so over a whole cycle the economy grows at its own trend and
 * the cycle only decides when. An offset with a positive mean would be a
 * growth program nobody enacted; one that only ever subtracted would run the
 * world below its own potential forever.
 */
export declare const CYCLE_GROWTH_OFFSET: Readonly<Record<CyclePhase, number>>;
/** Where the cycle currently pulls growth, as an annual fraction. Pure; it writes nothing. */
export declare function cycleOffset(cycle: CycleState): number;
/**
 * How long each phase lasts at least, in weeks. Expansions run long and
 * recessions short, which is the real shape: with the exit hazards below the
 * expected spans are 229, 25, 46 and 25 weeks, against the postwar record's
 * 64-month expansion and 10-month contraction. A slump that has opened a deep
 * gap turns sooner than its span (`CYCLE_HAZARD_LEVERAGE`).
 */
export declare const CYCLE_MIN_DWELL_WEEKS: Readonly<Record<CyclePhase, number>>;
/** The weekly chance a phase ends once its minimum dwell is served. */
export declare const CYCLE_EXIT_HAZARD: Readonly<Record<CyclePhase, number>>;
/**
 * How hard the economy's own state leans on the next turn, per unit of output
 * (a gap or an impulse of one percent of output doubles the hazard). An
 * economy running above its potential is the one that tips over; one being
 * pushed by its budget, or one already far below its potential, is the one
 * that climbs out. All are fractions of output, never points.
 *
 * The depth half is what keeps a slump a fall of a size rather than a speed
 * that lasts. The cycle's pull is a constant push for as long as the phase
 * runs, so a contraction that happened to draw a long dwell kept digging at
 * the same rate and turned a median rise in joblessness of under two points
 * into a tail past six. The deeper output sits under its potential, the more
 * slack there is for demand to take up and the sooner the turn comes; in the
 * postwar record the deepest falls were followed by the sharpest recoveries.
 */
export declare const CYCLE_HAZARD_LEVERAGE = 50;
export declare const CYCLE_AMPLITUDE_RANGE: {
    readonly min: 0.01;
    readonly max: 0.035;
};
/** A phase's expected length in weeks: its minimum dwell plus the mean wait for its exit. */
export declare function expectedDwellWeeks(phase: CyclePhase): number;
/**
 * This week's exit hazard for a phase whose dwell is served: a boom leans on
 * how far output runs above its potential, a slump on the budget's push and
 * on how far output has fallen below it.
 */
export declare function cycleExitHazard(phase: CyclePhase, gap: number, impulse: number): number;
/**
 * Evaluated once per nation, per turn. `gap` is the output gap the week's
 * growth target was set against and `impulse` the budget's push, both
 * fractions of output.
 *
 * `draw` must be a stream keyed to `(seed, "cycle", nation, turn)`: the same
 * turn always produces the same decision, so a save/load mid-campaign cannot
 * desync and stream consumption is not path-dependent.
 *
 * Returns the same reference when nothing changes, so a caller can test
 * `!==` to decide whether a `CycleEffect` is owed this turn.
 */
export declare function advanceCycle(cycle: CycleState, turn: number, gap: number, impulse: number, draw: RngStream): CycleState;
/** The plain-language line a player-facing reading names the era with. */
export declare function cycleWord(cycle: CycleState): string;
