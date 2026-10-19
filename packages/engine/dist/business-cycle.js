import { compoundRate, DEFAULT_PACE, PACE_LADDER, turnsFor } from "./pace.js";
import { createRngStreams } from "./rng.js";
/**
 * A nation whose cycle has not been drawn yet: expansion, zero amplitude,
 * entered the given turn. Every nation opens this way at founding, and the
 * drift phase draws each one its place in the cycle the first week it runs
 * (`drawnCycle`), so the draw happens on the campaign's own seed wherever the
 * campaign came from.
 */
export function openingCycle(turn) {
    return { phase: "expansion", enteredTurn: turn, amplitude: 0 };
}
/** One undrawn `CycleState` per nation, in sorted id order. */
export function openingCycles(nationIds, turn) {
    const cycles = {};
    for (const id of [...nationIds].sort((a, b) => a.localeCompare(b))) {
        cycles[id] = openingCycle(turn);
    }
    return cycles;
}
/** Whether a cycle has been drawn: a drawn cycle always carries an amplitude. */
export function isDrawn(cycle) {
    return cycle.amplitude > 0;
}
/**
 * A nation's place in its cycle, drawn once: a phase in proportion to how long
 * each lasts, and a stretch of it already served, so the world turns on its
 * own clocks rather than in unison. The played nation always draws an
 * expansion, part way through: a President inherits the economy where it
 * stands, and the expansion is where the country spends most of its time.
 */
export function drawnCycle(nation, turn, opening) {
    const draw = createRngStreams(opening.seed).stream("cycle-open", nation);
    const phase = nation === opening.player ? "expansion" : phaseByDwell(draw.next());
    const elapsed = Math.floor(draw.next() * expectedDwellWeeks(phase));
    return { phase, enteredTurn: turn - elapsed, amplitude: drawAmplitude(draw) };
}
const PHASES = ["expansion", "peak", "contraction", "trough"];
function phaseByDwell(fraction) {
    const total = PHASES.reduce((sum, phase) => sum + expectedDwellWeeks(phase), 0);
    let remaining = fraction * total;
    for (const phase of PHASES) {
        remaining -= expectedDwellWeeks(phase);
        if (remaining < 0)
            return phase;
    }
    return "expansion";
}
/**
 * Zero amplitude reads as no cycle at all under any phase. Used wherever a
 * reading wants a country's rest state with no cyclical swing —
 * `restingRuntime`'s "nothing is happening" comparator among them. On a live
 * nation it is a cycle not yet drawn.
 */
export const NO_CYCLE = { phase: "expansion", enteredTurn: 0, amplitude: 0 };
/**
 * The growth offset per unit of amplitude, by phase.
 *
 * Mean zero over the phases' expected dwells (one point for 229 weeks against
 * five for 46), so over a whole cycle the economy grows at its own trend and
 * the cycle only decides when. An offset with a positive mean would be a
 * growth program nobody enacted; one that only ever subtracted would run the
 * world below its own potential forever.
 */
export const CYCLE_GROWTH_OFFSET = {
    expansion: 1,
    peak: 0,
    contraction: -5,
    trough: 0,
};
/** Where the cycle currently pulls growth, as an annual fraction. Pure; it writes nothing. */
export function cycleOffset(cycle) {
    return round6(CYCLE_GROWTH_OFFSET[cycle.phase] * cycle.amplitude);
}
const NEXT_PHASE = {
    expansion: "peak",
    peak: "contraction",
    contraction: "trough",
    trough: "expansion",
};
/**
 * How long each phase lasts at least, in weeks. Expansions run long and
 * recessions short, which is the real shape: with the exit hazards below the
 * expected spans are 229, 25, 46 and 25 weeks, against the postwar record's
 * 64-month expansion and 10-month contraction. A slump that has opened a deep
 * gap turns sooner than its span (`CYCLE_HAZARD_LEVERAGE`).
 */
export const CYCLE_MIN_DWELL_WEEKS = {
    expansion: 104,
    peak: 13,
    contraction: 26,
    trough: 13,
};
/** The weekly chance a phase ends once its minimum dwell is served. */
export const CYCLE_EXIT_HAZARD = {
    expansion: 0.008,
    peak: 0.08,
    contraction: 0.05,
    trough: 0.08,
};
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
export const CYCLE_HAZARD_LEVERAGE = 50;
export const CYCLE_AMPLITUDE_RANGE = { min: 0.01, max: 0.035 };
/** A phase's expected length in weeks: its minimum dwell plus the mean wait for its exit. */
export function expectedDwellWeeks(phase) {
    return CYCLE_MIN_DWELL_WEEKS[phase] + 1 / CYCLE_EXIT_HAZARD[phase];
}
const round6 = (value) => Math.round(value * 1_000_000) / 1_000_000 + 0;
function drawAmplitude(draw) {
    return round6(CYCLE_AMPLITUDE_RANGE.min + draw.next() * (CYCLE_AMPLITUDE_RANGE.max - CYCLE_AMPLITUDE_RANGE.min));
}
/**
 * This week's exit hazard for a phase whose dwell is served: a boom leans on
 * how far output runs above its potential, a slump on the budget's push and
 * on how far output has fallen below it.
 */
export function cycleExitHazard(phase, gap, impulse) {
    const lean = phase === "expansion" || phase === "peak" ? Math.max(0, gap) : Math.max(0, impulse) + Math.max(0, -gap);
    const weekly = Math.min(1, CYCLE_EXIT_HAZARD[phase] * (1 + CYCLE_HAZARD_LEVERAGE * lean));
    return compoundRate(weekly, PACE_LADDER[DEFAULT_PACE]);
}
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
export function advanceCycle(cycle, turn, gap, impulse, draw) {
    const dwellTurns = turnsFor(CYCLE_MIN_DWELL_WEEKS[cycle.phase] * 7);
    if (turn - cycle.enteredTurn < dwellTurns)
        return cycle;
    if (draw.next() >= cycleExitHazard(cycle.phase, gap, impulse))
        return cycle;
    return { phase: NEXT_PHASE[cycle.phase], enteredTurn: turn, amplitude: drawAmplitude(draw) };
}
const PHASE_WORD = {
    expansion: "an expansion",
    peak: "the peak of the cycle",
    contraction: "a contraction",
    trough: "the bottom of the cycle",
};
/** The plain-language line a player-facing reading names the era with. */
export function cycleWord(cycle) {
    return `The economy is in ${PHASE_WORD[cycle.phase]}.`;
}
