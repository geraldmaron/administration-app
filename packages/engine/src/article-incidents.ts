import type { FeedItem } from "./state.js";

// How a home incident is written.
//
// The composer writes a condition the way it writes a war: as something the
// country is living through, with a week's worth of development behind it. An
// incident has none. A tornado touched down on Tuesday, and a piece that hedges
// about how the situation is developing is a piece about nothing — the whole
// story is what happened and what is left.
//
// Its own module because the composer is already at its budget and because the
// incident register is genuinely a different register, not a variant of the
// standing one.
//
// Four paragraphs and the same four every time, on purpose: what happened, where
// and to whom, what the federal government has said, and what is still open. An
// incident piece has no arc to draw a bank of variants from, and a rotating lede
// over a fixed set of facts is how a template starts reading like one.
//
// One piece per incident, and the condition phase files no item when an incident
// closes, so there is no second story to write in a register that has nothing
// left to say.

/** An incident piece: the same shape the composer returns, so the caller can fall through to it. */
export type IncidentArticle = {
  readonly headline: string;
  readonly body: readonly string[];
};

/** The tag the condition phase writes onto an incident's own feed item. */
export const INCIDENT_TAG = "incident";

/**
 * Whether the facts on this item mark an incident.
 *
 * Read off the item rather than the condition record, because the composer is
 * given a feed item and nothing else — which is also why the condition phase
 * tags the item at filing rather than leaving the register to infer it.
 */
function isIncident(item: FeedItem): boolean {
  return item.facts?.topicTags?.includes(INCIDENT_TAG) === true;
}

/** Where it happened, as a sentence can name it, or the country if the wire has no place. */
function where(item: FeedItem): string {
  return item.facts?.dateline ?? "the United States";
}

/**
 * The onset piece: it happened, and here is what is left of the place.
 *
 * The lede is the headline's own fact, not a rewrite of it, because the one
 * thing a reader of an incident story wants first is the event.
 */
function onsetBody(item: FeedItem): readonly string[] {
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
export function incidentArticle(item: FeedItem): IncidentArticle | undefined {
  if (!isIncident(item) || item.facts?.phase !== "onset") return undefined;
  return { headline: item.headline, body: onsetBody(item) };
}
