import type { NationId } from "@admin/world";
import type { Campaign, NationCondition } from "./state.js";
import type { ImpactEventEffect, ImpactExposure } from "./impact-event.js";
/** A stated proxy until a case provides actual exposure and resilience data. */
export declare function countryExposure(campaign: Campaign, nation: NationId, population: number): ImpactExposure;
export declare function conditionImpactEvent(campaign: Campaign, condition: NationCondition): readonly ImpactEventEffect[];
export declare function cyberImpactEvent(campaign: Campaign, nation: NationId, operator: string): readonly ImpactEventEffect[];
