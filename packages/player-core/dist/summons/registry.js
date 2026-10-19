import { compareDates } from "@admin/engine";
import { CLOCKS } from "./clocks";
import { SUMMONS_DUE } from "./due";
/** Loudest first: a lapsed obligation outranks a closing one, which outranks the calendar. */
const URGENCY_RANK = {
    due: 0,
    closing: 1,
    standing: 2,
};
export function specFor(id) {
    return CLOCKS.find((spec) => spec.id === id);
}
/**
 * Every clock that currently wants the President, ranked, with no prose written.
 *
 * This is what the attention layer reads. `compose` is not called: a brief
 * reaches the owning room's advisor, and the loop asks all fourteen clocks on
 * every tick of every run. Ranking is on the day rather than the turn, so a
 * report owed in two days outranks one owed in six instead of tying with it.
 */
export function dueClocks(campaign) {
    return SUMMONS_DUE.flatMap((spec) => {
        const due = spec.due(campaign);
        return due === undefined ? [] : [{ spec, due }];
    }).sort((a, b) => URGENCY_RANK[a.due.urgency] - URGENCY_RANK[b.due.urgency] ||
        compareDates(a.due.dueDate, b.due.dueDate) ||
        a.spec.id.localeCompare(b.spec.id));
}
/**
 * Whether a running clock is one the presidency cannot simply carry on past.
 *
 * Only the ones actually due: an interruption-class clock that is merely
 * visible on the calendar — an election eleven months out — is a document until
 * the week it lands. A sheet that opened every week for the same distant date is
 * a sheet the player learns to dismiss without reading.
 */
export function stopsTheWeek(clock) {
    return clock.spec.class === "interruption" && clock.due.urgency === "due";
}
/**
 * The same clocks, composed — for the inbox, the folio and the Record.
 *
 * A spec whose `due` returns nothing has no subject this week — no bill on the
 * desk, no nomination pending — and contributes nothing at all rather than an
 * empty row. `compose` runs only for the clocks that survived that filter, so
 * a quiet week does no work and shows no summons.
 */
export function dueSummonses(campaign) {
    return dueClocks(campaign).map((clock) => {
        const spec = specFor(clock.spec.id);
        // Unreachable while both lists come from `SUMMONS_DUE`; the throw is what
        // makes that an invariant rather than a silently dropped row.
        if (spec === undefined)
            throw new Error(`No composed clock answers to ${clock.spec.id}.`);
        return { spec, due: clock.due, brief: spec.compose(campaign) };
    });
}
/**
 * One clock, running or not, as a document.
 *
 * The re-read path: the Record opens any clock by id at any time, and a clock
 * whose subject has gone answers with its own quiet reading instead of a
 * closed door. Returns nothing only for an id no spec claims, which is a bad
 * link rather than a stopped clock.
 */
export function summonsReading(campaign, id) {
    const spec = CLOCKS.find((entry) => entry.id === id);
    if (spec === undefined)
        return undefined;
    return { spec, due: spec.due(campaign), brief: spec.compose(campaign) };
}
/** Every clock the presidency carries, running first, for the Record's index. */
export function allReadings(campaign) {
    const running = dueSummonses(campaign);
    const runningIds = new Set(running.map((summons) => summons.spec.id));
    return [
        ...running,
        ...CLOCKS.filter((spec) => !runningIds.has(spec.id)).map((spec) => ({
            spec,
            brief: spec.compose(campaign),
        })),
    ];
}
