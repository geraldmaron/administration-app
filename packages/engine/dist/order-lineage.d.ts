import type { NationStatEffect } from "./effect-types.js";
import { type PolicyStatPath } from "./policy-stats.js";
import type { Campaign, NationRuntime } from "./state.js";
/** An absolute set ends attribution for this path; a later owned move starts a new chain. */
export declare function recordStatLineage(state: Campaign, effect: NationStatEffect, before: NationRuntime, after: NationRuntime): Campaign;
export declare function ownerWeight(state: Campaign, ownerId: string, weight: number): {
    readonly state: Campaign;
    readonly movement?: Partial<Record<PolicyStatPath, number>>;
    readonly unknown?: true;
};
