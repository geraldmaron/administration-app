// One office day's held documents: lapse what closes today, then admit what
// the sources stage for today. With no sources passed, the day is unchanged.
import { isSameDate } from "./clock.js";
import { apply } from "./effects.js";
function book(state, effect) {
    return {
        source: "simulate",
        actor: "world",
        turn: state.turn,
        background: true,
        narration: { summary: "The desk updated the documents it is holding." },
        effects: [effect],
    };
}
function closingToday(state) {
    const held = state.docket ?? [];
    return held.filter((entry) => isSameDate(entry.closes, state.calendar));
}
function foldLapses(state, sources) {
    const closing = closingToday(state);
    if (closing.length === 0)
        return state;
    const packets = sources.flatMap((source) => source(state, closing, state.calendar));
    const charged = packets.reduce((acc, packet) => apply(acc, packet), state);
    return apply(charged, book(charged, { kind: "docket", remove: closing.map((entry) => entry.id) }));
}
function foldAdmissions(state, sources) {
    const admit = sources.flatMap((source) => source(state, state.calendar));
    if (admit.length === 0)
        return state;
    return apply(state, book(state, { kind: "docket", admit }));
}
/**
 * Runs the held-docket sources for the day the campaign is already on.
 *
 * An absent docket becomes an empty list once sources are passed, even when
 * nothing is admitted, so the next day is not treated as another first day.
 */
export function settleHeldDocket(state, options) {
    if (options.stagingSources === undefined && options.lapseSources === undefined)
        return state;
    const lapsed = foldLapses(state, options.lapseSources ?? []);
    const admitted = foldAdmissions(lapsed, options.stagingSources ?? []);
    if (admitted.docket !== undefined)
        return admitted;
    return { ...admitted, docket: [] };
}
