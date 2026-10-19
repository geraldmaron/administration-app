// Answering a scenario closes the case of the same id, when one is open.
// A desk with no case yet is left alone: the reply does not invent one.
import { addDays, compareDates, isOpenCase } from "@admin/engine";
import { scenarioOccurrenceKey } from "./scenario-occurrence.js";
export function scenarioCaseId(scenario) {
    return `scenario:${typeof scenario === "string" ? scenario : scenarioOccurrenceKey(scenario)}`;
}
export function scenarioAnswerEffect(campaign, scenarioId, replyId) {
    const id = scenarioCaseId(scenarioId);
    const item = campaign.cases?.[id];
    if (item === undefined || !isOpenCase(item.status) || !item.allowedDispositions.includes("act"))
        return undefined;
    return {
        kind: "case",
        actor: "player",
        transition: {
            id,
            disposition: { kind: "act", actionId: replyId },
            narration: "Answered.",
        },
    };
}
/**
 * Putting a scenario matter off, said to its case as well.
 *
 * A scenario matter and its case are one document. A deferral recorded only on
 * the matter leaves the case believing it is still today's work, and the frozen
 * decision comes back on the next read however often it is put off.
 */
export function scenarioPutOffEffect(campaign, matterId, until) {
    const item = campaign.cases?.[matterId];
    if (item === undefined || item.kind !== "authored-scenario" || !isOpenCase(item.status) || !item.allowedDispositions.includes("defer")) {
        return undefined;
    }
    // A decision is never put off past its own window: it comes back for its last
    // day instead, and a window with no day left to put it off to lapses as it is.
    const lastDay = item.clock.kind === "none" ? until : addDays(item.clock.dueAt, -1);
    const held = compareDates(until, lastDay) < 0 ? until : lastDay;
    if (compareDates(held, campaign.calendar) <= 0)
        return undefined;
    return {
        kind: "case",
        actor: "player",
        transition: { id: matterId, disposition: { kind: "defer", until: held }, narration: "Put off." },
    };
}
