import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { RungLevel } from "./instrument-ids.js";
/** Operational exposure is a separate seeded outcome from mission success. */
export declare function covertSuccessExposureChance(campaign: Campaign, target: NationId): number;
export declare function covertSuccessExposed(campaign: Campaign, actor: NationId, target: NationId, rung: RungLevel): boolean;
