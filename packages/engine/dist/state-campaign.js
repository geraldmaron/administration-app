export function relationshipKey(from, to) {
    return `${from}:${to}`;
}
/**
 * Who ordered an action, read from the nation that took it rather than from
 * the subsystem that ran it. The player's own ops and an NPC's go through one
 * resolver, so the resolver cannot tell them apart by how it was called — but
 * it can always tell them apart by whose nation is acting, which is the fact
 * itself rather than a proxy for it.
 */
export function actorForNation(campaign, acting) {
    return acting === campaign.founding.nation ? "player" : "world";
}
/**
 * The particulars an article is written from.
 *
 * A headline states what happened; a piece behind it has to say who it happened
 * to and what turns on it, or it is three paragraphs of atmosphere that would
 * read identically under any other headline. Every field is optional because a
 * feed item is produced in twenty places and not all of them know all of this —
 * but a site that knows a name or a number should hand it over, because the
 * composer cannot invent one and will not pretend to.
 */
/**
 * Scenario-class vocabulary shared with authored content scene facets.
 *
 * Exported as a value, not only as the source of the type: a validator on the
 * other side of the contract needs the list at runtime to check a class it was
 * handed, and without the export the array reads as dead to every linter that
 * cannot follow `typeof X[number]`.
 */
export * from "./state-feed.js";
export * from "./state-commitments.js";
export * from "./state-removal.js";
export { diffCampaign } from "./campaign-diff.js";
