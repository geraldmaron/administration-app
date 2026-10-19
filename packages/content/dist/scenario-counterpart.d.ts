import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { ScenarioDef } from "./scenario.js";
export declare function rankedByField(campaign: Campaign, field: "tension" | "trust"): readonly NationId[];
export declare function bandMatches(campaign: Campaign, cast: Extract<ScenarioDef["cast"], {
    pick: "band";
}>): readonly NationId[];
/** The principal opposite the player in their hottest war. */
export declare function warCounterpart(campaign: Campaign): NationId | undefined;
/** A principal of the hottest war the player is not fighting. */
export declare function belligerent(campaign: Campaign, side?: "aggressor" | "defender"): NationId | undefined;
