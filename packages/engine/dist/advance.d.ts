import { type AttentionStop, type MatterSource } from "./attention.js";
import type { TurnPhases } from "./turn-loop.js";
import { type LapseSource, type StagingSource } from "./docket-loop.js";
import type { Campaign, FeedItem } from "./state.js";
export type StopReason = 
/** Something needs the President. `stop.presented` is non-empty. */
"attention"
/** The horizon ran out with a quiet world. Nothing is owed an answer. */
 | "horizon"
/** The presidency ended — removed, defeated, term-limited. */
 | "ended"
/** A federal Election Day, with the President still in office. An odd-year governors' night does not stop. */
 | "election";
export type AdvanceOptions = {
    readonly phases: TurnPhases;
    /**
     * Who gets asked what the President is needed for. Injected rather than
     * imported: authored content lives in a package that depends on this one, so
     * a scenario director can be a source without inverting the dependency.
     */
    readonly matterSources?: readonly MatterSource<Campaign>[];
    /**
     * How far the world may run before handing control back even if nothing
     * happened. Days, not turns. Defaults to four weeks — long enough that a
     * genuinely quiet month is experienced as one, short enough that the player
     * is never gone from their own presidency for a season.
     */
    readonly horizonDays?: number;
    /**
     * Who admits a held document on this day. Omitted means the desk still
     * stages the old way and this call does not create a docket.
     */
    readonly stagingSources?: readonly StagingSource<Campaign>[];
    /** Who prices a document whose window closes today. The entry is removed either way. */
    readonly lapseSources?: readonly LapseSource<Campaign>[];
};
export type { LapseSource, StagingSource };
export type AdvanceResult = {
    readonly campaign: Campaign;
    /** Calendar days actually spent. Zero when the first look already stopped. */
    readonly elapsedDays: number;
    /** Ticks actually run, for a harness that needs to reconcile with `turn`. */
    readonly turnsRun: number;
    /** What reached the player while the world ran. Never stops time by itself. */
    readonly ambientEvents: readonly FeedItem[];
    /** At most three presidential matters, plus what is still owed behind them. */
    readonly stop: AttentionStop;
    readonly stopReason: StopReason;
};
/** Four weeks. See `horizonDays`. */
export declare const DEFAULT_HORIZON_DAYS = 28;
/**
 * Runs the world forward until it needs the President, the horizon runs out, or
 * the presidency ends.
 *
 * The look happens BEFORE the first tick as well as after each one: a president
 * returning to a desk that already has a bill on it should not have to spend a
 * week of their term to be told so.
 */
export declare function advanceUntilAttention(campaign: Campaign, options: AdvanceOptions): AdvanceResult;
