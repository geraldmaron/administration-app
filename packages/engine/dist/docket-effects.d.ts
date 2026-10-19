import type { DocketEffect } from "./effect-types.js";
import type { Campaign } from "./state.js";
/** Appends entries whose ids are not already held, and drops the listed ids. */
export declare function applyDocket(state: Campaign, effect: DocketEffect): Campaign;
