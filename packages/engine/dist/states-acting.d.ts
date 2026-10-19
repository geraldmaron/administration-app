import type { StateId } from "@admin/world";
import type { Campaign } from "./state.js";
export type StatehouseStance = "partner" | "arms-length" | "refusing";
/** Below this disposition a governor across the aisle stops cooperating. Planning value. */
export declare const REFUSAL_DISPOSITION = 0.3;
/** At or above this a governor carries the administration's program. Planning value. */
export declare const PARTNER_DISPOSITION = 0.65;
/** What the whole country's statehouses refusing would cost the ticket, before the cap. Planning value. */
export declare const NON_COOPERATION_WEIGHT = 0.03;
/** The most refusing statehouses can cost the count. One point. */
export declare const NON_COOPERATION_CAP = 0.01;
/** How a statehouse stands toward the administration. Undefined where no governor is seated. */
export declare function statehouseStance(campaign: Campaign, state: StateId): StatehouseStance | undefined;
/** The statehouses refusing the administration's programs, in state order. */
export declare function refusingStatehouses(campaign: Campaign): readonly StateId[];
/**
 * What refusing statehouses cost the President's count, as a share of the
 * vote: their share of the country's people, weighted and capped. Zero with
 * none refusing, and never positive: a partner statehouse carries programs
 * whose effects the count already reads, and only a refusal changes how they
 * land.
 */
export declare function nonCooperationShift(campaign: Campaign): number;
