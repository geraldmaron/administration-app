import { type EffectPacket } from "./effects.js";
import { type OpinionDriver } from "./opinion-drivers.js";
import type { Campaign } from "./state.js";
import type { WeekOpening } from "./state-week.js";
export { DAYS_PER_TURN } from "./turn-clock.js";
export declare const METRIC_HISTORY_WINDOW = 24;
export type TurnPhase = (state: Campaign) => readonly EffectPacket[];
export type TurnPhaseSequence = TurnPhase | readonly TurnPhase[];
export type TurnPhases = {
    readonly simulate: TurnPhaseSequence;
    readonly select: TurnPhaseSequence;
    /** Office days 1 to 7. Absent means the week still runs as one list on the tick. */
    readonly days?: readonly (readonly TurnPhase[])[];
};
export declare const noopPhase: TurnPhase;
export declare const defaultTurnPhases: TurnPhases;
export declare function runPhase(state: Campaign, phases: TurnPhaseSequence, turn: number): Campaign;
/**
 * The most the world's recurring writers may move one judgment in a week,
 * other than the public's own weekly revision, in either direction.
 *
 * A judgment is an impression the country revises toward what it can see; a
 * phase that set it directly every week was a second, unexplained account of
 * the public, and summed without limit over a term. Anything recurring that
 * should move a judgment further belongs in its targets, where the cause is
 * named, and fast revision while the story is on the front page delivers steep
 * moves without a direct write. A decision is not recurring: its one-time
 * consequence for the public is what the decision did, and is not budgeted.
 */
export declare const WEEKLY_DIRECT_MOOD_BUDGET = 0.05;
/** What the turn's recurring background writers, other than the weekly revision, have moved each judgment by, net. */
export declare function directMoodThisTurn(campaign: Campaign): Readonly<Record<OpinionDriver, number>>;
/**
 * Two years of the United States economy as each week closed, at weekly
 * resolution. Older weeks are not dropped: they fold into a monthly archive
 * (`economy-archive.ts`), so a long presidency keeps its whole course at the
 * resolution the comparison charts read, and the weekly ring stays two years.
 */
export declare const ECONOMY_HISTORY_WINDOW = 104;
/**
 * What the week is measured from: the figures as it opened, read before any
 * phase or office day moves them. The one builder, so the weekly tick and the
 * office-day clock record the same opening.
 */
export declare function openWeek(state: Campaign): WeekOpening;
export declare function closeWeek(state: Campaign, phases: TurnPhases, opening: WeekOpening): Campaign;
export declare function tickWeek(state: Campaign, phases?: TurnPhases): Campaign;
export declare function advanceTurn(state: Campaign, phases?: TurnPhases): Campaign;
