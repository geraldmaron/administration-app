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
export type * from "./state-cabinet-agenda.js";
export * from "./state-legislature.js";
export * from "./state-budget.js";
export type * from "./state-ties.js";
export * from "./state-orders.js";
export * from "./state-selectors.js";
// MAX_STATE_MARKS / MAX_STATE_CLAIMS stay import-direct from state-geography.js,
// the same way STATE_LEAN_DRIFT stays import-direct from states.js — this
// barrel is selectors, types and the diff only, per the test below.
export type {
  GrievanceMark,
  PendingClaim,
  SenateSeat,
  StateDelegation,
  GovernorStanding,
  StateRuntime,
} from "./state-geography.js";
export type { CohortStrain } from "./demos.js";
export type * from "./state-world.js";
