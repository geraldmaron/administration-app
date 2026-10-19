import { type ActionRecord, type Campaign, type CausalOrigin, type EffectActor, type GameDate, type MetricSet, type OpinionDriver } from "@admin/engine";
export declare const ACTOR_WORDS: Readonly<Record<EffectActor, string>>;
export declare const ORIGIN_WORDS: Readonly<Record<CausalOrigin, string>>;
/** One reading's move across one entry, from the value before it to the value after. */
export type ReadingMove = {
    readonly key: keyof MetricSet;
    readonly label: string;
    readonly before: number;
    readonly after: number;
    readonly delta: number;
    /** The change as the row prints it: "+0.4 points", "−$1.2B". */
    readonly text: string;
    readonly beforeText: string;
    readonly afterText: string;
};
/** The readings an entry moved, each from its value before the entry to its value after. */
export declare function entryMoves(campaign: Campaign, entry: ActionRecord): readonly ReadingMove[];
/**
 * Every entry's moves in one walk back from today's readings, for a screen
 * that reads the whole ledger. Asking `entryMoves` per entry rewinds the
 * ledger each time, which is quadratic over a term of thousands of entries.
 */
export declare function ledgerMoves(campaign: Campaign): ReadonlyMap<ActionRecord, readonly ReadingMove[]>;
/** The readings that moved from one set of figures to another: what one act or one run did. */
export declare function metricMoves(before: MetricSet, after: MetricSet): readonly ReadingMove[];
/** The readings that moved between two campaigns, from the first's value to the second's. */
export declare function readingMoves(before: Campaign, after: Campaign): readonly ReadingMove[];
/** The public judgments an entry moved, heaviest first. */
export declare function entryJudgments(entry: ActionRecord): readonly {
    readonly driver: OpinionDriver;
    readonly label: string;
    readonly delta: number;
    readonly text: string;
}[];
export type RecordRow = {
    readonly id: string;
    readonly date: GameDate;
    readonly actor: EffectActor;
    readonly actorWord: string;
    readonly description: string;
    /** The description's first sentence, for a title; the rest is the body. */
    readonly headline: string;
    readonly moves: readonly ReadingMove[];
    /** The subsystems it moved ("trade", "congress", "macro"), which the timeline draws as its mark. */
    readonly systems: readonly string[];
    /** The foreign governments it names, in the order it names them, whose flags the timeline shows. */
    readonly nations: readonly string[];
};
/** The first sentence of a ledger description, which carries what happened; the rest is how. */
export declare function headlineOf(description: string): string;
/** One ledger entry as a row, with the moves already read off the ledger so a whole-term screen walks it once. */
export declare function recordRowOf(campaign: Campaign, entry: ActionRecord, id: string, moves: readonly ReadingMove[]): RecordRow;
/** The Record's timeline, newest first: every entry a president reads that the causal graph can name. */
export declare function recordRows(campaign: Campaign, actor?: EffectActor): readonly RecordRow[];
export type RecordLink = {
    readonly id: string;
    readonly description: string;
    readonly date: GameDate;
};
export type EntryStage = {
    readonly key: "issued" | "under-way" | "resolved";
    readonly label: string;
    /** The day the stage began, where the ledger kept one. */
    readonly date?: GameDate;
    readonly reached: boolean;
    /** The stage the entry stands in today. */
    readonly current: boolean;
};
export type RecordEntryReading = RecordRow & {
    readonly origin?: string;
    /** The day it bites, where that is later than the day it was decided. */
    readonly effectiveDate?: GameDate;
    /** Issued and in effect, or decided and still under way. */
    readonly status: string;
    /** Issued, under way where it takes time to bite, and resolved once it has. */
    readonly stages: readonly EntryStage[];
    readonly judgments: ReturnType<typeof entryJudgments>;
    readonly subjects: NonNullable<import("@admin/engine").ActionRecord["subjects"]>;
    readonly accounting: NonNullable<import("@admin/engine").ActionRecord["accounting"]>;
    readonly causes: readonly RecordLink[];
    readonly consequences: readonly RecordLink[];
    /** The events at the head of the chain this one answers to, found by walking origins upward. */
    readonly roots: readonly RecordLink[];
    /** Every event downstream of this one, however many steps away. */
    readonly downstreamCount: number;
    /** The map's framing for the entry: its first US state, else its first government, else the country. */
    readonly camera: string;
    readonly selection?: string;
};
/** One entry, read whole, or nothing for an id this administration's ledger does not hold. */
export declare function recordEntry(campaign: Campaign, eventId: string): RecordEntryReading | undefined;
