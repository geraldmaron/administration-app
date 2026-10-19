import type { Effect, EffectPacket } from "./effect-types.js";
import type { DecisionStamp } from "./willingness.js";
import type { GameDate, MetricSet } from "./state.js";
/**
 * Where a change came from, which is a different question from who did it.
 *
 * `actor` on an ActionRecord already says whose hand it was. Origin says what
 * *kind* of thing produced it, because "the President signed it", "the agency
 * executed it", "another capital did it", "the calendar reached it" and "the
 * scenario dealt it" have to be told apart on a trail even when the actor is
 * identical.
 */
export type CausalOrigin = "decision" | "institution" | "world" | "scheduled" | "scenario";
/** How sure the world is that this is what happened, and who can see it. */
export type CausalConfidence = "observed" | "assessed" | "contested";
export type CausalVisibility = "public" | "intelligence" | "internal";
export type CausalId = string;
/**
 * What a caller knows about a packet's place in the graph. Every field but
 * `origin` is optional because a packet is produced in dozens of places and
 * most of them know one or two of these — but a site that knows a cause must
 * hand it over, because nothing downstream can reconstruct one.
 */
export type CausalProvenance = {
    readonly origin: CausalOrigin;
    /** The events this one answers to. Empty for a root cause. */
    readonly causeIds?: readonly CausalId[];
    /**
     * When the change actually bites, if that is later than when it was decided.
     * A tariff is signed on one date and lands on shelves on another; without
     * this the trail collapses both into the day of the signature.
     */
    readonly effectiveDate?: GameDate;
    /** Nations, people, institutions — whatever ids the caller's domain uses. */
    readonly entities?: readonly string[];
    /** States, cities, districts, theaters. */
    readonly locales?: readonly string[];
    /** Which subsystems moved: "trade", "congress", "macro". */
    readonly systems?: readonly string[];
    /**
     * The durable markers this event left on the board — the flags that are still
     * true weeks later and that a later situation can be gated on.
     *
     * This is the half that was missing for a presidential act. A decision
     * creates no record with a `causedBy` on it: it moves relationships, spends
     * metrics and sets flags, and a flag is a bare string in a keyed set with
     * nowhere to remember who wrote it. So a scenario dealt in week 30 because
     * the President signed something in week 8 could name the flag and never the
     * signature. Stamping the flags here puts the link on the one record that
     * does keep an id, and `selectMarkOrigin` reads it back.
     *
     * Only the flags themselves. The turn-stamp beside each one says *when*
     * rather than *what*, and is derivable from the entry's own turn.
     */
    readonly marks?: readonly string[];
    readonly confidence?: CausalConfidence;
    readonly visibility?: CausalVisibility;
    /**
     * Why an actor who is not the President did what it did: the weighted terms,
     * the score and the threshold they were measured against.
     *
     * On the provenance rather than in a history of its own, for the same reason
     * the marks are: this is the one record that already keeps an id, so a
     * decision months later can name this one as its cause. The stamp carries its
     * own visibility because a foreign government's reasoning is an intelligence
     * read even when the act itself was public.
     */
    readonly decision?: DecisionStamp;
    /** Private recipient responses retained for replay/audit; never player-facing evidence. */
    readonly internalDecisions?: readonly DecisionStamp[];
    /** A concealed contract-steering act, retained with the actor and purchasing authority observed that week. */
    readonly graft?: {
        readonly person: string;
        readonly role: string;
        readonly institution: string;
        readonly fiscalYear: number;
        readonly account: string;
        readonly annualShare: number;
        readonly departmentShare: number;
        /** Annual purchasing exposure in the GDP model's units; not a diverted cash amount. */
        readonly annualPurchasing: number;
        readonly purchasingReach: number;
        readonly oversightPressure: number;
    };
};
/**
 * The provenance as it is written down: everything the caller supplied, plus
 * the identity and the date only `apply()` is in a position to stamp.
 */
export type CausalStamp = CausalProvenance & {
    readonly eventId: CausalId;
    readonly createdDate: GameDate;
};
/**
 * A stamped record with its stamp, so the graph functions below do not have to
 * repeat the "does this entry have provenance" narrowing at every call.
 */
export type CausalRecord = {
    readonly causal: CausalStamp;
    readonly turn: number;
    readonly description: string;
};
/**
 * Derived from the ledger's own length, which `apply()` grows by exactly one
 * per packet. Deterministic and collision-free without an RNG draw or a
 * counter on the Campaign: the same campaign replayed from the same seed
 * stamps the same ids in the same order.
 */
export declare function causalIdFor(turn: number, ledgerLength: number): CausalId;
/**
 * The origin a packet gets when its caller did not say — derived from `source`,
 * which every packet already carries, so an unmigrated call site produces an
 * honest classification rather than a placeholder.
 */
export declare function originForSource(source: "action" | "conversation" | "simulate" | "operator" | "godmode"): CausalOrigin;
/** The whole stamp, built where the ledger's length and the date are known. */
export declare function stampFor(source: "action" | "conversation" | "simulate" | "operator" | "godmode", provenance: CausalProvenance | undefined, turn: number, ledgerLength: number, createdDate: GameDate): CausalStamp;
/** The events this one directly answers to. Order is the order they were named. */
export declare function selectCausesOf(ledger: readonly Partial<CausalRecord>[], eventId: CausalId): readonly CausalRecord[];
/** Every event that names this one as a cause, directly. */
export declare function selectConsequencesOf(ledger: readonly Partial<CausalRecord>[], eventId: CausalId): readonly CausalRecord[];
/**
 * Walks causes upward until it reaches events that name none.
 *
 * A visited set rather than a depth cap: the graph is a DAG by construction
 * (a cause is always an event that already existed when the effect was
 * stamped, so an edge can only ever point backwards) but a corrupted save
 * should hang nothing.
 */
export declare function selectRootCausesOf(ledger: readonly Partial<CausalRecord>[], eventId: CausalId): readonly CausalRecord[];
/**
 * The whole downstream cone of one decision — what it caused, what those
 * caused, all the way out. This is what a Record drill-in means by "legacy".
 */
export declare function selectDecisionLegacy(ledger: readonly Partial<CausalRecord>[], eventId: CausalId): readonly CausalRecord[];
type DateRange = {
    readonly from: GameDate;
    readonly to: GameDate;
};
/**
 * Everything in a window that moved a given metric, newest first.
 *
 * Reads `cost` — the movement `apply()` already measures on the way through —
 * rather than re-deriving anything, so the answer to "why did this move" is
 * built from the same figures the player was charged.
 */
export declare function selectWhyMetricMoved(ledger: readonly (Partial<CausalRecord> & {
    readonly cost?: Partial<MetricSet>;
})[], metric: keyof MetricSet, range: DateRange): readonly (CausalRecord & {
    readonly delta: number;
})[];
/** Everything that named this place. */
export declare function selectLocaleCauses(ledger: readonly Partial<CausalRecord>[], localeId: string): readonly CausalRecord[];
/** Everything that named this institution, whether as actor or as subject. */
export declare function selectInstitutionCauses(ledger: readonly Partial<CausalRecord>[], institutionId: string): readonly CausalRecord[];
/** Everything a given subsystem produced. */
export declare function selectSystemCauses(ledger: readonly Partial<CausalRecord>[], system: string): readonly CausalRecord[];
/**
 * The one integrity check the corpus and the harness both run: a stamped event
 * may not name a cause that is not itself on the ledger.
 *
 * This is what "no orphaned causal events" means operationally. It is exported
 * rather than kept in a test because the balance harness asserts it over
 * hundreds of seeded campaigns, and a rule proven only in a unit test is a rule
 * about a fixture.
 */
export declare function findOrphanedCauses(ledger: readonly Partial<CausalRecord>[]): readonly {
    readonly eventId: CausalId;
    readonly missing: CausalId;
}[];
/**
 * The flags a packet actually sets, without the turn-stamps beside them.
 *
 * `markedFlags` writes each flag twice — the fact and the week it happened —
 * and only the first of the pair is a thing anything is gated on. The marker
 * is recognized by rebuilding it from its own writer rather than by matching a
 * prefix copied into this file, which is how the two would quietly stop
 * agreeing the next time the template moves.
 */
export declare function marksOfPacket(turn: number, effects: readonly Effect[]): readonly string[];
/**
 * A packet re-stamped with everything it sets, after a later layer has added
 * effects of its own.
 *
 * The content layer folds a committed reply's memory on *after* the engine has
 * built the packet — the authored flags, the arc's own entry, the press line —
 * and those authored flags are precisely the ones a follow-up situation is
 * gated on. Stamping marks where the packet is built would therefore record
 * every flag except the ones that matter. This is the second pass, applied
 * where the packet is complete and before it is committed.
 *
 * A packet with no provenance is left alone rather than given one: what kind of
 * event it is is not a thing this can work out, and `apply()` already derives
 * an honest origin from the source.
 */
export declare function withCausalMarks(packet: EffectPacket): EffectPacket;
/**
 * The event that left this marker on the board, or nothing.
 *
 * The most recent one, because a flag is a keyed fact rather than a tally: a
 * deed done twice writes the same key, and what the board is standing on is
 * the last time it was written.
 */
export declare function selectMarkOrigin(ledger: readonly Partial<CausalRecord>[], mark: string): CausalRecord | undefined;
/**
 * The *first* event that left this marker, which is a different question from
 * the last one.
 *
 * A clock runs from when something started, not from the last time it was
 * mentioned: a program adopted in March and still running in July has been
 * standing since March, and reading the most recent mention would restart the
 * clock every week and leave it permanently about to begin.
 */
export declare function selectMarkOnset(ledger: readonly Partial<CausalRecord>[], mark: string): CausalRecord | undefined;
/** The events behind a set of markers, de-duplicated, oldest first. */
export declare function selectMarkOrigins(ledger: readonly Partial<CausalRecord>[], marks: readonly string[]): readonly CausalId[];
/**
 * The last act on the record between two governments, whichever of them took
 * it.
 *
 * Both parties have to be named on the stamp, so this is the thread between
 * exactly these two capitals rather than everything either of them has been
 * doing. Only a decision counts: a drought in one of the two countries is not
 * something the other one said back.
 */
export declare function selectExchangeBetween(ledger: readonly Partial<CausalRecord>[], from: string, to: string): CausalRecord | undefined;
/** What put a decision on the desk: the situation's own gate, and the two capitals' last exchange. */
export type DecisionSubject = {
    /**
     * The two governments the act passed between, when the thread between them
     * is one this record follows.
     *
     * Absent for a domestic act, which has no counterpart, and for a move two
     * foreign capitals made between themselves — the same scope rule the deed
     * record keeps, and for the same reason: the graph exists to answer why
     * something happened to this government, and forty-nine squared threads
     * nobody was ever shown would grow it without bound.
     */
    readonly between?: readonly [string, string];
    /** The markers the situation was gated on — what had to already be true for it to arrive. */
    readonly gatedOn?: readonly string[];
};
/**
 * The events a decision answers to.
 *
 * One kind, and it is not inferred from proximity. The gate is a fact the
 * situation states about itself: it reached the desk *because* those flags were
 * standing, so whoever set them is upstream of it. A decision with no gate
 * answers to nothing, and says so.
 *
 * There was briefly a second edge — the thread between two capitals, on the
 * argument that a president replying to Ottawa is replying to whatever Ottawa
 * last did. It carried 87-90% of the whole graph's reach and was withdrawn on
 * the owner's call, because reach is not the thing worth optimizing here. That
 * edge asserts a causal link from adjacency between two governments rather than
 * from anything either act states, and a "why this happened" a player cannot
 * trust is worse than a sparse one. `selectExchangeBetween` is kept: the thread
 * between two capitals is a real and useful reading, and a surface that wants
 * to say "the last thing that passed between you" can ask for it by name. What
 * it may not do is enter the causal graph as though the record had claimed it.
 */
export declare function decisionCauses(ledger: readonly Partial<CausalRecord>[], subject: DecisionSubject): readonly CausalId[];
/**
 * Opens a fold and returns the function that closes it.
 *
 * The previous id is restored rather than cleared, because `apply()` is
 * re-entrant through handlers that apply a nested packet; clearing would leave
 * the outer fold stamping nothing for every effect after the nested one.
 */
export declare function enterFold(eventId: CausalId): () => void;
/**
 * The event a handler is currently part of, or nothing when it is being called
 * outside `apply()`. A record stamped with nothing is a root, which is honest:
 * it was not created by anything the ledger knows about.
 */
export declare function currentEventId(): CausalId | undefined;
export {};
