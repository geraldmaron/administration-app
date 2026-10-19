import type { Campaign } from "./state.js";
import { type TurnPhases } from "./turn-loop.js";
/** Advances the calendar one day, then the week's work that belongs to that day. */
export declare function advanceOneDay(state: Campaign, phases: TurnPhases): Campaign;
