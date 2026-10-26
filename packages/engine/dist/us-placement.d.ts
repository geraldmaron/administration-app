import { type CityId, type NationId, type StateId } from "@admin/world";
import type { ConditionKind } from "./condition-kinds.js";
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
/**
 * The states a nationwide condition actually reaches.
 *
 * A nation-scope hazard names no single place, and reading that as all
 * fifty-one states filed a governor's request from Alaska for a heat wave. The
 * reach is the eligible states of one Census region, the region drawn through
 * the same weights a regional event uses, so a nationwide hurricane season is
 * the Gulf and Atlantic South and a nationwide heat wave is one region's
 * summer. Disease is the exception the gate already states: every state is
 * eligible for an epidemic, and a nationwide one is everywhere. A kind with no
 * geography (a recession, a strike) reaches the whole country.
 */
export declare function nationFootprint(campaign: Campaign, kind: ConditionKind, roll: number): readonly StateId[];
export declare function placeCaption(campaign: Campaign, place: {
    readonly city?: CityId;
    readonly state?: StateId;
}, scope: ConditionScope, population?: number): string;
