// Prices a held document once, on the day its window closes, if it is still
// unanswered and was not already priced this week. Marks each charge it makes
// with `docket-silence:<id>` so Continue's weekly silence does not bill the same
// document a second time in a later week, and reads the ledger so a Continue that
// already priced this holding is not doubled when the window finally closes.
import { flagMarker, selectTurnOfDate } from "@admin/engine";
import { inactionPacket, scenarioOccurrenceKey, scenarioUnansweredFlag } from "@admin/content";
import { unansweredScenarioCasts } from "./scenario-cases";
import { pendingConversations, scenarioMatterId } from "./scripts";
/**
 * Whether this document already had its silence priced this week.
 *
 * `inactionPacket` stamps a turn-scoped marker. Reading it back is what keeps
 * a one-day step from billing the same silence twice.
 */
export function chargedThisWeek(campaign, scenarioId) {
    return campaign.player.flags[flagMarker(scenarioUnansweredFlag(scenarioId), campaign.turn)] === true;
}
/**
 * The durable mark that the held docket, not Continue, priced this scenario's
 * silence. Continue reads it to avoid a second weekly charge for a document the
 * docket already closed the book on. Kept distinct from the durable
 * `scenario-unanswered:` flag, which Continue also sets — that flag marks any
 * silence, and using it to gate Continue would silence documents the docket
 * never held.
 */
export function docketSilenceFlag(scenarioId) {
    return `docket-silence:${scenarioId}`;
}
/** Whether the held docket has already charged this scenario's silence. */
export function docketSilenced(campaign, scenarioId) {
    return campaign.player.flags[docketSilenceFlag(scenarioId)] === true;
}
/**
 * Whether an inaction for this scenario was already billed within this holding.
 *
 * A ten-day window crosses a turn, so a Continue that priced the document a week
 * before it closes is not caught by `chargedThisWeek`. The ledger is: a
 * `scenario-unanswered:<id>` mark on any turn at or after the turn the entry
 * arrived is this holding's charge, and the close must not add a second.
 */
function chargedSinceArrival(campaign, scenarioId, arrives) {
    const arrivalTurn = selectTurnOfDate(campaign, arrives);
    const mark = scenarioUnansweredFlag(scenarioId);
    return campaign.ledger.some((entry) => entry.turn >= arrivalTurn && (entry.causal?.marks ?? []).includes(mark));
}
// A decision's case can lapse days before the desk's hold on the document
// closes, because the case is raised when the week's pick is frozen and the
// document is admitted on its own office day. The lapsed one is still owed its
// price when the hold closes, or letting the case run out would be free.
function castById(campaign) {
    const casts = [...unansweredScenarioCasts(campaign), ...pendingConversations(campaign)];
    return new Map(casts.map((cast) => [scenarioMatterId(scenarioOccurrenceKey(cast)), cast]));
}
function lapsePacket(campaign, casts, entry) {
    const cast = casts.get(entry.id);
    if (!cast)
        return undefined;
    if (cast.orderCase?.posture === "adverse-lower")
        return undefined;
    const occurrence = scenarioOccurrenceKey(cast);
    if (chargedThisWeek(campaign, occurrence) || chargedSinceArrival(campaign, occurrence, entry.arrives))
        return undefined;
    const packet = inactionPacket(campaign, cast);
    // The mark rides on the charge itself rather than being written into content:
    // Continue's weekly silence reads it and steps around this document.
    return { ...packet, effects: [...packet.effects, { kind: "flag", set: [docketSilenceFlag(occurrence)] }] };
}
/** The clock's lapse source. An answered document is already gone, so it is not charged. */
export function scenarioLapseSource() {
    return (campaign, closing) => {
        const casts = castById(campaign);
        return closing.flatMap((entry) => {
            const packet = lapsePacket(campaign, casts, entry);
            return packet ? [packet] : [];
        });
    };
}
