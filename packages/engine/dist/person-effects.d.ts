import type { Campaign } from "./state.js";
import type { PersonEffect } from "./effect-types.js";
/** The effect fold is the only path that registers a newly drawn fictional judge. */
export declare function applyPerson(state: Campaign, effect: PersonEffect): Campaign;
