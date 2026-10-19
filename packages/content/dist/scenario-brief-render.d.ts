import type { Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { ScenarioDef } from "./scenario.js";
/** Render all briefing fields, including snapshots saved before this binding fix. */
export declare function renderScenarioBrief(campaign: Campaign, def: ScenarioDef, counterpart: NationId, place?: import("./scenario-text.js").PlaceTokens): ScenarioDef;
