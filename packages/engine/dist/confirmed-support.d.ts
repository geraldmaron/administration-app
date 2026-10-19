import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import type { ResolutionRequest } from "./resolution.js";
/** Only stored, answered requests contribute. A draft cannot self-certify partners. */
export declare function confirmedSupport(campaign: Campaign, request: ResolutionRequest): readonly NationId[];
