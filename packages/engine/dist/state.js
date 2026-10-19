// Campaign state: the single import path for everything a campaign is.
//
// The shapes and the read path live in three modules beside this one — the
// campaign's own structure, the legislative and electoral branch, and the
// selectors — because one file carrying all of it had grown past the point
// where anything in it could be found. This stays the import every consumer
// uses: splitting the file was not an invitation to make callers learn which
// third of it a type happens to live in.
//
// Campaign state is plain, serializable, immutable data: no classes with
// behavior, no hidden references. That is what lets it be saved, replayed,
// structurally diffed, and rewound for timeline branching.
export * from "./state-campaign.js";
export * from "./state-legislature.js";
export * from "./state-budget.js";
export * from "./state-orders.js";
export * from "./state-selectors.js";
