import type { BillText, Campaign } from "./state.js";
import type { LegislationResult } from "./legislation.js";
/** The President may offer an authored narrower text while markup remains open. */
export declare function proposeBillText(campaign: Campaign, id: string): LegislationResult;
/** Conference recommends one of the two passed texts; both chambers still vote again. */
export declare function recommendBillConferenceText(campaign: Campaign, id: string, choice: BillText): LegislationResult;
export declare function proposeHousingText(campaign: Campaign, id: string): LegislationResult;
export declare function recommendHousingConferenceText(campaign: Campaign, id: string, choice: BillText): LegislationResult;
