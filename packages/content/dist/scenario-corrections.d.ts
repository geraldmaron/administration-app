import type { Campaign } from "@admin/engine";
import { type CastScenario } from "./scenario-cast.js";
/** Repair the open port-fire snapshot's pricing, casualty accounting and timed commitment. */
export declare function repairLegacyScenarioPrice(campaign: Campaign, cast: CastScenario): CastScenario;
