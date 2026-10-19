import { readingBand } from "../reading.js";
function pluralize(count, noun) {
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
/**
 * What is pressing on this body today.
 *
 * A vacancy owns the reading while the chair is open. After that, a backlog
 * bigger than a normal room can ignore owns it. Only when neither is true does
 * the delivery band itself speak first.
 */
export function bodyLoad(runtime) {
    if (runtime.vacancy) {
        return {
            figure: `Empty ${pluralize(runtime.vacantDays, "day")}`,
            detail: runtime.actingLeader ? "Someone is filling in" : "Nobody is filling in",
            stance: runtime.actingLeader ? "caution" : "adverse",
            share: runtime.actingLeader ? Math.min(1, runtime.vacantDays / 180) : 1,
        };
    }
    const owed = Math.round(runtime.backlog);
    if (owed > 0) {
        return {
            figure: `${owed} waiting`,
            detail: owed >= 20 ? "Backlog is high" : "Backlog is growing",
            stance: owed >= 40 ? "adverse" : "caution",
            share: Math.min(1, owed / 40),
        };
    }
    const delivery = readingBand("standing", runtime.implementationQuality) ?? {
        word: "Fair",
        stance: "neutral",
    };
    const directives = runtime.directives.length;
    return {
        figure: delivery.word,
        detail: directives === 0 ? "No orders under way" : `${pluralize(directives, "order")} under way`,
        stance: delivery.stance,
        share: runtime.implementationQuality,
    };
}
