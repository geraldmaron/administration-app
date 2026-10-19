import type { CourtLimitedReliefEffect, OrderRemedyEffect } from "./effect-types.js";
import type { Campaign } from "./state.js";
/** Party relief only withholds the named supplier share of this order's recorded movement. */
export declare function applyCourtLimitedRelief(state: Campaign, effect: CourtLimitedReliefEffect): Campaign;
/** The contribution is debited at most once, even if an effect packet is replayed after other changes. */
export declare function applyOrderRemedy(state: Campaign, effect: OrderRemedyEffect): Campaign;
