import type { Campaign } from "./state.js";
/** Prospective authority only. Past commitments, receipts, refusals and votes remain recorded. */
export type ProspectiveOrderAuthority = "operative" | "not-yet-effective" | "suspended" | "ended";
/** An independent judicial limit survives a stay or favorable ruling in another case. */
export declare function isOrderCourtSuspended(campaign: Campaign, recordId: string): boolean;
export declare function prospectiveOrderAuthority(campaign: Campaign, recordId: string): ProspectiveOrderAuthority;
export declare function hasProspectiveOrderAuthority(campaign: Campaign, recordId: string): boolean;
/** A court pause suppresses dealings without lifting the measure or losing its identity. */
export declare function isTradeMeasureEffective(campaign: Campaign, measureId: string): boolean;
