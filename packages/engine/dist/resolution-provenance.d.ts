import { type CausalProvenance } from "./causality.js";
import type { Effect } from "./effect-types.js";
import type { ResolutionRequest } from "./resolution.js";
import type { Campaign } from "./state.js";
export declare function actProvenance(campaign: Campaign, request: ResolutionRequest, effects: readonly Effect[], visible: boolean): CausalProvenance;
