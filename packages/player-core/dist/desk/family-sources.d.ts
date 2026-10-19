import { type Campaign } from "@admin/engine";
import { type FamilySource } from "./family-raise";
/** Court cases represented by an open authored answer remain live while their duplicate row is hidden. */
export declare function authoredCourtResponseIds(campaign: Campaign): ReadonlySet<string>;
/** The budget's funding clock, which draws the lapse and the date the money runs out. */
export declare const BUDGET_FUNDING: string;
/**
 * Every live matter a family raises a case for, in family order.
 *
 * Computed once per campaign for the same reason the Desk's rows are: a
 * campaign is immutable, and six surfaces read this on one render.
 */
export declare function familySources(campaign: Campaign): readonly FamilySource[];
