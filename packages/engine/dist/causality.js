import { flagMarker } from "./marked-flags.js";
import { compareDates } from "./clock.js";
/**
 * Derived from the ledger's own length, which `apply()` grows by exactly one
 * per packet. Deterministic and collision-free without an RNG draw or a
 * counter on the Campaign: the same campaign replayed from the same seed
 * stamps the same ids in the same order.
 */
export function causalIdFor(turn, ledgerLength) {
    return `ev-${turn}-${ledgerLength}`;
}
/**
 * The origin a packet gets when its caller did not say — derived from `source`,
 * which every packet already carries, so an unmigrated call site produces an
 * honest classification rather than a placeholder.
 */
export function originForSource(source) {
    switch (source) {
        case "action":
        case "conversation":
            return "decision";
        case "operator":
        case "simulate":
            return "world";
        case "godmode":
            return "scheduled";
    }
}
/** The whole stamp, built where the ledger's length and the date are known. */
export function stampFor(source, provenance, turn, ledgerLength, createdDate) {
    return {
        ...(provenance ?? {}),
        origin: provenance?.origin ?? originForSource(source),
        eventId: causalIdFor(turn, ledgerLength),
        createdDate,
    };
}
function stampsOf(records) {
    return records.filter((r) => r.causal !== undefined);
}
function byId(records) {
    return new Map(records.map((r) => [r.causal.eventId, r]));
}
/** The events this one directly answers to. Order is the order they were named. */
export function selectCausesOf(ledger, eventId) {
    const index = byId(stampsOf(ledger));
    const target = index.get(eventId);
    if (!target)
        return [];
    return (target.causal.causeIds ?? []).flatMap((id) => {
        const found = index.get(id);
        return found ? [found] : [];
    });
}
/** Every event that names this one as a cause, directly. */
export function selectConsequencesOf(ledger, eventId) {
    return stampsOf(ledger).filter((r) => (r.causal.causeIds ?? []).includes(eventId));
}
/**
 * Walks causes upward until it reaches events that name none.
 *
 * A visited set rather than a depth cap: the graph is a DAG by construction
 * (a cause is always an event that already existed when the effect was
 * stamped, so an edge can only ever point backwards) but a corrupted save
 * should hang nothing.
 */
export function selectRootCausesOf(ledger, eventId) {
    const index = byId(stampsOf(ledger));
    const seen = new Set();
    const roots = [];
    const queue = [eventId];
    while (queue.length > 0) {
        const id = queue.shift();
        if (seen.has(id))
            continue;
        seen.add(id);
        const record = index.get(id);
        if (!record)
            continue;
        const causes = record.causal.causeIds ?? [];
        if (causes.length === 0) {
            if (id !== eventId)
                roots.push(record);
            continue;
        }
        queue.push(...causes);
    }
    return roots;
}
/**
 * The whole downstream cone of one decision — what it caused, what those
 * caused, all the way out. This is what a Record drill-in means by "legacy".
 */
export function selectDecisionLegacy(ledger, eventId) {
    const records = stampsOf(ledger);
    const seen = new Set([eventId]);
    const out = [];
    let frontier = [eventId];
    while (frontier.length > 0) {
        const next = [];
        for (const record of records) {
            const causes = record.causal.causeIds ?? [];
            if (seen.has(record.causal.eventId))
                continue;
            if (!causes.some((c) => frontier.includes(c)))
                continue;
            seen.add(record.causal.eventId);
            out.push(record);
            next.push(record.causal.eventId);
        }
        frontier = next;
    }
    return out;
}
function withinRange(stamp, range) {
    // The date a change *bit*, not the date it was decided: an effect scheduled
    // in March for July belongs to July's explanation of July's numbers.
    const date = stamp.effectiveDate ?? stamp.createdDate;
    return compareDates(date, range.from) >= 0 && compareDates(date, range.to) <= 0;
}
/**
 * Everything in a window that moved a given metric, newest first.
 *
 * Reads `cost` — the movement `apply()` already measures on the way through —
 * rather than re-deriving anything, so the answer to "why did this move" is
 * built from the same figures the player was charged.
 */
export function selectWhyMetricMoved(ledger, metric, range) {
    return ledger
        .flatMap((entry) => {
        const delta = entry.cost?.[metric];
        if (entry.causal === undefined || delta === undefined || delta === 0)
            return [];
        if (!withinRange(entry.causal, range))
            return [];
        return [{ ...entry, delta }];
    })
        .sort((a, b) => compareDates(b.causal.effectiveDate ?? b.causal.createdDate, a.causal.effectiveDate ?? a.causal.createdDate));
}
/** Everything that named this place. */
export function selectLocaleCauses(ledger, localeId) {
    return stampsOf(ledger).filter((r) => (r.causal.locales ?? []).includes(localeId));
}
/** Everything that named this institution, whether as actor or as subject. */
export function selectInstitutionCauses(ledger, institutionId) {
    return stampsOf(ledger).filter((r) => (r.causal.entities ?? []).includes(institutionId));
}
/** Everything a given subsystem produced. */
export function selectSystemCauses(ledger, system) {
    return stampsOf(ledger).filter((r) => (r.causal.systems ?? []).includes(system));
}
/**
 * The one integrity check the corpus and the harness both run: a stamped event
 * may not name a cause that is not itself on the ledger.
 *
 * This is what "no orphaned causal events" means operationally. It is exported
 * rather than kept in a test because the balance harness asserts it over
 * hundreds of seeded campaigns, and a rule proven only in a unit test is a rule
 * about a fixture.
 */
export function findOrphanedCauses(ledger) {
    const known = new Set(stampsOf(ledger).map((r) => r.causal.eventId));
    return stampsOf(ledger).flatMap((record) => (record.causal.causeIds ?? [])
        .filter((id) => !known.has(id))
        .map((missing) => ({ eventId: record.causal.eventId, missing })));
}
// --- What a decision left behind, and what it answers -----------------------
//
// The mechanism above works for a record: a condition, a trade measure or a
// nomination is created inside a fold, keeps the `causedBy` it was born with,
// and the phase that moves it months later reads the id off the record it is
// holding. A presidential decision creates none of those. It moves
// relationships, spends metrics and sets flags — and a flag is a bare string
// in a keyed set with nowhere to remember who wrote it. So the one actor whose
// acts the whole game is about was the one actor the graph could not follow.
//
// The two reads below close it without a second history. A decision declares
// the flags it set (`marks`), so a later situation gated on one of them can
// name the week it was set; and a decision between two governments names the
// last thing that passed between those two governments, because a president
// answering a capital is answering what that capital last did.
/**
 * The flags a packet actually sets, without the turn-stamps beside them.
 *
 * `markedFlags` writes each flag twice — the fact and the week it happened —
 * and only the first of the pair is a thing anything is gated on. The marker
 * is recognized by rebuilding it from its own writer rather than by matching a
 * prefix copied into this file, which is how the two would quietly stop
 * agreeing the next time the template moves.
 */
export function marksOfPacket(turn, effects) {
    const set = effects.flatMap((effect) => (effect.kind === "flag" ? (effect.set ?? []) : []));
    const markers = new Set(set.map((flag) => flagMarker(flag, turn)));
    return [...new Set(set.filter((flag) => !markers.has(flag)))];
}
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
export function withCausalMarks(packet) {
    if (!packet.provenance)
        return packet;
    const marks = marksOfPacket(packet.turn, packet.effects);
    if (marks.length === 0)
        return packet;
    return { ...packet, provenance: { ...packet.provenance, marks } };
}
/**
 * The event that left this marker on the board, or nothing.
 *
 * The most recent one, because a flag is a keyed fact rather than a tally: a
 * deed done twice writes the same key, and what the board is standing on is
 * the last time it was written.
 */
export function selectMarkOrigin(ledger, mark) {
    return stampsOf(ledger)
        .filter((record) => (record.causal.marks ?? []).includes(mark))
        .at(-1);
}
/**
 * The *first* event that left this marker, which is a different question from
 * the last one.
 *
 * A clock runs from when something started, not from the last time it was
 * mentioned: a program adopted in March and still running in July has been
 * standing since March, and reading the most recent mention would restart the
 * clock every week and leave it permanently about to begin.
 */
export function selectMarkOnset(ledger, mark) {
    return stampsOf(ledger).find((record) => (record.causal.marks ?? []).includes(mark));
}
/** The events behind a set of markers, de-duplicated, oldest first. */
export function selectMarkOrigins(ledger, marks) {
    const found = marks.flatMap((mark) => {
        const origin = selectMarkOrigin(ledger, mark);
        return origin ? [origin.causal.eventId] : [];
    });
    return [...new Set(found)];
}
/**
 * The last act on the record between two governments, whichever of them took
 * it.
 *
 * Both parties have to be named on the stamp, so this is the thread between
 * exactly these two capitals rather than everything either of them has been
 * doing. Only a decision counts: a drought in one of the two countries is not
 * something the other one said back.
 */
export function selectExchangeBetween(ledger, from, to) {
    if (from === to)
        return undefined;
    return stampsOf(ledger)
        .filter((record) => {
        if (record.causal.origin !== "decision")
            return false;
        const entities = record.causal.entities ?? [];
        return entities.includes(from) && entities.includes(to);
    })
        .at(-1);
}
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
export function decisionCauses(ledger, subject) {
    return [...new Set(selectMarkOrigins(ledger, subject.gatedOn ?? []))];
}
// --- The event a handler is inside of --------------------------------------
/**
 * The id of the event currently being folded, for the handlers that create
 * something the campaign will still be holding in ten weeks.
 *
 * The graph was broad and shallow for one structural reason: a call site
 * cannot name a cause it has no id for. A tariff signed in March and the
 * retaliation that lands in May are produced by two different functions weeks
 * apart, and the second one holds only the retaliation record — so the only
 * way it can ever name the first is if the record itself remembers what
 * created it.
 *
 * That id is knowable in exactly one place. `apply()` stamps it from the
 * ledger's length before folding anything, opens a fold here, and a handler
 * can then write it onto the record it is creating. Kept in module scope for
 * the duration of one fold rather than threaded through every handler
 * signature: thirty-five handlers take (Campaign, Effect) and four of them
 * need this.
 *
 * It lives beside the graph rather than beside the fold because both `apply()`
 * and the domain writers it calls already depend on this module, and putting
 * it in `effects.ts` would have made every writer import the mutator it is
 * called by.
 */
let foldingEventId;
/**
 * Opens a fold and returns the function that closes it.
 *
 * The previous id is restored rather than cleared, because `apply()` is
 * re-entrant through handlers that apply a nested packet; clearing would leave
 * the outer fold stamping nothing for every effect after the nested one.
 */
export function enterFold(eventId) {
    const previous = foldingEventId;
    foldingEventId = eventId;
    return () => {
        foldingEventId = previous;
    };
}
/**
 * The event a handler is currently part of, or nothing when it is being called
 * outside `apply()`. A record stamped with nothing is a root, which is honest:
 * it was not created by anything the ledger knows about.
 */
export function currentEventId() {
    return foldingEventId;
}
