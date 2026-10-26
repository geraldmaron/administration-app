import type { CausalId } from "./causality.js";
import type { GameDate } from "./state.js";
/**
 * Whether time may keep running.
 *
 * `hard` — the presidency cannot safely continue without resolving this or
 * explicitly deferring it. A statutory deadline, a bill that becomes law or
 * dies by inaction, a force already committed without authorization.
 *
 * `soft` — worth the President's attention, but a president may defer or
 * delegate it and the world will carry on.
 *
 * `ambient` — the world changed. It reaches the feed and the Record. It does
 * NOT stop time, is never counted against the three, and is never queued as
 * something owed an answer.
 */
export type AttentionUrgency = "hard" | "soft" | "ambient";
/**
 * Where the demand came from. Scenario is one row of many, deliberately not
 * the first, so that reading this list is itself the argument.
 */
export type AttentionSource = "constitutional-deadline" | "appropriations-deadline" | "bill-signature" | "nomination" | "court-ruling" | "intelligence-warning" | "military-escalation" | "treaty-deadline" | "agency-request" | "governor-request" | "market-threshold"
/** A standing figure — approval, press standing, a fiscal reading — crossed a line the country noticed. Nothing asked the President for anything. */
 | "standing-threshold" | "disaster" | "diplomatic-request" | "consequence-return" | "investigation"
/** A dated promise from the platform coming due: kept or broken, the country will notice. */
 | "pledge"
/** A scandal the country can already read. It pauses on arrival. */
 | "scandal"
/** A home incident. It pauses on arrival. */
 | "incident"
/** A minister offering to resign. It waits for a last call. */
 | "resignation-offer"
/** A market moving far enough in a week that the country noticed. It pauses on arrival. */
 | "market-shock"
/** A government abroad overthrown. It pauses on arrival where the President reads that government, and is logged otherwise. */
 | "coup" | "scenario";
export type AttentionMatter = {
    readonly id: string;
    readonly source: AttentionSource;
    readonly urgency: AttentionUrgency;
    readonly title: string;
    /** One sentence saying why it is on the desk. */
    readonly reason: string;
    /**
     * What this is materially *about*. Two matters sharing a subject are the same
     * problem told twice and only one of them is shown — which is the difference
     * between deduplicating and merely capping.
     */
    readonly subject: string;
    readonly date: GameDate;
    /** When it stops being deferrable. A hard matter without one never expires. */
    readonly dueDate?: GameDate;
    /** Flood control reads these: one actor, one place, one institution per stop. */
    readonly actor?: string;
    readonly locale?: string;
    readonly institution?: string;
    /** What on the ledger produced it, so the desk can show the trail. */
    readonly causeIds?: readonly CausalId[];
    /**
     * What the matter looks like right now, as far as the President is
     * concerned: its rung, its stance, how close its deadline is. The world stops
     * for a matter once per signature. A level that holds is not news the second
     * week; a worse rung, a closer deadline or a fresh approach is. A matter
     * without a signature stops the world every time it is asked about.
     */
    readonly signature?: string;
};
/**
 * Three. Not "three plus the urgent ones": a president reading four things is
 * reading a list, and a list is what this replaces.
 */
export declare const MAX_MATTERS_PER_STOP = 3;
export type AttentionStop = {
    /** At most three, hard first. Empty is a legitimate answer. */
    readonly presented: readonly AttentionMatter[];
    /** Real, still owed, not shown yet. Not lost. */
    readonly deferred: readonly AttentionMatter[];
    /** Everything that never competed for the three. */
    readonly ambient: readonly AttentionMatter[];
};
/**
 * Builds one attention stop out of everything the world raised.
 *
 * Ambient matters are separated first and never compete: they are the world's
 * pulse, and counting them against the three would let a quiet week full of
 * weather crowd out the one bill on the desk.
 */
export declare function composeAttentionStop(matters: readonly AttentionMatter[]): AttentionStop;
/**
 * Whether a stop is one the world should actually halt for.
 *
 * A stop with nothing presented is not a stop. This is the rule that lets a
 * quiet world stay quiet: the orchestrator keeps advancing rather than
 * manufacturing something to justify having paused.
 */
export declare function stopIsWarranted(stop: AttentionStop): boolean;
/**
 * A source of matters: a subsystem asked, on a given date, what it wants the
 * President for.
 *
 * Injected rather than imported so the orchestrator does not have to know every
 * subsystem — and so that authored content, which lives in a package that
 * depends on this one, can be a source without inverting the dependency.
 */
export type MatterSource<TState> = (state: TState, date: GameDate) => readonly AttentionMatter[];
/** Every source asked once, results concatenated. Order does not survive the sort. */
export declare function gatherMatters<TState>(state: TState, date: GameDate, sources: readonly MatterSource<TState>[]): readonly AttentionMatter[];
/**
 * How long a matter stays put off.
 *
 * Two lengths rather than one, because "not now" means something different
 * about a bill that becomes law by inaction than about a chair that has been
 * empty for a month. A soft matter goes away for a fortnight — long enough that
 * deferring is a real answer rather than a snooze the player pays for every
 * stop. A hard matter goes away for a week and no longer: a president may
 * decline to deal with a statutory deadline today, and may not decline to be
 * asked about it again before it arrives.
 */
export declare const DEFER_DAYS: Readonly<Record<Exclude<AttentionUrgency, "ambient">, number>>;
/**
 * The next day the presidency's own weekly cadence closes on: the weekday this
 * administration was sworn in on, on or after `from`.
 *
 * Anchored to the founding date rather than to the calendar's own week
 * boundary, so a lapsed deadline comes back on the same rhythm Continue
 * already keeps instead of a second schedule the player would have to learn.
 * Exported so a caller outside this file (the attention policy, a future
 * clock) can put a soft matter that lapsed while it waited on the same cadence
 * a hard one keeps once it has passed its own deadline.
 */
export declare function closingDayOnOrAfter(from: GameDate, foundingDate: GameDate): GameDate;
/**
 * The date a matter may interrupt again.
 *
 * Never past its own deadline. Deferring a hard matter to a day after the thing
 * expires would let the player put off a decision by outliving it, which is the
 * one outcome the deferral must not be able to buy.
 *
 * A deadline that has already arrived is the exception. Given a `foundingDate`
 * it is put off to the presidency's next closing day — at most once a week —
 * because held to its own date it was deferred to a day that
 * had already come, which is no deferral at all: a lapsed appropriation or a
 * warning that is due every week stopped the world before its first day on
 * every press, one day at a time, for as long as it stood. Without a
 * `foundingDate` (every caller before this one, and the ones this file's own
 * tests still exercise) it keeps putting the matter off exactly one day, which
 * is the older and narrower promise: the player has read it and let it lapse;
 * the day it lapses in runs, and if it still stands afterward it is presented
 * again the next day this call is made.
 */
export declare function deferUntil(matter: AttentionMatter, from: GameDate, foundingDate?: GameDate): GameDate;
/**
 * Whether this matter is currently put off.
 *
 * A deferral whose date has arrived is not consulted and not cleaned up here —
 * expiry is just "the date is not in the future", so a stale entry answers
 * `false` and costs nothing but its own bytes. `pruneDeferrals` is what removes
 * it, and it is called by the advance rather than by the reader, because a
 * reader that mutated state would make looking at the desk change the world.
 */
export declare function isDeferred(deferrals: Readonly<Record<string, GameDate>>, matterId: string, on: GameDate): boolean;
/** Everything still genuinely put off on this date. */
export declare function pruneDeferrals(deferrals: Readonly<Record<string, GameDate>>, on: GameDate): Readonly<Record<string, GameDate>>;
/** The matters a stop may still raise: everything the President has not put off. */
export declare function withoutDeferred(matters: readonly AttentionMatter[], deferrals: Readonly<Record<string, GameDate>>, on: GameDate): readonly AttentionMatter[];
/** What the President has already been stopped for, by matter id: the signature it carried. */
export type NoticeLedger = Readonly<Record<string, string>>;
/**
 * The matters the President has not yet been told about in their present form.
 *
 * Applied before the composer, like a deferral: a noticed matter that sat
 * first in the ranking would otherwise take one of the three places for nothing
 * and crowd out a matter that is news.
 */
export declare function withoutNoticed(matters: readonly AttentionMatter[], ledger: NoticeLedger | undefined): readonly AttentionMatter[];
/**
 * The ledger after a look: the presented matters recorded, and every entry
 * whose matter has gone away or changed form dropped.
 *
 * Dropping on absence is what re-arms a matter. A removal case that left reach
 * and came back is a fresh approach, and the ledger has to have forgotten the
 * last one by then. Returns the same object when nothing changed so an
 * unchanged look writes nothing.
 */
export declare function reviseNotices(ledger: NoticeLedger | undefined, gathered: readonly AttentionMatter[], presented: readonly AttentionMatter[]): NoticeLedger | undefined;
