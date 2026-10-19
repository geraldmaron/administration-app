import { type AdvanceResult, type AttentionMatter, type AttentionStop, type Campaign, type EffectPacket, type FeedItem, type MetricSet, type StopReason } from "@admin/engine";
import { type ArcRow } from "../record/arcs";
import { type PdbReading } from "../security/pdb";
/** The country's readings at one end of the run: the five metrics and the pressure to remove the President. */
export type BriefReadings = {
    readonly metrics: MetricSet;
    readonly removalPressure: number;
};
/**
 * One run of the world, in the shape the brief room reads it.
 *
 * A Continue is not an absence. The president is here, presses the control, and
 * the world runs until something needs them — so what the brief has to account
 * for is a *span the player spent*, not a stretch nobody was watching. The span
 * is the fact: how many days ran, what the readings did across them, what the
 * wire filed, and what is on the desk now that the run has stopped.
 *
 * Every field is copied off a real `AdvanceResult` and none is derived twice.
 * `stop`, `stopReason` and `ambient` are the same three values the store
 * publishes on its own state; carrying them here as well is what lets the brief
 * be read as one record — the run that produced them — rather than as three
 * session fields a screen has to reassemble in the right order.
 */
export type StopBrief = {
    readonly fromTurn: number;
    readonly toTurn: number;
    readonly turnsRun: number;
    readonly elapsedDays: number;
    readonly stopReason: StopReason;
    readonly stop: AttentionStop;
    readonly ambient: readonly FeedItem[];
    /** What the readings were when the world started running, and what they are now it has stopped. */
    readonly before: BriefReadings;
    readonly after: BriefReadings;
    /** The security section: what the run leaves standing on the desk's own daily brief, read fresh off the campaign the run produced. */
    readonly security: PdbReading;
    /** Stories that ended while the world ran, answered or lapsed: one line each, read before the week. */
    readonly closedArcs: readonly ArcRow[];
};
/** The run the world just made, taken off the advance that made it. */
export declare function stopBriefOf(before: Campaign, result: AdvanceResult): StopBrief;
/** What moved across the run, as the deltas a reading row prints; zero movements are left out by the row, not here. */
export declare function briefMovements(brief: StopBrief): Partial<MetricSet>;
/**
 * Whether this run is worth a page of its own.
 *
 * A run that spent no day of the term has no span to report, and a span with
 * neither news nor a matter behind it is a page that says nothing happened —
 * which the Desk says better by simply staying where it is. Stated as one
 * function because the Desk's redirect and the store's own test have to agree
 * about it; the guard used to be an expression written out at the push site,
 * over a field nothing wrote.
 */
export declare function briefIsWorthReading(brief: StopBrief | undefined): boolean;
/**
 * Putting a matter off, as a packet.
 *
 * Deferral is a change to the campaign like any other, so it goes through
 * `apply()` and lands on the ledger rather than being held in a screen's own
 * state: a president who declines to answer a statutory deadline this week has
 * made a decision, and the record is owed it. The engine decides the date — a
 * week for a hard matter, a fortnight for a soft one, never past the thing's
 * own deadline — so nothing here invents how long "not now" lasts.
 *
 * A matter put off past its own deadline is snapped to the closing day the
 * founding date set (`deferUntil`'s third argument), so a repeatedly-deferred
 * matter reaches the Desk at most once a week rather than every day its
 * deadline keeps slipping.
 */
export declare function deferMatterPacket(campaign: Campaign, matter: AttentionMatter): EffectPacket;
