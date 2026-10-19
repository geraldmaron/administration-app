import type { PersonId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type DecisionStamp } from "./willingness.js";
/** Office access is a fact, not personal ambition or an inferred biography edge. */
export declare function cabinetAccess(campaign: Campaign, source: PersonId): number;
export type BreakContact = {
    readonly person: PersonId;
    readonly decision: DecisionStamp;
};
/** A past accepted conversation permits an approach, never automatic allegiance. */
export declare function cabinetBreakContacts(campaign: Campaign, source: PersonId): readonly BreakContact[];
/** Four willing direct contacts exhaust the former maximum consequence budget. */
export declare function cabinetBreakSpread(contacts: readonly BreakContact[]): number;
