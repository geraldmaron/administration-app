import type { Campaign } from "./state.js";
import type { SupremeCalendar } from "./state-judiciary.js";
/** Ordinary merits arguments run in the October term; emergency applications have their own clock. */
export declare function scheduleSupremeArgument(campaign: Campaign): SupremeCalendar;
