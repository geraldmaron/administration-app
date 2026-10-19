import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type CollectionProduct, type CollectionTasking } from "./intelligence.js";
export declare function draftCollectionProduct(campaign: Campaign, tasking: CollectionTasking, day: number, weight: number): CollectionProduct;
export declare function draftSurveillanceProduct(campaign: Campaign, target: NationId, day: number, id: string, exposed: boolean): CollectionProduct;
