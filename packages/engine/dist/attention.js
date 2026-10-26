import { addDays, compareDates, weekdayOf } from "./clock.js";
/**
 * Three. Not "three plus the urgent ones": a president reading four things is
 * reading a list, and a list is what this replaces.
 */
export const MAX_MATTERS_PER_STOP = 3;
const URGENCY_RANK = { hard: 0, soft: 1, ambient: 2 };
/**
 * Hard before soft; within a rank, the nearest deadline first, then the oldest.
 * A matter with no deadline sorts behind every matter that has one — a
 * standing worry does not outrank a thing that expires.
 */
function byPriority(a, b) {
    const rank = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (rank !== 0)
        return rank;
    if (a.dueDate && b.dueDate) {
        const due = compareDates(a.dueDate, b.dueDate);
        if (due !== 0)
            return due;
    }
    else if (a.dueDate !== b.dueDate) {
        return a.dueDate ? -1 : 1;
    }
    return compareDates(a.date, b.date);
}
/**
 * Whether this stop already holds something that would make the new matter feel
 * like the same problem again.
 *
 * Subject is the identity check. Actor, locale and institution are the flood
 * check: three matters about Michigan, or three about the same capital, is a
 * stop that reads as one event no matter how differently the three are worded.
 * Kind is deliberately NOT part of this — two unrelated court rulings are two
 * problems, and collapsing them would hide one.
 */
function collidesWith(chosen, candidate) {
    return chosen.some((held) => held.subject === candidate.subject ||
        (candidate.actor !== undefined && held.actor === candidate.actor) ||
        (candidate.locale !== undefined && held.locale === candidate.locale) ||
        (candidate.institution !== undefined && held.institution === candidate.institution));
}
/**
 * Builds one attention stop out of everything the world raised.
 *
 * Ambient matters are separated first and never compete: they are the world's
 * pulse, and counting them against the three would let a quiet week full of
 * weather crowd out the one bill on the desk.
 */
export function composeAttentionStop(matters) {
    const ambient = matters.filter((m) => m.urgency === "ambient");
    const candidates = [...matters.filter((m) => m.urgency !== "ambient")].sort(byPriority);
    const presented = [];
    const deferred = [];
    const seenIds = new Set();
    for (const matter of candidates) {
        if (seenIds.has(matter.id))
            continue;
        seenIds.add(matter.id);
        if (presented.length < MAX_MATTERS_PER_STOP && !collidesWith(presented, matter)) {
            presented.push(matter);
        }
        else {
            deferred.push(matter);
        }
    }
    return { presented, deferred, ambient };
}
/**
 * Whether a stop is one the world should actually halt for.
 *
 * A stop with nothing presented is not a stop. This is the rule that lets a
 * quiet world stay quiet: the orchestrator keeps advancing rather than
 * manufacturing something to justify having paused.
 */
export function stopIsWarranted(stop) {
    return stop.presented.length > 0;
}
/** Every source asked once, results concatenated. Order does not survive the sort. */
export function gatherMatters(state, date, sources) {
    return sources.flatMap((source) => source(state, date));
}
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
export const DEFER_DAYS = {
    soft: 14,
    hard: 7,
};
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
export function closingDayOnOrAfter(from, foundingDate) {
    const target = weekdayOf(foundingDate);
    let day = from;
    while (weekdayOf(day) !== target)
        day = addDays(day, 1);
    return day;
}
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
export function deferUntil(matter, from, foundingDate) {
    if (matter.urgency === "ambient")
        return from;
    const until = addDays(from, DEFER_DAYS[matter.urgency]);
    if (matter.dueDate && compareDates(matter.dueDate, until) < 0) {
        if (compareDates(matter.dueDate, from) > 0)
            return matter.dueDate;
        return foundingDate ? closingDayOnOrAfter(addDays(from, 1), foundingDate) : addDays(from, 1);
    }
    return until;
}
/**
 * Whether this matter is currently put off.
 *
 * A deferral whose date has arrived is not consulted and not cleaned up here —
 * expiry is just "the date is not in the future", so a stale entry answers
 * `false` and costs nothing but its own bytes. `pruneDeferrals` is what removes
 * it, and it is called by the advance rather than by the reader, because a
 * reader that mutated state would make looking at the desk change the world.
 */
export function isDeferred(deferrals, matterId, on) {
    const until = deferrals[matterId];
    return until !== undefined && compareDates(on, until) < 0;
}
/** Everything still genuinely put off on this date. */
export function pruneDeferrals(deferrals, on) {
    const live = Object.entries(deferrals).filter(([, until]) => compareDates(on, until) < 0);
    return live.length === Object.keys(deferrals).length ? deferrals : Object.fromEntries(live);
}
/** The matters a stop may still raise: everything the President has not put off. */
export function withoutDeferred(matters, deferrals, on) {
    return matters.filter((matter) => !isDeferred(deferrals, matter.id, on));
}
/**
 * The matters the President has not yet been told about in their present form.
 *
 * Applied before the composer, like a deferral: a noticed matter that sat
 * first in the ranking would otherwise take one of the three places for nothing
 * and crowd out a matter that is news.
 */
export function withoutNoticed(matters, ledger) {
    if (ledger === undefined)
        return matters;
    return matters.filter((matter) => matter.signature === undefined || ledger[matter.id] !== matter.signature);
}
/**
 * The ledger after a look: the presented matters recorded, and every entry
 * whose matter has gone away or changed form dropped.
 *
 * Dropping on absence is what re-arms a matter. A removal case that left reach
 * and came back is a fresh approach, and the ledger has to have forgotten the
 * last one by then. Returns the same object when nothing changed so an
 * unchanged look writes nothing.
 */
export function reviseNotices(ledger, gathered, presented) {
    const current = new Map(gathered.map((matter) => [matter.id, matter.signature]));
    const next = {};
    for (const [id, signature] of Object.entries(ledger ?? {})) {
        if (current.get(id) === signature)
            next[id] = signature;
    }
    for (const matter of presented) {
        if (matter.signature !== undefined)
            next[matter.id] = matter.signature;
    }
    const before = ledger ?? {};
    const same = Object.keys(next).length === Object.keys(before).length && Object.entries(next).every(([id, sig]) => before[id] === sig);
    if (same)
        return ledger;
    return Object.keys(next).length === 0 ? undefined : next;
}
