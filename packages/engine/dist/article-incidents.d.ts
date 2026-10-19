import type { FeedItem } from "./state.js";
/** An incident piece: the same shape the composer returns, so the caller can fall through to it. */
export type IncidentArticle = {
    readonly headline: string;
    readonly body: readonly string[];
};
/** The tag the condition phase writes onto an incident's own feed item. */
export declare const INCIDENT_TAG = "incident";
/**
 * The piece for an item whose facts mark an incident, or nothing.
 *
 * Nothing for an ordinary condition, which the composer's standing register is
 * written for. An incident files exactly one item — its onset — because the close
 * of something that was over the moment it happened is not news, so there is
 * only ever the one piece to write.
 */
export declare function incidentArticle(item: FeedItem): IncidentArticle | undefined;
