/** The tag the condition phase writes onto an incident's own feed item. */
export const INCIDENT_TAG = "incident";
/**
 * Whether the facts on this item mark an incident.
 *
 * Read off the item rather than the condition record, because the composer is
 * given a feed item and nothing else — which is also why the condition phase
 * tags the item at filing rather than leaving the register to infer it.
 */
function isIncident(item) {
    return item.facts?.topicTags?.includes(INCIDENT_TAG) === true;
}
/** Where it happened, as a sentence can name it, or the country if the wire has no place. */
function where(item) {
    return item.facts?.dateline ?? "the United States";
}
/**
 * The onset piece: it happened, and here is what is left of the place.
 *
 * The lede is the headline's own fact, not a rewrite of it, because the one
 * thing a reader of an incident story wants first is the event.
 */
function onsetBody(item) {
    const place = where(item);
    return [
        item.headline,
        `The damage is in ${place}, and it is what it is: the count of what was lost will move for a few days and then stop moving.`,
        "Federal responders are on the ground with the state's own emergency management, and the question in front of the administration is the size of the help rather than whether to send it.",
        `Nothing about next week is a continuation of this. ${place} will be rebuilding for a season, and the emergency itself is over.`,
    ];
}
/**
 * The piece for an item whose facts mark an incident, or nothing.
 *
 * Nothing for an ordinary condition, which the composer's standing register is
 * written for. An incident files exactly one item — its onset — because the close
 * of something that was over the moment it happened is not news, so there is
 * only ever the one piece to write.
 */
export function incidentArticle(item) {
    if (!isIncident(item) || item.facts?.phase !== "onset")
        return undefined;
    return { headline: item.headline, body: onsetBody(item) };
}
