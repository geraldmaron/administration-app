import { type CityId, type NationId, type StateId } from "@admin/world";
import { type ConditionKind } from "./condition-kinds.js";
import type { Campaign, ConditionScope } from "./state.js";
/**
 * One item drawn in proportion to its weight off a roll in [0, 1). Negative
 * weights count as nothing, and a list whose weights are all nothing is drawn
 * evenly rather than refused, so a caller with no signal still gets a pick.
 */
export declare function pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number, roll: number): T;
export declare function placeUsOnset(campaign: Campaign, nation: NationId, kind: ConditionKind, scope: ConditionScope, roll: number): {
    readonly city?: CityId;
    readonly state?: StateId;
};
export declare function placeCaption(campaign: Campaign, place: {
    readonly city?: CityId;
    readonly state?: StateId;
}, scope: ConditionScope, population?: number): string;
