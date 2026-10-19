import type { Campaign } from "@admin/engine";
import { type NationId } from "@admin/world";
import { type ForcePlacement } from "../geo/force-placement";
/** US personnel by host government, sea zones left to the force marks. */
export declare function forcesByHost(campaign: Campaign): ReadonlyMap<string, number>;
/** The US placements inside one host government, installations first. */
export declare function usForcesIn(campaign: Campaign, nation: NationId): readonly ForcePlacement[];
