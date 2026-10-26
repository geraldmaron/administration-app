import { recordSolicitorGeneral } from "./solicitor-general.js";
import { currentEventId } from "./causality.js";
import { appendWithinCap } from "./feed-cap.js";
import { fileAtDesks } from "./press-filing.js";
/**
 * Replace one record whole, by its own id, keeping its place in the graph.
 *
 * Whole rather than patched, for the reason each of these types was given its
 * own comment when it was added separately: these are small records with a
 * status, and patching one field of one from two places is how a suspended
 * commitment ends up still being paid for.
 *
 * The one thing that is not replaced is `causedBy`. It is written once, when
 * the record first appears, from the event being folded — and every later
 * write of the same id inherits it, because a record does not get a new origin
 * story every week. A caller that supplies one explicitly wins, so a migration
 * or a test can pin it.
 */
function setById(current, set) {
    const existing = current[set.id];
    // Stamped only where the record is new. An existing record inherits what it
    // already had and nothing more — including nothing, which is what a record
    // written by an older build carries. Stamping one of those with the week it
    // next happened to change would claim the drought started in June because
    // June is when it got worse, which is a fabricated cause and worse than an
    // absent one.
    const inherited = set.causedBy ?? (existing ? existing.causedBy : currentEventId());
    const record = inherited === undefined || inherited === set.causedBy ? set : { ...set, causedBy: inherited };
    return { ...current, [set.id]: record };
}
export function applyCommitment(state, effect) {
    return { ...state, commitments: setById(state.commitments, effect.set) };
}
export function applyCondition(state, effect) {
    return { ...state, conditions: setById(state.conditions, effect.set) };
}
export function applyPursuit(state, effect) {
    return { ...state, pursuits: setById(state.pursuits, effect.set) };
}
export function applyEmergency(state, effect) {
    return { ...state, emergencies: setById(state.emergencies, effect.set) };
}
export function applyAuthorityClock(state, effect) {
    return { ...state, authorityClocks: setById(state.authorityClocks ?? {}, effect.set) };
}
export function applyExternalEmergency(state, effect) {
    return { ...state, externalEmergencies: setById(state.externalEmergencies ?? {}, effect.set) };
}
function setInList(list, set) {
    return list.some((entry) => entry.id === set.id)
        ? list.map((entry) => (entry.id === set.id ? set : entry))
        : [...list, set];
}
export function applyCourtCase(state, effect) {
    return { ...state, judiciary: { ...state.judiciary, cases: setInList(state.judiciary.cases, effect.set) } };
}
export function applyCourtProceeding(state, effect) {
    return { ...state, judiciary: { ...state.judiciary, proceedings: setInList(state.judiciary.proceedings ?? [], effect.set) } };
}
export function applySolicitorGeneral(state, effect) {
    return { ...state, judiciary: { ...state.judiciary,
            solicitorGeneral: recordSolicitorGeneral(state.judiciary.solicitorGeneral, effect.event) } };
}
export function applyPendingRule(state, effect) {
    return { ...state, pendingRules: setInList(state.pendingRules, effect.set) };
}
export function applyCapRaise(state, effect) {
    return { ...state, capRaises: setInList(state.capRaises, effect.set) };
}
export function applyOrderFraming(state, effect) {
    const record = state.orders.find((entry) => entry.id === effect.id);
    if (!record)
        throw new Error(`no executive order ${effect.id} to frame`);
    if (record.framing)
        throw new Error(`executive order ${effect.id} has already been framed`);
    return {
        ...state,
        orders: state.orders.map((entry) => (entry.id === effect.id ? { ...entry, framing: effect.framing } : entry)),
    };
}
export function applyFundingLapse(state, effect) {
    return { ...state, lapses: setInList(state.lapses, effect.set) };
}
export function applyAppropriation(state, effect) {
    const { appropriation } = state.congress;
    return {
        ...state,
        congress: {
            ...state.congress,
            appropriation: {
                ...appropriation,
                onPriorYear: true,
                priorYear: [],
                // Never shortens. A stopgap passed while the money has not yet run out
                // buys weeks the government already had, and taking them away would be
                // a continuing resolution that closed the government.
                throughTurn: Math.max(appropriation.throughTurn, "throughTurn" in effect ? effect.throughTurn : state.turn + effect.fundTurns),
            },
        },
    };
}
// The turn an item is filed under is written here and nowhere else. Producers
// used to stamp it themselves, and they disagreed: a phase writing `state.turn`
// filed its story a week before the ledger entry its own packet made, because
// the tick restamps the packet to the turn it closes and never looked inside
// it. A dispatch printed its date off the one and the Record off the other.
// Inside a fold the packet's turn is known — it is in the event id `apply()`
// stamps before any handler runs, the id its ledger entry carries — so every
// item takes that turn, whatever its producer guessed.
const EVENT_ID = /^ev-(\d+)-\d+$/;
function foldingTurn() {
    const eventId = currentEventId();
    if (eventId === undefined)
        return undefined;
    const match = EVENT_ID.exec(eventId);
    if (!match)
        throw new Error(`a feed item was filed inside event "${eventId}", which names no turn to file it under`);
    return Number(match[1]);
}
// The day, like the turn, is the filing's and not the producer's: an item is
// dated the day the campaign stood on when it was filed, whatever it carried.
//
// The append itself goes through the week's cap, so a producer cannot flood the
// wire and none has to know the rule. Stamping happens first, because the cap
// counts a week by the dates it is about to write.
export function applyFeed(state, effect) {
    const turn = foldingTurn();
    const date = state.calendar;
    // Filed at desks once the turn and day are stamped: the desk is chosen off the
    // item's own content and the week's load, and its stance is the corps's today.
    const items = fileAtDesks(state, effect.items.map((item) => ({ ...item, ...(turn === undefined ? {} : { turn }), date })));
    return appendWithinCap(state, items);
}
